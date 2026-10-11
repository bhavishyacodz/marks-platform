-- Allow learners to create short-lived signed URLs only for images attached to published questions.
-- Keep question-images private. Object paths use the question ID as the first folder.
drop policy if exists "Learners can read published question images" on storage.objects;

create policy "Learners can read published question images"
on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'question-images'
  and exists (
    select 1
    from public.questions q
    where q.id::text = (storage.foldername(name))[1]
      and q.publication_status = 'published'
  )
);
