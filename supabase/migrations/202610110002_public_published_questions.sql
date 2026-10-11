-- Public learners may read published questions only.
-- The questions table should already have RLS enabled and admin-only write policies.
drop policy if exists "Anyone can read published questions" on public.questions;

create policy "Anyone can read published questions"
on public.questions
for select
to anon, authenticated
using (publication_status = 'published');
