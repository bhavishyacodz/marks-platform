#!/usr/bin/env python3
"""Build a local, self-contained HTML review page for a JEE PDF import draft.

This report is for human review only. It never verifies answers or publishes questions.
"""
from __future__ import annotations

import argparse
import html
import json
from pathlib import Path


def esc(value: object) -> str:
    return html.escape("" if value is None else str(value))


def build_report(source: Path, output: Path) -> None:
    data = json.loads(source.read_text(encoding="utf-8"))
    questions = data.get("questions", [])
    exam = data.get("exam", {})
    summary = data.get("summary", {})
    cards = []

    for q in questions:
        image_ref = q.get("originalPageImage", "")
        image_path = (source.parent / image_ref).resolve() if image_ref else None
        try:
            safe_image = image_path is not None and image_path.is_relative_to(source.parent.resolve()) and image_path.is_file()
        except (OSError, ValueError):
            safe_image = False
        image_html = (
            f'<a href="{esc(image_ref)}" target="_blank" rel="noopener">'
            f'<img loading="lazy" src="{esc(image_ref)}" alt="Original paper page {esc(q.get("page"))}"></a>'
            if safe_image else '<p class="warning">Original page image missing or unsafe. Stop review until restored.</p>'
        )
        flags = q.get("reviewFlags") or []
        flag_html = "".join(f"<li>{esc(flag)}</li>" for flag in flags) or "<li>No automatic flags; visual review is still required.</li>"
        candidate = q.get("answerKeyCandidateOptionId")
        candidate_text = esc(candidate) if candidate is not None else "No unique candidate"
        recovery = q.get("geminiRecovery") or {}
        recovery_text = recovery.get("text")
        recovery_html = (
            f'<h3>Gemini image transcription — UNVERIFIED</h3><p class="notice">Model: {esc(recovery.get("model"))}. Compare every symbol and option against the source image; never treat this as verified text.</p><pre>{esc(recovery_text)}</pre>'
            if recovery_text else
            f'<h3>Gemini image transcription</h3><p class="warning">{esc(recovery.get("error") or "Not attempted (GEMINI_API_KEY may be missing, or this question did not trigger recovery).")}</p>'
        )
        review_status = "flagged" if flags else "review"
        ocr_status = "OCR used for page" if q.get("ocrUsedForPage") else "native text preferred"
        cards.append(f"""
<section class="question" data-review="{review_status}" data-key="{esc(q.get('answerKeyMatchStatus', 'missing'))}">
  <p class="statusline"><strong>HUMAN REVIEW REQUIRED</strong> · {esc(q.get("questionType") or "type unknown")} · {esc(ocr_status)}</p>
  <div class="heading"><h2>Question {esc(q.get('questionNumber'))}</h2>
    <span>Question ID: {esc(q.get('questionId') or 'not extracted')}</span>
    <span>Paper page: {esc(q.get('page'))}</span></div>
  <div class="grid">
    <div><h3>Original source page</h3>{image_html}</div>
    <div><h3>Extracted text (OCR may be wrong)</h3>
      <pre>{esc(q.get('rawText', ''))}</pre>
      {recovery_html}
      <h3>Answer-key candidate — NOT VERIFIED</h3>
      <p>{candidate_text} · {esc(q.get('answerKeyMatchStatus', 'status missing'))}</p>
      <h3>Review flags</h3><ul>{flag_html}</ul>
    </div>
  </div>
</section>""")

    page = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>JEE import review — {esc(exam.get('label', source.stem))}</title>
<style>
:root{{color-scheme:light}}body{{font:16px/1.5 system-ui,sans-serif;margin:0;background:#f4f6fa;color:#182033}}
header{{padding:22px; background:#fff;border-bottom:1px solid #d9dfeb}}main{{max-width:1100px;margin:auto;padding:16px}}
.controls{{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}}button{{padding:10px 14px;border:1px solid #aab5c8;border-radius:8px;background:#fff;color:#182033;font-weight:650}}button[aria-pressed="true"]{{background:#182033;color:#fff}}.statusline{{margin:0 0 10px;padding:8px 10px;background:#fff4df;border-radius:6px;color:#704000}}
.question{{background:#fff;border:1px solid #d9dfeb;border-radius:12px;padding:16px;margin:16px 0}}
.heading{{display:flex;flex-wrap:wrap;gap:12px;align-items:center}}h1{{font-size:1.35rem}}h2{{font-size:1.15rem;margin:0}}h3{{font-size:1rem}}
.grid{{display:grid;grid-template-columns:1fr 1fr;gap:18px}}img{{width:100%;height:auto;border:1px solid #ddd}}pre{{white-space:pre-wrap;overflow-wrap:anywhere;background:#f7f8fb;padding:12px;border-radius:8px;max-height:560px;overflow:auto}}
.warning{{color:#9b2424;font-weight:700}}.notice{{padding:12px;border-left:4px solid #bd6b00;background:#fff4df}}
@media(max-width:700px){{.grid{{grid-template-columns:1fr}}}}
</style></head><body>
<header><h1>JEE PDF import review</h1>
<p><b>Review only — no question or answer is verified by this report.</b></p>
<p>Exam: {esc(exam.get('label', source.stem))} · Status: {esc(data.get('status'))}</p>
<p>Candidates: {esc(summary.get('questionCandidates', len(questions)))} · Flagged: {esc(summary.get('questionCandidatesFlaggedForReview'))} · Key ID matches: {esc(summary.get('questionIdMatchedCandidates'))} · Unmatched IDs: {esc(summary.get('unmatchedQuestionIds'))}</p>
<div class="controls" aria-label="Filter questions"><button type="button" data-filter="all" aria-pressed="true">All questions</button><button type="button" data-filter="flagged" aria-pressed="false">Flagged</button><button type="button" data-filter="failed" aria-pressed="false">Transcription failed</button><button type="button" data-filter="matched" aria-pressed="false">Key ID matched</button></div>
<p class="notice">Compare every extracted stem and option with the original page. Confirm the correct subject and row in the official final key. A matching ID is only a candidate, not proof of the answer. Check diagrams and mathematical notation visually.</p></header>
<main>{''.join(cards) if cards else '<p>No question candidates were extracted.</p>'}</main>
<script>
const cards=[...document.querySelectorAll(".question")];
const buttons=[...document.querySelectorAll("[data-filter]")];
function applyFilter(filter){for(const card of cards){const text=card.innerText.toLowerCase();const key=card.dataset.key.toLowerCase();const failed=text.includes("transcription")&&(text.includes("failed")||text.includes("not attempted"));const show=filter==="all"||(filter==="flagged"&&card.dataset.review==="flagged")||(filter==="failed"&&failed)||(filter==="matched"&&(key.includes("match")&&!key.includes("unmatched")));card.hidden=!show;}for(const button of buttons)button.setAttribute("aria-pressed",String(button.dataset.filter===filter));}
for(const button of buttons)button.addEventListener("click",()=>applyFilter(button.dataset.filter));
</script>
</body></html>"""
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(page, encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path, help="Review draft JSON")
    parser.add_argument("--output", required=True, type=Path, help="Output HTML report")
    args = parser.parse_args()
    if not args.input.is_file():
        parser.error(f"input draft not found: {args.input}")
    build_report(args.input, args.output)
    print(f"Created human-review report: {args.output}")
    print("Report is review-only; it does not mark any question or answer verified.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
