
import json
import re
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path.cwd()
DATA = ROOT / "data" / "extracted"
OCR_DIR = DATA / "ocr"
MANIFEST = DATA / "manifests" / (
    "JEE-Main-2026-Question-Paper-B-Tech-"
    "2nd-Apr-Shift-2.json"
)
OUTPUT = DATA / "question-drafts-v3.json"

QUESTION_HEADER = re.compile(
    r"(?im)^\s*Question\s*(?:Number|No\.?)\s*[:#-]?\s*(\d+)\b[^\n]*"
)
SECTION_HEADER = re.compile(
    r"(?im)^\s*(?:Mathematics|Physics|Chemistry)\s+Section\s+[AB]\s*$"
)

if not MANIFEST.exists():
    raise SystemExit(f"Manifest not found: {MANIFEST}")

manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
source_hash = manifest.get("sha256", "")
records = []

def add_record(record_id, kind, text, page_num, page_image, ocr_path, number=None):
    records.append({
        "id": record_id,
        "recordType": kind,
        "exam": "JEE Main",
        "year": 2026,
        "questionNumber": number,
        "questionText": text,
        "options": [],
        "correctAnswer": None,
        "solution": None,
        "source": {
            "pdf": MANIFEST.name,
            "pdfSha256": source_hash or None,
            "page": page_num,
            "ocrFile": str(ocr_path.relative_to(ROOT)),
            "pageImage": page_image,
        },
        "review": {
            "status": "draft" if kind == "ocr_question_candidate" else "needs_classification",
            "questionVerified": False,
            "answerVerified": False,
            "notes": "Experimental extraction. Compare with the original page image.",
        },
    })

for page in manifest.get("pages", []):
    page_num = int(page["page"])
    ocr_path = OCR_DIR / f"page-{page_num:04d}.txt"

    if not ocr_path.exists():
        print(f"SKIP missing OCR: page {page_num}")
        continue

    text = ocr_path.read_text(encoding="utf-8", errors="replace").strip()
    if not text:
        print(f"SKIP empty OCR: page {page_num}")
        continue

    # Split into segments at either a question header or a section header.
    boundary_pattern = re.compile(
        r"(?im)^\s*(?:Question\s*(?:Number|No\.?)\s*[:#-]?\s*\d+\b[^\n]*"
        r"|(?:Mathematics|Physics|Chemistry)\s+Section\s+[AB]\s*)$"
    )
    boundaries = list(boundary_pattern.finditer(text))

    if not boundaries:
        add_record(
            f"jee-main-2026-p{page_num:04d}-unclassified",
            "unclassified_page_text", text, page_num,
            page.get("pageImage"), ocr_path
        )
        continue

    prefix = text[:boundaries[0].start()].strip()
    if prefix:
        add_record(
            f"jee-main-2026-p{page_num:04d}-prefix",
            "page_preamble", prefix, page_num,
            page.get("pageImage"), ocr_path
        )

    question_local_index = 0
    for i, boundary in enumerate(boundaries):
        end = boundaries[i + 1].start() if i + 1 < len(boundaries) else len(text)
        chunk = text[boundary.start():end].strip()
        if not chunk:
            continue

        number_match = QUESTION_HEADER.match(chunk)
        if number_match:
            question_local_index += 1
            number = int(number_match.group(1))
            add_record(
                f"jee-main-2026-p{page_num:04d}-q{number}-c{question_local_index:02d}",
                "ocr_question_candidate", chunk, page_num,
                page.get("pageImage"), ocr_path, number
            )
        else:
            add_record(
                f"jee-main-2026-p{page_num:04d}-section-{i+1:02d}",
                "section_metadata", chunk, page_num,
                page.get("pageImage"), ocr_path
            )

OUTPUT.write_text(
    json.dumps({
        "schemaVersion": 3,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "purpose": "Experimental OCR drafts; unverified and not ready for question-bank import",
        "sourceManifest": str(MANIFEST.relative_to(ROOT)),
        "sourcePdfSha256": source_hash or None,
        "recordCount": len(records),
        "records": records,
    }, ensure_ascii=False, indent=2) + "\n",
    encoding="utf-8",
)

counts = {}
for record in records:
    kind = record["recordType"]
    counts[kind] = counts.get(kind, 0) + 1

print("Created:", OUTPUT)
print("Total records:", len(records))
for kind, count in sorted(counts.items()):
    print(f"{kind}: {count}")
print("All question candidates remain unverified.")
