-- Source inventory for complete, auditable JEE Main paper imports.
-- Safe to run more than once. Keep original PDFs in private storage.
alter table public.questions
  add column if not exists exam_date date,
  add column if not exists exam_session text,
  add column if not exists question_number text,
  add column if not exists source_paper_id uuid;

create table if not exists public.exam_papers (
  id uuid primary key default gen_random_uuid(),
  exam_name text not null default 'JEE Main',
  year integer not null,
  exam_session text not null,
  exam_date date not null,
  shift text not null,
  subject text not null check (subject in ('Physics', 'Chemistry', 'Mathematics')),
  source_pdf_path text,
  answer_key_path text,
  expected_question_count integer check (expected_question_count is null or expected_question_count >= 0),
  import_status text not null default 'source_needed'
    check (import_status in ('source_needed', 'uploaded', 'processing', 'needs_review', 'verified', 'failed')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (exam_name, year, exam_session, exam_date, shift, subject)
);

alter table public.questions
  drop constraint if exists questions_source_paper_id_fkey;
alter table public.questions
  add constraint questions_source_paper_id_fkey
  foreign key (source_paper_id) references public.exam_papers(id) on delete set null;

create index if not exists questions_paper_question_number_idx
  on public.questions(source_paper_id, question_number);
create index if not exists questions_exam_filter_idx
  on public.questions(year, exam_session, exam_date, shift, subject);
create index if not exists exam_papers_inventory_idx
  on public.exam_papers(year desc, exam_session, exam_date, shift, subject);

alter table public.exam_papers enable row level security;

drop policy if exists "Admins can manage exam paper inventory" on public.exam_papers;
create policy "Admins can manage exam paper inventory"
on public.exam_papers
for all
to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()))
with check (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

-- Learners do not need to see internal source file paths or import notes.
-- Admin dashboard can query exam_papers directly; this view is intended for admin use.
create or replace view public.admin_question_coverage
with (security_invoker = true)
as
select
  p.id as source_paper_id,
  p.exam_name,
  p.year,
  p.exam_session,
  p.exam_date,
  p.shift,
  p.subject,
  p.expected_question_count,
  p.import_status,
  count(q.id)::integer as imported_count,
  count(q.id) filter (where q.status = 'verified')::integer as verified_count,
  count(q.id) filter (where q.publication_status = 'published')::integer as published_count,
  count(q.id) filter (where q.prompt is null or btrim(q.prompt) = '')::integer as missing_prompt_count,
  count(q.id) filter (where q.solution is null or btrim(q.solution) = '')::integer as missing_solution_count,
  case
    when p.expected_question_count is null then null
    else greatest(p.expected_question_count - count(q.id)::integer, 0)
  end as remaining_count,
  case
    when p.expected_question_count is null then 'coverage_not_confirmed'
    when count(q.id) >= p.expected_question_count then 'count_target_met_check_question_numbers'
    else 'incomplete'
  end as coverage_status
from public.exam_papers p
left join public.questions q on q.source_paper_id = p.id
group by p.id;

comment on table public.exam_papers is
  'Admin inventory of expected JEE Main paper/shift/subject source files. Expected counts must be filled from a checked official paper.';
comment on column public.questions.question_number is
  'Question number as shown in the original exam paper; preserve as text to support formats such as 12 and 12A.';
