# MARKS admin question manager setup

The admin manager is available at `/admin/questions` on this branch. It is not active on the production site until this branch is reviewed, merged, and deployed.

## 1. Configure Vercel

In Vercel → project → Settings → Environment Variables, add these for Preview first:

- `NEXT_PUBLIC_SUPABASE_URL`: the Project URL from Supabase → Project Settings → API.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: the publishable key from the same page.

These are public client values, not secrets. Never put a Supabase secret/service-role key in a `NEXT_PUBLIC_*` variable or browser code. Redeploy the Preview deployment after adding them.

## 2. Configure Supabase Auth

In Supabase → Authentication → URL Configuration, add the Preview deployment origin to the allowed redirect URLs, including `https://YOUR-PREVIEW-HOST/admin/questions`. Replace the example with the real preview hostname.

The page uses email magic-link sign-in. The account can sign in but cannot manage content unless its Supabase Auth user ID is in `public.admin_users`.

## 3. Add the administrator explicitly

1. Open `/admin/questions` on the Preview deployment and request a sign-in link using the email you control.
2. Open the link and return to the page. The page will state that admin access is not enabled.
3. In Supabase → Authentication → Users, copy the UUID for that exact user.
4. In SQL Editor, run the following after replacing the placeholder with that UUID:

```sql
insert into public.admin_users (user_id)
values ('REPLACE-WITH-YOUR-AUTH-USER-UUID')
on conflict (user_id) do nothing;
```

Do not put an email, password, or service-role key in the SQL. Only register accounts you personally authorize. Never expose an admin insertion route to the browser.

## 4. Verify before production

- Confirm the anonymous browser can only read rows whose `publication_status = 'published'`.
- Confirm a signed-in user not listed in `admin_users` cannot insert, edit, or publish.
- Confirm your own allowlisted account can save a draft and publish a test question.
- Confirm the existing static question bank still works. This manager stores questions in Supabase separately; it does not automatically migrate or replace `src/data/questions.ts`.

## Database schema expectation

The table setup should include `public.questions` and `public.admin_users`, Row Level Security enabled on both, a policy for anonymous/authenticated reading of published questions, and admin-only insert/update/delete policies. Use the SQL setup already run in the Supabase project; do not drop or truncate tables to apply this guide.
