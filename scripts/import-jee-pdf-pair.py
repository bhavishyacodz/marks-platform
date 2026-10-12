#!/usr/bin/env python3
"""Create a review-only JEE Main draft from question-paper and final-key PDFs.

Requires PyMuPDF and Tesseract OCR. OCR improves text recovery but cannot reliably
interpret equations, diagrams, option order, or answer mapping. Nothing is verified
or published by this script.
"""
from __future__ import annotations
import argparse, hashlib, json, re
from pathlib import Path
import fitz

QUESTION_MARKER = re.compile(r"Question\s*(?:Number\s*:\s*|No\.?\s*:?\s*)(\d+)", re.I)
QUESTION_ID = re.compile(r"Question\s*Id\s*:\s*(\d+)", re.I)
QUESTION_TYPE = re.compile(r"Question\s*Type\s*:\s*(MCQ|SA)\b", re.I)
EXAM_DATE = re.compile(r"Exam\s*Date\s*:\s*([0-9.\-/]+)", re.I)
EXAM_SHIFT = re.compile(r"Exam\s*Shift\s*:\s*(First|Second|Third|1st|2nd|3rd|\d+)", re.I)
KEY_ROW = re.compile(r"(?<!\d)(\d{7,})(?:\s+|\s*[,|]\s*)(\d{7,})(?!\d)")

def read_pdf(path: Path) -> list[dict]:
    pages_out = []
    with fitz.open(path) as pdf:
        for i, page in enumerate(pdf):
            text = page.get_text("text", sort=True).strip()
            ocr_text = ""
            # Some NTA-style PDFs contain selectable IDs but rasterized question bodies.
            # OCR only sparse pages to avoid unnecessary runtime on ordinary text PDFs.
            if len(text) < 900 or len(QUESTION_MARKER.findall(text)) == 0:
                try:
                    ocr_text = page.get_textpage_ocr(language="eng", dpi=220, full=True).extractText().strip()
                except Exception as exc:
                    ocr_text = ""
                    ocr_error = f"{type(exc).__name__}: {exc}"
                else:
                    ocr_error = None
            else:
                ocr_error = None
            chosen = ocr_text if len(ocr_text) > len(text) * 1.15 else text
            pages_out.append({
                "page": i + 1,
                "text": chosen,
                "nativeText": text,
                "ocrUsed": bool(ocr_text and chosen == ocr_text),
                **({"ocrError": ocr_error} if ocr_error else {}),
            })
    return pages_out

def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()

def parse_questions(pages: list[dict]) -> list[dict]:
    found = []
    for page in pages:
        text = page["text"]
        markers = list(QUESTION_MARKER.finditer(text))
        for i, marker in enumerate(markers):
            start = marker.start()
            end = markers[i + 1].start() if i + 1 < len(markers) else len(text)
            chunk = text[start:end].strip()
            id_match = QUESTION_ID.search(chunk)
            type_match = QUESTION_TYPE.search(chunk)
            question_type = type_match.group(1).upper() if type_match else None
            flags = []
            if not id_match:
                flags.append("question_id_not_found")
            # Keep this conservative: IDs and option IDs alone are not a question body.
            if len(chunk) < 180 or not re.search(r"\b(?:is|are|find|calculate|determine|which|what|value|given|equal|shown|consider|following)\b", chunk, re.I):
                flags.append("question_body_may_be_missing_or_ocr_incomplete")
            # SA (numerical-answer) questions intentionally have no MCQ options.
            # Only flag missing options when the source identifies the item as MCQ.
            if question_type == "MCQ" and not re.search(r"Options?\s*:", chunk, re.I):
                flags.append("options_not_detected")
            elif question_type is None:
                flags.append("question_type_not_detected")
            found.append({
                "questionNumber": int(marker.group(1)),
                "questionId": id_match.group(1) if id_match else None,
                "questionType": question_type,
                "page": page["page"],
                "rawText": chunk,
                "ocrUsedForPage": page.get("ocrUsed", False),
                "needsHumanReview": True,
                "reviewFlags": flags,
            })
    seen, result = set(), []
    for item in found:
        key = (item["questionNumber"], item["questionId"], item["page"])
        if key not in seen:
            seen.add(key)
            result.append(item)
    return result

def canonical_date(value: str | None) -> str | None:
    if not value:
        return None
    value = value.strip()
    # Accept both ISO labels (YYYY-MM-DD) and dates printed in NTA PDFs (DD.MM.YYYY).
    iso = re.fullmatch(r"(\d{4})-(\d{2})-(\d{2})", value)
    if iso:
        return f"{iso.group(1)}-{iso.group(2)}-{iso.group(3)}"
    printed = re.fullmatch(r"(\d{2})[.\-/](\d{2})[.\-/](\d{4})", value)
    if printed:
        return f"{printed.group(3)}-{printed.group(2)}-{printed.group(1)}"
    return None

def canonical_shift(value: str | None) -> str | None:
    if not value:
        return None
    value = value.strip().lower()
    return {"first": "1", "1st": "1", "second": "2", "2nd": "2", "third": "3", "3rd": "3", "1": "1", "2": "2", "3": "3"}.get(value)

