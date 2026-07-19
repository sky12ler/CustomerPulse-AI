# Final production verification and handoff

Verification date: 19 July 2026 (Asia/Kuala Lumpur).

## Production release

- Production URL: https://customer-pulse-ai-eight.vercel.app
- Application commit: `0e7225d4b1208c3196a991bc48184969f96b6b32`
- Vercel deployment: `dpl_Bz4gAtdCwcV4H497JCwBDq6vDWmK`
- Deployment state: `READY`, target `production`, aliased to the production URL.
- Health: `status: ok`, `release: workflow-v2`, `avoProvider: demo`, `publisher: demo`.

The complete 45-test Chromium regression passed directly against this production deployment in 1.4 minutes. This was a public-host run, not an inference from local tests.

## Cross-phase production acceptance

| # | Required behavior | Verified production evidence | Result |
| --- | --- | --- | --- |
| 1 | Imports update the operational store | Confirmed customer, transaction and conversation imports changed the Imported Workspace; imported customer, TXN-000 and MSG-A-104 were read back from Customer 360 | Passed |
| 2 | AVO creates validated signals | Imported Maya analysis persisted evidence-linked `AVO Analysis` signals and a stored analysis with confidence and uncertainty | Passed in Demo AVO mode |
| 3 | Churn recalculates dynamically | Imports and AVO invoke the authoritative engine and audit score before/after; Omar's recorded outcome changed the actual stored score | Passed |
| 4 | Alerts create, update and resolve dynamically | Unit cases exercise create/update/resolve/reopen/idempotency; production Maya and Omar workflows exercise alert updates and recovery resolution | Passed |
| 5 | Changes Requested supports revision/resubmission | Maya moved Pending Approval -> Changes Requested -> Draft Revision -> Pending Approval with versioned content and reviewer feedback | Passed |
| 6 | Lifecycle transitions are separate | Start, execution confirmation, customer response and outcome each changed a separate state and record | Passed |
| 7 | Outcome triggers real risk recalculation | Omar's Purchase completed outcome changed customer score, risk, monitored state, summary metrics and audit values | Passed |
| 8 | Customer links open `/customers/[customerId]` | Name, View Customer, row mouse and keyboard navigation were exercised | Passed |
| 9 | Refresh preserves Customer 360 | Deep route, active tab and list-return state survived refresh | Passed |
| 10 | Account Executive sees assigned customers only | Aisha Rahman's list, direct URL, API, action, export and audit scope were exercised; an unassigned customer was denied | Passed |
| 11 | Filters/sorts/pagination use operational data | All controls changed live scoped results, counts, URL state and pagination | Passed |
| 12 | Revenue at risk is authoritative | ERAR-v1 uses next-90-day eligible revenue x normalized churn probability; list and Customer 360 agree | Passed |
| 13 | Customer metrics update after recalculation | Omar's recovery changed at least one risk/revenue summary and Reset restored the original values | Passed |
| 14 | Analytics updates after actions/outcomes | Analytics changed from Recovery monitoring to Successful recovery and displayed the recorded outcome and current calculated risk | Passed |
| 15 | Exports respect filters/RBAC | Export followed the current scoped, filtered and sorted result set and excluded inaccessible customers | Passed |
| 16 | Demo Reset restores original data | Omar's action, customer summaries and analytics returned to seeded state; Imported Workspace remains separate | Passed |
| 17 | Scenarios A and D complete | Scenario A's governed Maya chain and Scenario D's observed Omar recovery completed end to end | Passed |
| 18 | Desktop/mobile workflows | Desktop table workflows, mobile cards/navigation and no-horizontal-overflow checks passed | Passed |
| 19 | Audit contains before/after values | Lifecycle events now record named state before/after; AVO/outcome events record score before/after | Passed |

A recalculation is not claimed to change a rounded score in every case: a valid low-weight signal may produce the same displayed integer. The implementation still stores the signal, runs the engine and audits the actual before/after values.

## Completed functionality

