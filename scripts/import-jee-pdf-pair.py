#!/usr/bin/env python3
"""Create a reviewable JEE Main import draft from official paper and final-key PDFs.

Requires: pip install pymupdf
This tool NEVER marks extracted content as verified. OCR/layout and answer mapping
must be checked against the original PDFs before records enter src/data/questions.ts.
"""
from __future__ import annotations
import argparse, hashlib, json, re
from pathlib import Path
import fitz

QUESTION_MARKER = re.compile(r"Question\s*(?:Number\s*:\s*|No\.?\s*:?\s*)(\d+)", re.I)
QUESTION_ID = re.compile(r"Question\s*Id\s*:\s*(\d+)", re.I)
EXAM_DATE = re.compile(r"Exam\s*Date\s*:\s*([0-9.\-/]+)", re.I)
EXAM_SHIFT = re.compile(r"Exam\s*Shift\s*:\s*(First|Second|Third|1st|2nd|3rd|\d+)", re.I)
KEY_ROW = re.compile(r"(?<!\d)(\d{7,})(?:\s+|\s*[,|]\s*)(\d{7,})(?!\d)")

def read_pdf(path: Path) -> list[dict]:
    with fitz.open(path) as pdf:
        return [{"page": i + 1, "text": p.get_text("text", sort=True).strip()} for i, p in enumerate(pdf)]

def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()

def parse_questions(pages: list[dict]) -> list[dict]:
    found = []
    current = None
    for page in pages:
        text = page["text"]
        # Many NTA papers have question number and ID on the same line, but not all.
        markers = list(QUESTION_MARKER.finditer(text))
        for i, marker in enumerate(markers):
            start = marker.start()
            end = markers[i + 1].start() if i + 1 < len(markers) else len(text)
            chunk = text[start:end].strip()
            id_match = QUESTION_ID.search(chunk)
            found.append({
                "questionNumber": int(marker.group(1)),
                "questionId": id_match.group(1) if id_match else None,
                "page": page["page"],
                "rawText": chunk,
                "needsHumanReview": True,
                "reviewFlags": (["question_id_not_found"] if not id_match else []) +
                               (["short_or_suspicious_extraction"] if len(chunk) < 80 else []),
            })
    # De-duplicate false repeated markers while preserving distinct page/question IDs.
    seen, result = set(), []
    for item in found:
        key = (item["questionNumber"], item["questionId"], item["page"])
        if key not in seen:
            seen.add(key)
            result.append(item)
    return result

def parse_key(pages: list[dict]) -> dict:
    text = "\n".join(p["text"] for p in pages)
    date = EXAM_DATE.search(text)
    shift = EXAM_SHIFT.search(text)
    # Keep every ID pair as a candidate only; subject boundaries/layout need review.
    pairs = []
    for line in text.splitlines():
        m = KEY_ROW.search(line)
        if m:
            pairs.append({"questionId": m.group(1), "correctOptionId": m.group(2), "rawLine": line.strip(), "needsHumanReview": True})
    # PDFs sometimes put ID and option ID on separate lines; do not guess those mappings.
    return {
        "examDate": date.group(1) if date else None,
        "examShift": shift.group(1) if shift else None,
        "candidatePairs": pairs,
        "warning": "Candidate pairs only. Confirm subject section, row alignment and all IDs against the official final key.",
    }

def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--paper", required=True, type=Path, help="Official question paper PDF")
    parser.add_argument("--key", required=True, type=Path, help="Matching official final answer key PDF")
    parser.add_argument("--out", type=Path, default=Path("data/import/review-drafts"))
    parser.add_argument("--label", default=None, help="Readable shift label, e.g. 2-Apr-2026-Shift-2")
    args = parser.parse_args()
    for path in (args.paper, args.key):
        if not path.is_file() or path.suffix.lower() != ".pdf":
            parser.error(f"expected an existing PDF: {path}")
    paper_pages, key_pages = read_pdf(args.paper), read_pdf(args.key)
    questions = parse_questions(paper_pages)
    key = parse_key(key_pages)
    label = args.label or args.paper.stem
    args.out.mkdir(parents=True, exist_ok=True)
    output = args.out / (re.sub(r"[^A-Za-z0-9._-]+", "-", label).strip("-") + ".json")
    payload = {
        "schemaVersion": 1,
        "status": "needs-human-review",
        "exam": {"label": label, "dateFromKey": key["examDate"], "shiftFromKey": key["examShift"]},
        "sources": {
            "paper": {"filename": args.paper.name, "sha256": sha256(args.paper), "pageCount": len(paper_pages)},
            "finalAnswerKey": {"filename": args.key.name, "sha256": sha256(args.key), "pageCount": len(key_pages)},
        },
        "summary": {"questionCandidates": len(questions), "keyCandidatePairs": len(key["candidatePairs"])},
        "questions": questions,
        "answerKey": key,
        "warnings": [
            "This is a draft extraction, not a publishable question bank.",
            "Do not infer option text, diagrams, chapter/topic or answer from IDs alone.",
            "Check every question and all four options against page images; verify answers against the matching final key.",
            "Scanned pages may require OCR. Extraction errors are expected.",
        ],
    }
    output.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Created {len(questions)} question candidates and {len(key['candidatePairs'])} answer-key row candidates.")
    print(f"Review draft: {output}")
    print("Nothing was published or marked verified.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
