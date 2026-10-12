# Bulk JEE Main PDF import (review-first)

This pipeline creates a review draft from a question-paper PDF and an answer-key PDF. It uses native PDF text when useful and attempts OCR on sparse pages with Tesseract. OCR is only a text aid: it can misread math, diagrams, superscripts, option order, and question boundaries.

## Run from GitHub Actions (recommended for phone-only workflow)

1. Open the repository's **Actions** tab.
2. Select **Import JEE PDF pair (review draft)**, then **Run workflow**.
3. Enter the repository paths for the question paper and the matching final answer-key PDF. Set the label to `YYYY-MM-DD-shift-N`.
4. Open the completed run and download the `jee-import-review-draft` artifact.
5. Inspect the JSON and compare every question, option, diagram and answer with the original PDF pages before considering any question for publication.

The workflow installs Tesseract on the GitHub runner and PyMuPDF in Python. It does not require a local PyMuPDF install on Android/Termux.

## Important safety checks

- If the label's date differs from the date detected in the key, the draft is marked `blocked-source-mismatch` and the workflow still produces a draft for inspection. Do not use its answer-key candidates.
- The date/shift extracted from a multi-shift key may only represent the first matching metadata line. Confirm the specific target date and shift visually.
- Candidate ID pairs are not automatically mapped to questions. Match question IDs and option IDs; do not infer answers from row order or IDs alone.
- The JSON remains review-only. This workflow has read-only repository permissions and does not edit `src/data/questions.ts`, publish content, or mark questions verified.

## Local use

Install Tesseract and PyMuPDF in an environment that supports them, then run:

```bash
python scripts/import-jee-pdf-pair.py \
  --paper "data/source-papers/your-question-paper.pdf" \
  --key "data/source-papers/your-matching-final-key.pdf" \
  --label "2026-04-02-shift-2"
```

Output is written under `data/import/review-drafts/`.
