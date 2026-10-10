# MARKS question import template

## Prepare a batch

1. Copy `data/import/questions.template.json` to `data/import/questions.json`. If no staging file exists yet, `npm run validate:import` automatically checks the template.
2. Replace the example with one or more question objects. Keep valid JSON (double quotes, no trailing commas).
3. Use chapter and topic names exactly as listed in `src/data/syllabus.ts`; the validator checks both.
4. Keep original practice questions `unverified`, with `year: null`; do not invent a year or shift.
5. Set `status: "verified"` only after checking the original official paper and official final answer key. Add the official HTTPS `sourceUrl`, review date `sourceCheckedAt` (YYYY-MM-DD), and explanatory `sourceNotes`.
6. Run the checks below. The import validator checks structure, rejects IDs already in the live question bank, and verifies chapter/topic labels against the syllabus catalogue. It cannot authenticate a source or independently prove an answer.

```bash
npm run validate:import
npm run validate
npm run build
```

You can validate a different staging file by passing its path:

```bash
node scripts/validate-question-import.mjs path/to/batch.json
```

## Field notes

- `id`: unique stable identifier; the validator checks both the batch and `src/data/questions.ts` for duplicates.
- `subject`: `Physics`, `Chemistry`, or `Mathematics`.
- `year`: four-digit year or `null` for original practice.
- `shift`: exact official date/session for PYQs; use `Original practice` for practice material.
- `type`: `mcq` or `numerical`; if omitted, defaults to `mcq`.
- `options`: MCQ option objects with unique IDs; numerical questions use an empty array.
- `answer`: the MCQ option ID or numerical answer as a string.
- `tolerance`: optional non-negative numeric tolerance for numerical answers.
- `difficulty`: `Easy`, `Medium`, or `Hard`.

The staging JSON is not automatically merged into the live question bank. Review each question and manually transfer accepted records to `src/data/questions.ts`; this prevents an unreviewed batch from silently appearing in the app.