- Isolated Demo and Imported operational workspaces persisted in browser localStorage.
- Incremental customer, transaction, conversation, product and document imports with provenance, validation, confirmation, recalculation and audit.
- Deterministic tier, hybrid churn and ERAR-v1 calculations; evidence-linked AVO analyses become validated or review-required signals rather than writing scores directly.
- Dynamic alert create/update/resolve/reopen behavior.
- Governed recommendation lifecycle with Changes Requested, versioned revision, resubmission, different-user approval and separate start/execution/response/outcome transitions.
- Customer 360 deep links, refresh-safe tabs, operational filters, sorting, pagination, summaries, scoped export and responsive mobile cards.
- Dynamic customer metrics, retention analytics and audit history based on current operational records.
- Seven-step campaign workflow, consent and approval gates, Demo Publisher scheduling and calendar highlighting.
- Demo Reset restores seeded Demo Workspace data without silently mixing it with Imported Workspace records.

## Quality and security results

| Gate | Result |
| --- | --- |
| ESLint | Passed, zero errors |
| TypeScript | Passed with `tsc --noEmit` |
| Vitest | 12 files, 109/109 tests passed |
| Local Playwright | 45/45 passed against an optimized production server |
| Production Playwright | 45/45 passed against the public Vercel URL in 1.4 minutes |
| Production build | Passed locally and on Vercel |
| npm audit | 0 vulnerabilities at `--audit-level=low` |
| Secret scan | 0 credential-like or private-key matches outside ignored environment/dependency/build paths |

All permanent mock-data formats are covered by unit parsing tests. Production browser tests explicitly upload `customers.csv`, `transactions.csv`, `conversations.csv`, and `product-catalogue.pdf`.

## Environment variables

No variable is required for the verified credential-free demo. Optional server-side configuration is:

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

Without OpenAI or Buffer credentials the UI visibly uses deterministic Demo AVO and Demo Publisher. Never expose OpenAI, Buffer, service-role or Vercel tokens through `NEXT_PUBLIC_*`.

## Database deployment

The verified production UI uses browser localStorage. The supplied Supabase schema is not connected to the runtime UI.

1. Create a Supabase project and authenticate the Supabase CLI.
2. Run `supabase link --project-ref <project-ref>`.
3. Run `supabase db push` to apply both migrations, including assignment-aware RLS and ERAR-v1 fields.
4. Put Supabase values in local/Vercel secret storage; keep `SUPABASE_SERVICE_ROLE_KEY` server-only.
5. For disposable local data, run `supabase db reset` to apply migrations and `supabase/seed.sql`.
6. Only for an explicitly configured project, use `node scripts/reset-demo.mjs --confirm`.
7. Before real customer data, implement the UI database adapter and verify Auth, Storage, two-organization RLS, backup and deletion behavior. Those steps remain future work.

## Vercel deployment

1. Push the intended commit to GitHub.
2. Link the project with `npx vercel link --yes --project customer-pulse-ai`.
3. Add optional secrets in Vercel Project Settings; do not commit `.env.local` or `.vercel/`.
4. Run `npx vercel deploy --prod --yes`.
5. Confirm `READY`, the production alias and `/api/health` provider modes.
6. Run `$env:PLAYWRIGHT_BASE_URL='https://customer-pulse-ai-eight.vercel.app'; npx playwright test --workers=1`.

This release used the authenticated Vercel CLI. Automatic Git-to-Vercel deployment was not independently observed.

## Demo accounts and scenarios

The deployed UI has no login/password. Use the persisted Demo account selector: Administrator, Sales Manager, Marketing Manager, Account Executive or Auditor.

- Scenario A: Maya Tan conversation evidence -> AVO -> alert/recommendation -> Changes Requested/revision -> approval -> start -> execution -> response -> outcome -> recalculation/audit.
- Scenario B: grounded Growth recommendation using synthetic evidence.
- Scenario C: segment-decline insight -> seven-step campaign -> different-user approval -> Demo Publisher -> highlighted calendar/audit.
- Scenario D: Omar Aziz approved recovery -> start -> execution -> response -> Purchase completed outcome -> actual risk/metric/analytics update -> Reset.

## Remaining limitations

- Live OpenAI/GPT-5.6 responses were not tested because no API key was available; Demo AVO is the verified mode.
- Live Buffer publishing/callbacks were not tested; Demo Publisher is the verified mode.
- Supabase Auth, persistence, Storage and remote RLS are supplied as deployment artifacts but are not connected or production-tested.
- WhatsApp/email are user-initiated or staff-confirmed demo actions, not verified external sending/ingestion.
- Browser-local state does not synchronize across users, browsers or devices.
- CRM sync, background monitoring, ZIP import, image generation and advanced image processing are not implemented or verified.
