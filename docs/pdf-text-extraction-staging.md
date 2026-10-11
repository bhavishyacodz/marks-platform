# PDF text extraction staging

Run:

```bash
npm install
npm run extract:pdf -- path/to/official-paper.pdf data/import/extracted-pages.json
```

The command uses PDF.js to extract selectable text page by page. Each page is marked for human review. It does not perform OCR, detect question boundaries, match answer keys, verify answers, or publish questions. Compare extracted text with the original PDF, especially equations, diagrams, multi-column layouts, and answer options. Keep original source PDFs and page images as the authoritative reference.

## Generate review-only question drafts

After extracting a paper, run:

```bash
npm run draft:questions -- data/import/extracted-pages.json data/import/question-drafts.json
```

The draft generator segments page text where it finds both `Question Number` and `Question Id` metadata. It preserves the extracted block and page number, records detected option reference IDs, and flags drafts for human review. It does not OCR image content, reconstruct diagrams, determine syllabus topics, match an answer key, or produce verified/import-ready questions. A question spanning page boundaries may be split; always inspect the original PDF before accepting a draft. The output is a separate staging format and must not be fed directly into the live question bank.


## OCR fallback for image-based pages (Android/Termux)

Install the command-line tools on Termux:

```bash
pkg update
pkg install poppler tesseract
pdftoppm -v
tesseract --version
tesseract --list-langs
```

Run OCR on the original PDF. The optional third argument is render DPI (default 200; accepted range 120–400):

```bash
npm run ocr:pdf -- path/to/official-paper.pdf data/import/ocr-pages.json
```

For the April 2, 2026 Shift 2 paper in the Termux Download folder:

```bash
npm run ocr:pdf -- "$HOME/storage/shared/Download/JEE-Main-2026-Question-Paper-B-Tech-2nd-Apr-Shift-2.pdf" data/import/jee-main-2026-apr-02-shift-2-ocr.json
npm run draft:questions -- data/import/jee-main-2026-apr-02-shift-2-ocr.json data/import/jee-main-2026-apr-02-shift-2-ocr-drafts.json
```

OCR renders pages to temporary grayscale PNG images, processes them with Tesseract's English model, writes page-numbered text, and removes temporary images afterward. It does not modify the original PDF. OCR is error-prone with equations, superscripts, subscripts, diagrams, and multi-column options; compare every draft with the original page. These outputs are review-only and must not be added to the live question bank without verification. If Tesseract reports that eng data is missing, inspect tesseract --list-langs and install the available English trained-data package for your Termux setup.
