# MARKS official JEE Main PYQ ingestion workflow

This workflow is for adding past-paper questions without mislabelling original practice questions as official PYQs.

## 1. Find an authoritative source

Prefer an official NTA/JEE Main source:
- https://jeemain.nta.nic.in/
- https://nta.ac.in/

Record the direct HTTPS URL for the paper, answer key, or official notice. Do not treat coaching sites, social posts, memory-based questions, or search snippets as proof of official origin. If an official source cannot be found, do not mark the question verified.

## 2. Check the exact exam details

Before adding a question, independently check and record:
- exam year;
- exact date and shift/session as named by the official source;
- subject, chapter and topic;
- question wording and all options, if MCQ;
- official answer key and any later correction/updated key;
- solution calculation and units, where relevant.

If any detail is uncertain, add it only as an unverified practice item or leave it out until resolved.

## 3. Add the question

Add a unique, stable ID in `src/data/questions.ts`. Keep the chapter and topic labels exactly aligned with `src/data/syllabus.ts`.

For an official question, set:
- `status: "verified"`
- `year` to the actual exam year;
- `shift` to the official date/session description;
- `source` to a concise human-readable source label;
- `sourceUrl` to the direct official NTA/JEE Main HTTPS URL;
- `sourceCheckedAt` to the review date in `YYYY-MM-DD` format;
- `sourceNotes` to a short audit note, e.g. `"Question text checked against official paper; answer checked against final answer key."`

Do not copy placeholder metadata from a demo question. Do not infer the shift or year from a repost.

## 4. Run quality checks

Run locally:

```bash
npm run validate
npm run build
```

The question validator requires a verified question to have a year, non-demo shift, official-host source URL, review date and audit note. The syllabus validator checks its chapter/topic references. These checks validate metadata shape and references; they do not independently prove that the question text or answer is correct. A human must complete the source audit.

## 5. Keep an audit trail

When an official answer key changes, revisit the affected question, update the answer and source notes, and record a new `sourceCheckedAt` date. Never remove uncertainty by simply changing the status flag.

## Current starter bank

The current starter questions are original practice questions and should remain `unverified`. No official PYQ is included until a specific official paper and answer key have been checked.
