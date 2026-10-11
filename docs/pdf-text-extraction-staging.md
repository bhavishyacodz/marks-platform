# PDF text extraction staging

Run:

```bash
npm install
npm run extract:pdf -- path/to/official-paper.pdf data/import/extracted-pages.json
```

The command uses PDF.js to extract selectable text page by page. Each page is marked for human review. It does not perform OCR, detect question boundaries, match answer keys, verify answers, or publish questions. Compare extracted text with the original PDF, especially equations, diagrams, multi-column layouts, and answer options. Keep original source PDFs and page images as the authoritative reference.
