# Deployment

1. Create a Supabase project and run `supabase db push`, then `supabase db reset` for demo environments.
2. Create Storage buckets for imports/documents/assets; keep them private and use signed URLs.
3. Add Supabase URL/anon key and server-side service role to Vercel.
4. Optionally add `OPENAI_API_KEY`, `OPENAI_MODEL=gpt-5.6`, `BUFFER_API_KEY` and Buffer organisation ID.
5. Deploy to Vercel, then verify `/api/health`, role login, imports, AVO, approval, Demo/Buffer schedule and audit export.

Missing credentials do not block demo operation. Before production: create auth users matching the demo roles, configure custom SMTP, rotate secrets, set deployment region/retention, run two-tenant RLS tests and enable monitoring. Smoke check: health 200; synthetic label visible; AVO fallback labelled; unapproved publishing rejected; withdrawn consent blocked; build and tests green.
