# PDF text extraction staging

This command extracts the selectable text layer from an official question-paper PDF into a page-by-page JSON file for review. It is the first ingestion stage, not a full automatic question importer.

## Run on the project environment

```bash
npm install
npm run extract:pdf -- ./path/to/question-paper.pdf ./data/import/extracted-pages.json
```

The output records the original filename, page number, extracted text, and an explicit review status for every page. It preserves page boundaries so reviewers can compare text with the original PDF.

## Important limitations

- It does not perform OCR. Pages with no selectable text are marked `no-extractable-text`.
- It does not reliably identify individual questions, choices, diagrams, multi-column layouts, or mathematical notation.
- It does not extract or infer answers from an answer key.
- It does not create live question records, verify source authenticity, or publish content.
- Text and equations must be checked against the original PDF. Keep the original PDF available for diagram/image fallback.

Do not mark a question verified solely because it appears in this output. The next ingestion stages must segment questions, match answer keys, flag uncertain matches, and require human review before importing or publishing.
