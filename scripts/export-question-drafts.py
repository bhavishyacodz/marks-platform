
import csv
import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path.cwd()
DATA = ROOT / "data" / "extracted"

MANIFEST = DATA / "manifests" / (
    "JEE-Main-2026-Question-Paper-B-Tech-"
    "2nd-Apr-Shift-2.json"
)
OCR_DIR = DATA / "ocr"
OUTPUT = DATA / "question-drafts.json"

# Optional: copy your downloaded review CSV to this path.
REVIEW_CSV = DATA / "ocr-review-results.csv"

if not MANIFEST.exists():
    raise SystemExit(f"Manifest not found: {MANIFEST}")

manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
source_pdf = manifest.get("sourcePdf", manifest.get("pdf", {}))
source_hash = manifest.get("sha256", "")

# Read review statuses only if the exported CSV has been copied here.
review_status = {}
if REVIEW_CSV.exists():
    with REVIEW_CSV.open(encoding="utf-8-sig", newline="") as f:
        for row in csv.DictReader(f):
            try:
                review_status[int(row["page"])] = row.get("status", "pending")
            except (ValueError, KeyError):
                continue

records = []
page_count = 0
candidate_count = 0

for page in manifest.get("pages", []):
    page_num = int(page["page"])
    page_count += 1
    ocr_path = OCR_DIR / f"page-{page_num:04d}.txt"

    if not ocr_path.exists():
        print(f"SKIP missing OCR: page {page_num}")
        continue

    text = ocr_path.read_text(encoding="utf-8", errors="replace").strip()
    if not text:
        print(f"SKIP empty OCR: page {page_num}")
        continue

    # Split only on recognizable Question Number markers.
    # Do not guess question boundaries if no marker is found.
    matches = list(re.finditer(
        r"(?im)^\s*Question\s+Number\b[^\n]*",
        text
    ))

    chunks = []
    if matches:
        if text[:matches[0].start()].strip():
            chunks.append(text[:matches[0].start()].strip())
        for i, match in enumerate(matches):
            end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
            chunk = text[match.start():end].strip()
            if chunk:
                chunks.append(chunk)
    else:
        chunks.append(text)

    for local_index, chunk in enumerate(chunks, start=1):
        candidate_count += 1
        record_id = f"jee-main-2026-p{page_num:04d}-c{local_index:02d}"

        records.append({
            "id": record_id,
            "recordType": "ocr_question_candidate",
            "exam": "JEE Main",
            "year": 2026,
            "subject": None,
            "topic": None,
            "questionNumber": None,
            "questionText": chunk,
            "options": [],
            "correctAnswer": None,
            "solution": None,
            "source": {
                "pdf": MANIFEST.name,
                "pdfSha256": source_hash or None,
                "page": page_num,
                "ocrFile": str(ocr_path.relative_to(ROOT)),
                "pageImage": page.get("pageImage")
            },
            "review": {
                "status": "draft",
                "pageStatusImported": review_status.get(page_num, "pending"),
                "questionVerified": False,
                "answerVerified": False,
                "notes": (
                    "Candidate text must be checked against the original "
                    "page. Page-level status does not verify this question."
                )
            }
        })

output_data = {
    "schemaVersion": 1,
    "generatedAt": datetime.now(timezone.utc).isoformat(),
    "purpose": "Review-only OCR candidates; not ready for question-bank import",
    "sourceManifest": str(MANIFEST.relative_to(ROOT)),
    "sourcePdfSha256": source_hash or None,
    "pageCountInManifest": page_count,
    "candidateCount": len(records),
    "records": records
}

OUTPUT.write_text(
    json.dumps(output_data, ensure_ascii=False, indent=2) + "\n",
    encoding="utf-8"
)

print("Created:", OUTPUT)
print("Pages in manifest:", page_count)
print("Draft candidates:", len(records))
print("All candidates remain unverified.")
if not REVIEW_CSV.exists():
    print("Note: review CSV not found in project; page statuses default to pending.")
