
import hashlib
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
OUTPUT = DATA / "question-drafts-v2.json"

if not MANIFEST.exists():
    raise SystemExit(f"Manifest not found: {MANIFEST}")

manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
source_hash = manifest.get("sha256", "")

# Recognize question-number headers even when OCR adds
# spacing or punctuation variations.
HEADER = re.compile(
    r"(?im)^\s*Question\s*(?:Number|No\.?)\s*[:#-]?\s*\d+\b[^\n]*"
)

records = []
page_count = 0

for page in manifest.get("pages", []):
    page_num = int(page["page"])
    page_count += 1
    ocr_path = OCR_DIR / f"page-{page_num:04d}.txt"

    if not ocr_path.exists():
        print(f"SKIP missing OCR: page {page_num}")
        continue

    text = ocr_path.read_text(
        encoding="utf-8", errors="replace"
    ).strip()

    if not text:
        print(f"SKIP empty OCR: page {page_num}")
        continue

    matches = list(HEADER.finditer(text))
    chunks = []

    if matches:
        # Preserve pre-question text separately for diagnostics,
        # but never label it as a question.
        prefix = text[:matches[0].start()].strip()
        if prefix:
            records.append({
                "id": f"jee-main-2026-p{page_num:04d}-prefix",
                "recordType": "page_preamble",
                "questionText": prefix,
                "source": {
                    "pdf": MANIFEST.name,
                    "pdfSha256": source_hash or None,
                    "page": page_num,
                    "ocrFile": str(ocr_path.relative_to(ROOT)),
                    "pageImage": page.get("pageImage"),
                },
                "review": {
                    "status": "needs_classification",
                    "questionVerified": False,
                    "answerVerified": False,
                    "notes": "Page preamble; not automatically treated as a question.",
                },
            })

        for i, match in enumerate(matches):
            end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
            chunk = text[match.start():end].strip()
            if not chunk:
                continue

            # Extract the question number only when the header
            # contains a recognizable integer.
            header = match.group(0)
            number_match = re.search(
                r"(?i)Question\s*(?:Number|No\.?)\s*[:#-]?\s*(\d+)",
                header,
            )
            question_number = (
                int(number_match.group(1)) if number_match else None
            )

            # Repeated headers can appear in OCR noise; retain
            # source page and a local index for unique IDs.
            records.append({
                "id": f"jee-main-2026-p{page_num:04d}-q{question_number or 'x'}-c{i+1:02d}",
                "recordType": "ocr_question_candidate",
                "exam": "JEE Main",
                "year": 2026,
                "subject": None,
                "topic": None,
                "questionNumber": question_number,
                "questionText": chunk,
                "options": [],
                "correctAnswer": None,
                "solution": None,
                "source": {
                    "pdf": MANIFEST.name,
                    "pdfSha256": source_hash or None,
                    "page": page_num,
                    "ocrFile": str(ocr_path.relative_to(ROOT)),
                    "pageImage": page.get("pageImage"),
                },
                "review": {
                    "status": "draft",
                    "questionVerified": False,
                    "answerVerified": False,
                    "notes": "Verify question boundaries, formulas and options against the source image.",
                },
            })
    else:
        # No reliable boundary found: keep the page as an
        # unclassified OCR block rather than pretending it is a question.
        records.append({
            "id": f"jee-main-2026-p{page_num:04d}-unclassified",
            "recordType": "unclassified_page_text",
            "questionText": text,
            "source": {
                "pdf": MANIFEST.name,
                "pdfSha256": source_hash or None,
                "page": page_num,
                "ocrFile": str(ocr_path.relative_to(ROOT)),
                "pageImage": page.get("pageImage"),
            },
            "review": {
                "status": "needs_classification",
                "questionVerified": False,
                "answerVerified": False,
                "notes": "No recognizable question header; inspect the original page.",
            },
        })

OUTPUT.write_text(
    json.dumps({
        "schemaVersion": 2,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "purpose": "Experimental OCR extraction; unverified and not for question-bank import",
        "sourceManifest": str(MANIFEST.relative_to(ROOT)),
        "sourcePdfSha256": source_hash or None,
        "pageCountInManifest": page_count,
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
print("Pages processed:", page_count)
print("Total records:", len(records))
for kind, count in sorted(counts.items()):
    print(f"{kind}: {count}")
print("All records remain unverified.")
