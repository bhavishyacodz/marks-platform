# Bulk JEE Main PDF import (review-first)

This pipeline turns an official question-paper PDF and its matching official final answer-key PDF into one review draft. It is intentionally conservative: it does not publish questions and never marks extracted questions as verified.

## Run on Termux

1. Install the PDF parser once:
   `pkg update`
   `pkg install python`
   `python -m pip install --upgrade pip`
   `python -m pip install pymupdf`

   If PyMuPDF fails to build on Android/Termux, do not keep retrying a long native build. Run the same script on GitHub Codespaces or another Python environment with PyMuPDF installed, or send me the error so we can switch the extraction runtime.

2. Put the official paper and its matching official final answer key in `data/source-papers/`. Use the exact matching date and shift for both files.

3. From the repository root, run (adjust filenames to match your actual files):

   ```bash
   python scripts/import-jee-pdf-pair.py \
     --paper "data/source-papers/JEE-Main-2026-Question-Paper-B-Tech-2nd-Apr-Shift-2.pdf" \
     --key "data/source-papers/JEE-Main-2026-Apr-02-Shift-2-Final-Key.pdf" \
     --label "2026-04-02-shift-2"
   ```

4. Open the JSON created under `data/import/review-drafts/`. Check each question's raw text against the original PDF page image. Confirm option order, diagrams, math symbols, subject, chapter, topic and answer against the official final key. Only then convert reviewed records into `src/data/questions.ts` or the approved import flow.

## What is automated / what is not

- Automated: PDF text extraction, question-number/ID candidates, exam date/shift candidates, source SHA-256 fingerprints, and a review JSON file.
- Not safe to automate blindly: question boundaries in every paper layout, OCR for diagrams/equations, subject and chapter classification, option text, and final answer mapping when the key's table layout is ambiguous.
- The generated JSON is review-only. It is not added to the student-facing bank and is not published to Supabase.

## Batch multiple shifts

Run the command once per paper/key pair. Keep each pair matched exactly. Never pair a paper with a key from a different date or shift.
