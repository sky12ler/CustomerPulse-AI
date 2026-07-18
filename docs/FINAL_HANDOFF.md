# Final verification and handoff

Verification date: 18 July 2026 (Asia/Kuala Lumpur).

## Completed and exercised

The production-browser suite exercises all 15 routes, demo roles/RBAC, all permanent mock imports, Scenarios A–D, AVO Demo Analysis, evidence-linked recommendations, manager approval, consent blocking, WhatsApp execution, grounded campaign approval, Demo Publisher scheduling, analytics, governance controls, settings and audit export. Unit coverage exercises tier/churn boundaries, import formats, AVO abstention and injection defense, live-provider request construction with an injected transport, approval/policy guardrails, audit events, publisher approval/idempotency, scenarios and required Supabase security structure.

See `P0_ACCEPTANCE.md` for criterion-level evidence.

## Verification commands

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
npm audit
```

`npm run test:e2e` builds and starts the production server itself. The final run passed 8/8 Chromium workflows. The unit suite passed 47/47 tests. The final standalone command results should be retained in the handoff message.

## Required environment

No variable is required for demo mode. Optional live/deployment variables are:

```text
OPENAI_API_KEY              server-only; enables live AVO
OPENAI_MODEL                optional; defaults to gpt-5.6
NEXT_PUBLIC_SUPABASE_URL    Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY   server/reset only; never expose to browser
BUFFER_API_KEY              server-only; enables BufferPublisher
BUFFER_ORGANIZATION_ID      Buffer organization context
NEXT_PUBLIC_APP_URL         public app origin
ENABLE_IMAGE_GENERATION     optional P1 flag; false by default
```

## Database deployment

1. Create a Supabase project and install the Supabase CLI.
2. Link it: `supabase link --project-ref <project-ref>`.
3. Apply `supabase/migrations/202607180001_initial_schema.sql` with `supabase db push`.
4. Set the Supabase variables locally in `.env.local` or the shell.
5. For a disposable local project, `supabase db reset` applies the migration and `supabase/seed.sql`.
6. For a configured project, run `node scripts/reset-demo.mjs --confirm`. This deliberately refuses to run without the flag and required credentials.
7. Create private Storage buckets for imports, documents and campaign assets; use signed URLs.
8. Create two test organizations and execute live cross-tenant RLS tests before production data is admitted.

## Vercel deployment

1. Import the repository into Vercel.
2. Add only the variables needed for the selected mode; keep service-role/OpenAI/Buffer keys server-side.
3. Deploy the Next.js project with the default build command `npm run build`.
4. Verify `/api/health`, the Synthetic Demo Data label, role restrictions, import flow, approval/consent blocks, Demo/Buffer publisher label and audit export.
5. If live integrations are enabled, run separate credentialed smoke tests and inspect provider/audit failures before announcing them.

## Demo accounts

Password for provisioned Supabase demo users: `PulseDemo!2026`.

| Email                                | Role              |
| ------------------------------------ | ----------------- |
| admin@customerpulse.demo             | Administrator     |
| sales.manager@customerpulse.demo     | Sales Manager     |
| marketing.manager@customerpulse.demo | Marketing Manager |
| account.executive@customerpulse.demo | Account Executive |
| auditor@customerpulse.demo           | Auditor / Viewer  |

The no-credential demo uses the visible Demo account selector and does not contact Supabase Auth.

## Demo scenarios

- A — Maya Tan: Strategic/Critical, decline, two delivery complaints, missed follow-up; service recovery, approval and WhatsApp.
- B — Ethan Lim: Growth opportunity, positive intent and Analytics Suite gap; grounded outreach draft and approval submission.
- C — North / Food & beverage: shared price objections and threshold breach; grounded campaign, Marketing Manager approval and simulated schedule.
- D — Omar Aziz: prior High risk, approved recovery, positive reply and purchase; Medium risk and recovered revenue.

## Optional/incomplete features

P1 remains intentionally incomplete: Supabase Realtime, live Buffer publishing validation, automatic image crop/resize, AI image generation and advanced analytics. P2 is documentation-only: live WhatsApp/email ingestion, CRM integration, paid audiences, autonomous outreach and model training on real customer data.

## Known limitations

- There is no OpenAI key, so no external GPT-5.6 response was made. Demo mode is fully exercised; the live request/strict-schema/evidence validation contract is tested with an injected transport.
- There are no Buffer credentials, so live channels/publishing/status/retry were not exercised. Demo Publisher is exercised and visibly simulated.
- There is no Supabase project credential in this workspace. Migration/RLS/reset code is statically and unit checked, but remote migration, Auth provisioning, Storage and two-tenant isolation are not runtime verified.
- Demo workflow state is in-memory and resets on reload; Supabase-backed UI persistence is a deployment integration task.
- PDF export uses browser Print / Save as PDF; CSV export is native. Direct server-generated audit PDF is optional.
- Campaign image generation/cropping/resizing is P1 and disabled.
- No Vercel or GitHub deployment was performed because no authenticated target was supplied.
