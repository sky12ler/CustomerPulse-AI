# Final verification and handoff

Verification date: 18 July 2026 (Asia/Kuala Lumpur).

## Completed

- Shared `localStorage` demo store persists the selected role, recommendations, retention actions, approvals, execution/outcomes, imports, campaign draft/versions, scheduled posts, audit events, and walkthrough progress across routes and refreshes. Reset Demo restores seeded records.
- Role-aware navigation updates immediately. Unauthorized pages name the required role and provide a permitted destination. Import permissions are type-specific for Administrator, Sales Manager, Marketing Manager, assigned Account Executive, and Auditor.
- Data Imports is a four-stage wizard with templates/examples, visible browse and drag/drop, progress, replace/remove, structured mapping/preview, document metadata/text/chunks, invalid-row detail, error export, confirmation, success/next steps, Import History, and auditing.
- Recommendations create a linked Pending Approval Retention Action, preserve original and human-edited output, prevent duplicates, and navigate to `/actions?actionId=<id>` with selection/highlighting.
- Retention Actions is an operational queue spanning Draft, Pending Approval, Changes Requested, Approved, In Progress, Waiting, Completed, Rejected, and overdue work. Approval, execution, and outcome are separate audited transitions. Reviewer comments, rejection reasons, self-approval, role, and consent are enforced.
- Marketing Intelligence provides the requested evidence-based AVO insight, filters, affected customers, reasoned dismissal, uncertainty, avoid guidance, and a prefilled campaign handoff.
- Campaign Studio is a persisted seven-step wizard: Brief, Audience, Sources, Content, Review, Approval, Schedule. It validates each step, keeps versions, requires six review confirmations and approval, calls the configured publisher once per channel, and creates shared ScheduledPost records.
- Campaign Calendar uses those shared records, supports Month/Week/List, filters, query highlighting, details, reschedule/cancel/retry controls, links, and audit events.
- Analytics includes filter-linked KPIs, management insights, and the Scenario D recovery evidence without causal claims.
- Overview includes non-blocking, persisted Scenario A and C walkthroughs. Workflow guides and linked query routes connect both end-to-end chains on desktop and mobile.

## Root causes fixed

Role reset came from page-local state initialized to Sales Manager for every full route load. The role now lives in the shared persisted store, and route guards/navigation read that single source.

The production upload endpoint returned an HTML 500 even for CSV because the import module eagerly initialized XLSX, DOCX, and PDF parser runtimes when the route loaded. Parsers now use format-specific dynamic imports. The client also verifies JSON response types and accepts structured 422 validation results so invalid rows are shown instead of a generic failure.

Disconnected page-local recommendation/action/campaign/calendar arrays were replaced by shared domain records and audited transitions.

## Verification results

- `npm run lint`: passed, zero warnings/errors.
- `npm run typecheck`: passed.
- `npm test`: 47/47 passed, including all 11 permanent mock imports and PDF/DOCX/XLSX parsing.
- `npm run test:e2e`: 26/26 Chromium tests passed against an optimized production server.
- `npm run build`: passed.
- `npm audit --audit-level=high`: zero vulnerabilities.
- Secret scan: no credential or private-key match; one explicit `test-only-not-a-real-key` fixture is non-secret.

- Public Vercel `workflow-v2`: 26/26 Playwright tests passed directly against https://customer-pulse-ai-eight.vercel.app, including customers.csv, conversations.csv, product-catalogue.pdf, invalid validation, role refresh, action approval/execution/audit, campaign scheduling/calendar, analytics, walkthroughs and mobile. Health reported Demo AVO and Demo Publisher.

## Environment variables

None are required for the verified no-credential demo. Optional server-side variables:

```text
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.6
BUFFER_API_KEY=
BUFFER_ORGANIZATION_ID=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=
```

Without keys, AVO uses the labelled deterministic Demo AVO provider and publishing uses the explicitly simulated Demo Publisher.

## Database deployment

1. Create a Supabase project and install/link the CLI: `supabase link --project-ref <project-ref>`.
2. Apply `supabase/migrations/202607180001_initial_schema.sql` with `supabase db push`.
3. Set Supabase values in local/deployment secret storage; never expose the service-role key to the browser.
4. For a disposable local project, `supabase db reset` applies the migration and `supabase/seed.sql`.
5. For an explicitly configured project, run `node scripts/reset-demo.mjs --confirm`.
6. Create private import/document/asset buckets and use signed URLs.
7. Run live cross-tenant RLS tests with two organizations before admitting production data.

The current UI runtime intentionally uses localStorage; the included Supabase schema/reset path is not claimed as connected UI persistence.

## Vercel deployment

1. Import `sky12ler/CustomerPulse-AI` into Vercel and keep the existing production domain.
2. Add only optional secrets needed for the selected mode.
3. Deploy with `npm run build` (automatic Git deployment is supported).
4. Confirm `/api/health` returns `release: workflow-v2`.
5. Re-run role refresh, customers.csv, conversations.csv, product-catalogue.pdf, Scenario A, Scenario C scheduling/calendar, audit, analytics, and mobile checks on the production URL.

## Demo accounts

The no-credential UI uses the Switch Role control; no password is needed. Optional Supabase seed users use `PulseDemo!2026`: `admin@customerpulse.demo`, `sales.manager@customerpulse.demo`, `marketing.manager@customerpulse.demo`, `account.executive@customerpulse.demo`, and `auditor@customerpulse.demo`.

## Optional or unverified integrations

Live OpenAI/GPT-5.6 responses, live Buffer publishing/status callbacks, remote Supabase Auth/UI persistence/Storage, real WhatsApp/email ingestion or sending, CRM synchronization, and image generation/advanced image processing remain optional and unverified because credentials were unavailable. The implemented adapters must not be described as live-verified.
