# Source PDF upload workflow

## What this adds
- An admin-only page at `/admin/papers/upload` for registering a JEE Main year/session/date/shift/subject.
- Uploads the question-paper PDF and answer-key PDF into a private Supabase Storage bucket named `exam-source-pdfs`.
- Saves their storage paths and optional expected question count in `public.exam_papers`.
- Uses the inventory uniqueness key to update the same paper record rather than create duplicates.

## Required setup
1. Apply `supabase/migrations/202610110005_private_exam_source_storage.sql` in the Supabase SQL Editor after the inventory migration `202610110004_exam_paper_inventory.sql`.
2. Confirm the signed-in admin's user ID exists in `public.admin_users`.
3. Open `/admin/papers/upload` after deployment.

## Deliberate safety limits
- PDFs are private; there is no public bucket URL.
- Both files must be PDFs and no larger than 50 MB each.
- Expected counts are optional. Only enter a count checked against the official paper.
- Uploading marks a source as `uploaded`; it does not parse questions, match answers, verify correctness, or publish anything. The extraction/review pipeline is a separate next step.
- The page does not store the PDF binary in the Git repository.
