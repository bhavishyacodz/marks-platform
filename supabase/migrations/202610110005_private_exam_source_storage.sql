-- Private storage for original exam papers and answer keys.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'exam-source-pdfs',
  'exam-source-pdfs',
  false,
  52428800,
  array['application/pdf']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Admins can read exam source PDFs" on storage.objects;
create policy "Admins can read exam source PDFs"
on storage.objects for select to authenticated
using (
  bucket_id = 'exam-source-pdfs'
  and exists (select 1 from public.admin_users a where a.user_id = auth.uid())
);

drop policy if exists "Admins can upload exam source PDFs" on storage.objects;
create policy "Admins can upload exam source PDFs"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'exam-source-pdfs'
  and exists (select 1 from public.admin_users a where a.user_id = auth.uid())
);

drop policy if exists "Admins can update exam source PDFs" on storage.objects;
create policy "Admins can update exam source PDFs"
on storage.objects for update to authenticated
using (
  bucket_id = 'exam-source-pdfs'
  and exists (select 1 from public.admin_users a where a.user_id = auth.uid())
)
with check (
  bucket_id = 'exam-source-pdfs'
  and exists (select 1 from public.admin_users a where a.user_id = auth.uid())
);

drop policy if exists "Admins can delete exam source PDFs" on storage.objects;
create policy "Admins can delete exam source PDFs"
on storage.objects for delete to authenticated
using (
  bucket_id = 'exam-source-pdfs'
  and exists (select 1 from public.admin_users a where a.user_id = auth.uid())
);
