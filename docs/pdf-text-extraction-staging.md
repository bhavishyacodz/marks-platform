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