def parse_key(pages: list[dict], expected_date: str | None, expected_shift: str | None) -> dict:
    # Never combine the whole PDF: it contains multiple dates/shifts and locations.
    target_date = canonical_date(expected_date)
    target_shift = canonical_shift(expected_shift)
    records = []
    for page in pages:
        # Prefer selectable PDF text for metadata. OCR can distort dates and shift labels,
        # and read_pdf intentionally retains nativeText for exactly this reason.
        text = page.get("nativeText") or page["text"]
        date = EXAM_DATE.search(text)
        shift = EXAM_SHIFT.search(text)
        page_date = canonical_date(date.group(1)) if date else None
        page_shift = canonical_shift(shift.group(1)) if shift else None
        records.append((page, text, page_date, page_shift))
    matching = [r for r in records if target_date and target_shift and r[2] == target_date and r[3] == target_shift]
    selected = next((r for r in matching if re.search(r"centers? in india|centres? in india|india", r[1], re.I)), matching[0] if matching else None)
    pairs = []
    if selected:
        for line in selected[1].splitlines():
            # Several question/answer ID pairs can share one PDF text line.
            # Capture every pair; keep all candidates review-only.
            for m in KEY_ROW.finditer(line):
                pairs.append({"questionId": m.group(1), "correctOptionId": m.group(2), "rawLine": line.strip(), "needsHumanReview": True})
    return {
        "examDate": selected[2] if selected else None,
        "examShift": selected[3] if selected else None,
        "selectedPage": selected[0]["page"] if selected else None,
        "matchingPagesFound": len(matching),
        "candidatePairs": pairs,
        "warning": "Review-only candidates from one matching metadata page. Confirm subject, row alignment, IDs and numerical answers against the official final key. No answers are verified.",
    }
def normalize_date(value: str | None) -> str | None:
    if not value:
        return None
    m = re.fullmatch(r"(\d{4})-(\d{2})-(\d{2})-shift-\d+", value, re.I)
    if m:
        # Return ISO format to match canonical_date() and compare metadata consistently.
        return f"{m.group(1)}-{m.group(2)}-{m.group(3)}"
    return None

def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--paper", required=True, type=Path, help="Question paper PDF")
    parser.add_argument("--key", required=True, type=Path, help="Matching official final answer key PDF")
    parser.add_argument("--out", type=Path, default=Path("data/import/review-drafts"))
    parser.add_argument("--label", default=None, help="Readable shift label, e.g. 2026-04-02-shift-2")
    args = parser.parse_args()
    for path in (args.paper, args.key):
        if not path.is_file() or path.suffix.lower() != ".pdf":
            parser.error(f"expected an existing PDF: {path}")
    paper_pages, key_pages = read_pdf(args.paper), read_pdf(args.key)
    label = args.label or args.paper.stem
    expected_date = normalize_date(label)
    shift_match = re.search(r"shift-(\d+)", label, re.I)
    expected_shift = shift_match.group(1) if shift_match else None
    questions, key = parse_questions(paper_pages), parse_key(key_pages, expected_date, expected_shift)
    warnings = [
        "This is a draft extraction, not a publishable question bank.",
        "Do not infer option text, diagrams, chapter/topic or answer from IDs alone.",
        "Check every question and all four options against page images; verify answers against the matching final key.",
        "OCR is a best-effort text aid; equations, diagrams, superscripts, subscripts and option order require visual review.",
    ]
    mismatch = (not expected_date or not expected_shift or not key["examDate"] or not key["examShift"] or expected_date != key["examDate"] or expected_shift != key["examShift"])
    if mismatch:
        warnings.insert(0, f"BLOCKING SOURCE MISMATCH: label expects {expected_date}, but key extraction reports {key['examDate']}. Do not use these answer-key candidates.")
    if not key["examDate"] or not key["examShift"]:
        warnings.insert(0, "SOURCE METADATA INCOMPLETE: could not confidently extract both date and shift from the key.")
    ocr_errors = sum(bool(p.get("ocrError")) for p in paper_pages + key_pages)
    if ocr_errors:
        warnings.append(f"OCR failed on {ocr_errors} page(s); inspect those pages manually.")
    suspicious = sum(bool(q["reviewFlags"]) for q in questions)
    args.out.mkdir(parents=True, exist_ok=True)
    output = args.out / (re.sub(r"[^A-Za-z0-9._-]+", "-", label).strip("-") + ".json")
    payload = {
        "schemaVersion": 2,
        "status": "blocked-source-mismatch" if mismatch else "needs-human-review",
        "exam": {"label": label, "expectedDateFromLabel": expected_date, "dateFromKey": key["examDate"], "shiftFromKey": key["examShift"]},
        "sources": {
            "paper": {"filename": args.paper.name, "sha256": sha256(args.paper), "pageCount": len(paper_pages), "ocrPages": sum(bool(p.get("ocrUsed")) for p in paper_pages)},
            "finalAnswerKey": {"filename": args.key.name, "sha256": sha256(args.key), "pageCount": len(key_pages), "ocrPages": sum(bool(p.get("ocrUsed")) for p in key_pages)},
        },
        "summary": {"questionCandidates": len(questions), "questionCandidatesFlaggedForReview": suspicious, "keyCandidatePairs": len(key["candidatePairs"]), "sourceMismatch": mismatch},
        "questions": questions,
        "answerKey": key,
        "warnings": warnings,
    }
    output.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Created {len(questions)} question candidates; {suspicious} have extraction review flags; {len(key['candidatePairs'])} answer-key row candidates.")
    print(f"OCR pages: paper {payload['sources']['paper']['ocrPages']}/{len(paper_pages)}, key {payload['sources']['finalAnswerKey']['ocrPages']}/{len(key_pages)}.")
    if mismatch:
        print(f"BLOCKED: expected key date {expected_date}; extracted key date {key['examDate']}.")
    print(f"Review draft: {output}")
    print("Nothing was published or marked verified.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
