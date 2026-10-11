# Bulk JEE Main PDF import and coverage plan

This migration adds the database foundation for the importer. It does not itself parse PDFs or mark a shift complete.

## What this migration adds

- `exam_papers`: one inventory row per exam year/session/date/shift/subject, with original question-paper and answer-key storage paths, expected question count, and processing status.
- `questions.exam_date`, `exam_session`, `question_number`, `source_paper_id`: provenance fields that keep each question connected to its original paper.
- `admin_question_coverage`: per-paper counts for imported, verified, published, missing prompt/solution, and remaining questions.

## Apply safely

1. Review the migration in GitHub.
2. Run `supabase/migrations/202610110004_exam_paper_inventory.sql` in Supabase SQL Editor only after confirming the current `questions` and `admin_users` tables exist.
3. Verify `public.exam_papers` has RLS enabled and the admin account can read/write its rows.
4. Do not store public URLs for private source PDFs; store private bucket object paths only.
5. Do not set `expected_question_count` from a guess. Fill it only after checking the official paper's question inventory.

## Import contract (next implementation stage)

The importer must create an inventory row first, upload source files into a private bucket, then parse into a staging batch. Each extracted question should retain:

- exam name, year, session, date, shift, subject
- original question number and PDF page number
- prompt, options, answer, solution, diagram/image path
- chapter and topic, assigned from the existing syllabus catalogue
- source paper id, extraction state, answer-key match state, and verification state

Never auto-publish extracted questions. Show a review table with the original page beside the extracted content, and block verification if options/answer mapping are incomplete. For answer keys, preserve the original question number and require a one-to-one mapping; do not assume the paper order equals answer-key order.

## Coverage rules

- `coverage_not_confirmed` means no expected count has been checked against the original source.
- `incomplete` means fewer questions are linked than the checked expected count.
- `count_target_met_check_question_numbers` means counts meet the target, but the importer still needs to compare the set of question numbers. Matching counts alone cannot prove completeness.
- Duplicate question numbers, duplicate content, extraction failures, missing options, missing diagrams, and missing solutions should appear as separate warnings.

A year/session/shift report must include source availability, expected count, imported count, verified count, published count, remaining count, and review warnings. Reports should never claim 100% coverage unless the paper source and question-number set have been checked.
