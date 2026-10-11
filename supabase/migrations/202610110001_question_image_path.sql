-- MARKS question image support
-- Run once in Supabase SQL Editor. This does not change existing question rows.
alter table public.questions
  add column if not exists image_path text;

comment on column public.questions.image_path is
  'Object path inside the private question-images Supabase Storage bucket; never store a public URL here.';
