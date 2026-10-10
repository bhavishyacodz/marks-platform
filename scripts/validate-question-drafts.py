
import json
from collections import Counter
from pathlib import Path

path = Path("data/extracted/question-drafts.json")

if not path.exists():
    raise SystemExit(
        "Draft file not found. Run scripts/export-question-drafts.py first."
    )

data = json.loads(path.read_text(encoding="utf-8"))
records = data.get("records", [])
errors = []
warnings = []

ids = [r.get("id") for r in records]
for record_id, count in Counter(ids).items():
    if not record_id or count > 1:
        errors.append(f"Missing or duplicate ID: {record_id}")

for i, r in enumerate(records, start=1):
    label = r.get("id", f"record {i}")
    source = r.get("source", {})
    review = r.get("review", {})

    if not isinstance(source.get("page"), int):
        errors.append(f"{label}: missing source page")
    if not source.get("pdf"):
        errors.append(f"{label}: missing source PDF")
    if not source.get("ocrFile"):
        errors.append(f"{label}: missing OCR file path")
    if not isinstance(r.get("questionText"), str):
        errors.append(f"{label}: questionText must be text")
    elif not r["questionText"].strip():
        warnings.append(f"{label}: empty question text")

    if r.get("correctAnswer") is not None:
        warnings.append(f"{label}: answer is populated; check its evidence")

    if review.get("questionVerified") is True:
        warnings.append(f"{label}: question marked verified; inspect manually")
    if review.get("answerVerified") is True:
        warnings.append(f"{label}: answer marked verified; inspect manually")
    if review.get("status") != "draft":
        warnings.append(f"{label}: record status is not draft")

print("MARKS JEE DRAFT VALIDATION")
print("=" * 32)
print("Records:", len(records))
print("Errors:", len(errors))
print("Warnings:", len(warnings))

for item in errors:
    print("ERROR:", item)
for item in warnings:
    print("WARNING:", item)

if errors:
    raise SystemExit("Validation failed. Fix errors before proceeding.")

print("Structural validation passed.")
print("This does not verify OCR accuracy or answer correctness.")
