# MARKS hybrid PDF ingestion

## Goal

Preserve original JEE Main source pages while making questions readable as text and LaTeX when safe. Extraction output is a review artifact, not proof that a question is authentic or correct.

## First stage

The script `scripts/extract-pdf.py` uses PyMuPDF to create:
- A JSON manifest with the PDF SHA-256, page count, extracted text and text-block bounding boxes.
- A full-page PNG for every page.
- A review flag for pages with almost no extractable text, which may need OCR.

Install and run locally:

```bash
python -m pip install pymupdf
python scripts/extract-pdf.py data/source-papers/your-paper.pdf
```

Output is written under `data/extracted/`. This is local staging output and should not be committed by default: page images can be large and paper reuse rights must be checked.

## Why this is conservative

- PDF extraction can scramble columns, mathematical symbols and reading order.
- OCR is a fallback for image-only pages, not a source of truth for equations.
- Question boundaries, option ordering, diagrams and answer keys must be checked against the original page.
- Never synthesize a missing diagram; preserve the original page or crop.
- The extractor does not create verified records or modify `src/data/questions.ts`.

## Hybrid question representation

The eventual UI should represent each question as ordered blocks: ordinary text, validated LaTeX, and original image crops. Keep an original page reference as a fallback. Render text and equations only when reviewed; otherwise show the original crop/page first. Always provide a way to inspect the source image.

## Review lifecycle

`extracted -> needs-review -> approved-for-import -> verified`

- Extracted means machine output only.
- Needs review means wording, equations, options and figures must be checked.
- Approved for import means structure and source mapping were reviewed.
- Verified means the official paper identity and answer were independently checked under existing validation rules.

Schema validation alone does not verify content.

## Next stages

1. Add OCR only for pages flagged for review, preserving OCR output separately.
2. Build question-region detection and crop creation after testing a full sample paper.
3. Add an import adapter requiring explicit page/crop references.
4. Integrate a text/LaTeX/image renderer in the practice UI.
5. Add CI for structural validation only; never auto-approve extracted questions.

Check applicable source terms and permissions before redistributing extracted question text or page images publicly.
