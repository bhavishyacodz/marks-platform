import json
from collections import Counter
from pathlib import Path

ROOT = Path.cwd()
DRAFTS = ROOT / "data/extracted/question-drafts-v3.json"

if not DRAFTS.exists():
    raise SystemExit(f"V3 draft file not found: {DRAFTS}")

data = json.loads(DRAFTS.read_text(encoding="utf-8"))
records = data.get("records", [])

errors = []
warnings = []

if data.get("schemaVersion") != 3:
    errors.append("Expected schemaVersion 3")

if data.get("recordCount") != len(records):
    errors.append("recordCount does not match records length")

ids = [r.get("id") for r in records]
counts = Counter(ids)

for record_id, count in counts.items():
    if not record_id or count > 1:
        errors.append(f"Missing or duplicate ID: {record_id}")

allowed_types = {
    "ocr_question_candidate",
    "page_preamble",
    "section_metadata",
    "unclassified_page_text",
}

allowed_statuses = {
    "draft",
    "needs_classification",
    "needs_correction",
    "verified",
}

for r in records:
    label = r.get("id", "(missing ID)")
    kind = r.get("recordType")
    source = r.get("source", {})
    review = r.get("review", {})

    if kind not in allowed_types:
        errors.append(f"{label}: unknown recordType {kind!r}")

    if not isinstance(source.get("page"), int):
        errors.append(f"{label}: source.page must be an integer")

    if not source.get("pdf"):
        errors.append(f"{label}: missing source PDF")

    if not source.get("ocrFile"):
        errors.append(f"{label}: missing OCR file path")

    if not isinstance(r.get("questionText"), str) or not r.get("questionText", "").strip():
        errors.append(f"{label}: missing questionText")

    if review.get("status") not in allowed_statuses:
        errors.append(f"{label}: invalid review status")

    if review.get("questionVerified") is True:
        warnings.append(f"{label}: question marked verified; check evidence")

    if review.get("answerVerified") is True:
        warnings.append(f"{label}: answer marked verified; check evidence")

    if kind == "ocr_question_candidate":
        if review.get("status") != "draft":
            warnings.append(f"{label}: question candidate is not draft")
        if review.get("questionVerified") is not False:
            warnings.append(f"{label}: question verification should remain false")
        if review.get("answerVerified") is not False:
            warnings.append(f"{label}: answer verification should remain false")
    elif review.get("status") != "needs_classification":
        warnings.append(f"{label}: non-question record needs classification")

print("MARKS JEE V3 VALIDATION")
print("=" * 32)
print("Records:", len(records))
print("Record types:", dict(Counter(r.get("recordType") for r in records)))
print("Errors:", len(errors))
print("Warnings:", len(warnings))

for item in errors:
    print("ERROR:", item)

for item in warnings:
    print("WARNING:", item)

if errors:
    raise SystemExit("Validation failed.")

print("Structural validation passed.")
print("This does not verify OCR accuracy or answer correctness.")
