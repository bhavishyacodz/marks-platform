#!/usr/bin/env python3
"""Extract PDF text and page images into a review manifest. Requires: pip install pymupdf."""
from __future__ import annotations
import argparse, hashlib, json, re
from pathlib import Path
import fitz

def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()

def safe_name(value: str) -> str:
    return re.sub(r"[^A-Za-z0-9._-]+", "-", value).strip("-") or "paper"

def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pdf", type=Path)
    parser.add_argument("--out", type=Path, default=Path("data/extracted"))
    parser.add_argument("--dpi", type=int, default=150)
    args = parser.parse_args()
    if not args.pdf.is_file() or args.pdf.suffix.lower() != ".pdf":
        parser.error("input must be an existing PDF")
    if not 72 <= args.dpi <= 300:
        parser.error("--dpi must be between 72 and 300")
    key = safe_name(args.pdf.stem)
    asset_dir = args.out / "assets" / key
    manifest_dir = args.out / "manifests"
    asset_dir.mkdir(parents=True, exist_ok=True)
    manifest_dir.mkdir(parents=True, exist_ok=True)
    pages = []
    with fitz.open(args.pdf) as pdf:
        for idx, page in enumerate(pdf):
            text = page.get_text("text", sort=True).strip()
            image_name = f"page-{idx + 1:04d}.png"
            page.get_pixmap(dpi=args.dpi, alpha=False).save(asset_dir / image_name)
            blocks = []
            for block in page.get_text("dict", sort=True).get("blocks", []):
                if block.get("type") != 0:
                    continue
                value = "".join(span.get("text", "") for line in block.get("lines", []) for span in line.get("spans", [])).strip()
                if value:
                    blocks.append({"text": value, "bbox": [round(float(v), 2) for v in block.get("bbox", [])]})
            pages.append({
                "page": idx + 1, "text": text, "textLength": len(text),
                "needsOcrReview": len(text) < 30,
                "pageImage": f"assets/{key}/{image_name}", "blocks": blocks,
                "reviewStatus": "pending",
                "notes": "Check question boundaries, equations, option order and figures against page image."
            })
    manifest = {
        "schemaVersion": 1, "paper": args.pdf.name, "paperSha256": sha256(args.pdf),
        "pageCount": len(pages), "extractor": {"name": "PyMuPDF", "dpi": args.dpi},
        "warning": "Extraction only. No question, answer, chapter or verification status is inferred.",
        "pages": pages
    }
    output = manifest_dir / f"{key}.json"
    output.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Extracted {len(pages)} pages to {output}")
    print("Review the page images and text before creating question import records.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
