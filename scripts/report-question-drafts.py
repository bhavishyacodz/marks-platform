
import json
from collections import Counter
from pathlib import Path

draft_path = Path("data/extracted/question-drafts.json")
manifest_path = Path(
    "data/extracted/manifests/"
    "JEE-Main-2026-Question-Paper-B-Tech-2nd-Apr-Shift-2.json"
)

if not draft_path.exists():
    raise SystemExit("Draft JSON not found. Run the exporter first.")

data = json.loads(draft_path.read_text(encoding="utf-8"))
records = data.get("records", [])

page_counts = Counter()
empty_text = []
missing_images = []
missing_ocr = []

for record in records:
    source = record.get("source", {})
    page = source.get("page")
    question_text = record.get("questionText", "")

    page_counts[page] += 1

    if not isinstance(question_text, str) or not question_text.strip():
        empty_text.append(record.get("id", "unknown"))

    image_path = Path(
        "data/extracted/assets/"
        "JEE-Main-2026-Question-Paper-B-Tech-2nd-Apr-Shift-2"
        f"/page-{page:04d}.png"
    ) if isinstance(page, int) else None

    ocr_path = Path(source.get("ocrFile", ""))

    if image_path is None or not image_path.exists():
        missing_images.append(record.get("id", "unknown"))

    if not ocr_path.exists():
        missing_ocr.append(record.get("id", "unknown"))

print("MARKS JEE SOURCE-LINK REPORT")
print("=" * 32)
print("Total draft candidates:", len(records))
print("Pages represented:", len(page_counts))
print("Candidates with empty text:", len(empty_text))
print("Candidates with missing page images:", len(missing_images))
print("Candidates with missing OCR files:", len(missing_ocr))
print("\nCandidates per source page:")

for page in sorted(page_counts, key=lambda x: (x is None, x or 0)):
    print(f"Page {page}: {page_counts[page]}")

for title, items in [
    ("Empty text", empty_text),
    ("Missing images", missing_images),
    ("Missing OCR", missing_ocr),
]:
    if items:
        print(f"\n{title} IDs:")
        for item in items:
            print("-", item)

print("\nThis report checks source-file presence, not OCR accuracy.")
