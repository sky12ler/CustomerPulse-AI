# Final production verification and handoff

Verification date: 19 July 2026 (Asia/Kuala Lumpur).

## Production release

- Production URL: https://customer-pulse-ai-eight.vercel.app
- Application commit: `5a22d05b759808f4fa97727c85de472257d84c30`
- Vercel deployment: `dpl_4fAFL7gYHYVNC2Kt1XejBaLucY3K`
- Deployment state: Ready; the production alias was confirmed on the deployment.
- Health check: `status: ok`, `release: workflow-v2`, `avoProvider: demo`, `publisher: demo`.

## Production acceptance results

The latest Phase 2 deployment was exercised directly at the production URL: 13/13 customer-workspace Playwright tests passed in Chromium. The A-D results below were also verified in the earlier production acceptance release and all 44 combined tests passed locally against the current optimized production build; the full 44-test suite was not rerun publicly for this Phase 2 deployment.

- A — Data import: passed. Administrator persisted across routes. `customers.csv`, `conversations.csv`, and `product-catalogue.pdf` each completed upload, preview/validation, confirmation, success summary, shared Import History, and audit verification. The PDF uses explicit Node canvas primitives and the parser's embedded worker in Vercel.
- B — Customer retention: passed. Maya Tan's conversation and AVO analysis showed source evidence, 92% confidence, and labelled uncertainty. Her churn alert led to a recommendation, Pending Approval action, different-role Sales Manager approval with comment, Account Executive WhatsApp demo execution, recorded outcome, and the complete audited transition chain.
- C — Marketing: passed. The segment-decline trigger prefilled the brief and audience. All seven Campaign Studio stages completed; a different authorized user approved the campaign; Demo Publisher scheduled it; the campaign was highlighted in the shared calendar; approval/scheduling audit events and Marketing Intelligence/Analytics insights were verified.
- D — UX: passed. Role persistence, Back/Continue/Next Step navigation, disabled-button explanations, direct next-action links, mobile navigation/layout, and Guided Demo Scenarios A and C were exercised.

## Completed functionality

- Shared persisted demo state for role, imports, recommendations, retention actions, approvals, execution/outcomes, campaigns, scheduled posts, audit events, and guided-demo progress.
- Four-stage imports with templates/examples, mapping, preview, structured validation, error export, PDF/DOCX/XLSX support, confirmation, success links, history, and audits.
- Evidence-grounded Demo AVO analysis with confidence and explicit uncertainty, plus optional OpenAI adapter.
- Enforced requester/reviewer/executor separation, self-approval blocking, reviewer comments, consent checks, and immutable-style audit events.
- Seven-stage Campaign Studio with persisted draft/version state, review checklist, approval gate, Demo Publisher scheduling, shared calendar records, filters, highlighting, and audit history.
- Marketing Intelligence, Analytics, role-aware navigation, responsive layouts, and guided Scenarios A-D.

## Verification gates

- ESLint: passed with zero errors.
- TypeScript: passed with `tsc --noEmit`.
- Unit tests: 109/109 passed across 12 Vitest files, including all permanent mock imports, ERAR-v1, assignment scoping, RLS structure, and document parsing.
- Local Playwright: 44/44 passed against the current optimized production server.
- Production Playwright: 13/13 Phase 2 customer tests passed against the current public Vercel deployment; the earlier release recorded 30/30 general production tests and 4/4 explicit A-D tests.
- Production build: passed locally and in Vercel.
- `npm audit --audit-level=low`: zero vulnerabilities.
- Secret scan: no real credential or private-key match. `tests/avo.test.ts` contains only the explicit fixture `test-only-not-a-real-key`.
- Git status: local `.env.local` and `.vercel/` are ignored. The Vercel OIDC token created during CLI linking was not committed.

## Environment variables

No environment variable is required for the verified no-credential demo. Optional server-side variables are:

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

With no OpenAI or Buffer credentials, the app visibly uses deterministic Demo AVO and Demo Publisher. Never place service-role, OpenAI, Buffer, or Vercel tokens in `NEXT_PUBLIC_*` variables.

## Database deployment steps

The verified demo uses browser `localStorage`; the Supabase schema is supplied but is not connected to the UI runtime.

1. Create a Supabase project and install/authenticate the Supabase CLI.
2. Run `supabase link --project-ref <project-ref>`.
3. Apply `supabase/migrations/202607180001_initial_schema.sql` with `supabase db push`.
4. Set Supabase secrets in local/Vercel secret storage; keep `SUPABASE_SERVICE_ROLE_KEY` server-only.
5. For disposable local data, run `supabase db reset` to apply the migration and `supabase/seed.sql`.
6. For an explicitly configured project only, run `node scripts/reset-demo.mjs --confirm`.
7. Create private import/document/asset buckets, use signed URLs, and run live two-organization RLS tests before using real customer data.
8. Connecting the current UI store to Supabase requires additional implementation and verification.

## Vercel deployment steps

The verified release was deployed manually; automatic Git deployment was not verified.

1. Push the desired commit to `sky12ler/CustomerPulse-AI`.
2. Authenticate with `npx vercel whoami` and complete the device flow if required.
3. Link with `npx vercel link --yes --project customer-pulse-ai`.
4. Add optional application secrets in Vercel Project Settings. Do not commit `.env.local` or `.vercel/`.
5. Deploy with `npx vercel deploy --prod --yes`.
6. Confirm the deployment is Ready and aliased to `https://customer-pulse-ai-eight.vercel.app`.
7. Confirm `/api/health` reports the intended provider modes, then rerun `PLAYWRIGHT_BASE_URL=https://customer-pulse-ai-eight.vercel.app npx playwright test`.

## Demo accounts

The deployed no-credential demo uses the `Demo account` role selector; no login or password is needed:

- Administrator
- Sales Manager
- Marketing Manager
- Account Executive
- Auditor

The optional Supabase seed defines demo users separately, but Supabase Auth is not connected to the verified deployed UI.

## Demo scenarios

- Scenario A: Maya Tan retention recovery from conversation evidence through approval, WhatsApp demo execution, outcome, and audit.
- Scenario B: Grounded growth recommendation/draft using synthetic evidence.
- Scenario C: Segment-decline insight through seven-stage campaign creation, separate approval, Demo Publisher scheduling, highlighted calendar record, and audit.
- Scenario D: Observed recovery and analytics reporting without unsupported causal claims.

## Remaining limitations

- Live OpenAI/GPT-5.6 responses were not tested because no API key was available; Demo AVO fallback was tested.
- Live Buffer publishing/status callbacks were not tested because no Buffer credentials were available; Demo Publisher was tested.
- Supabase Auth, database persistence, Storage, and RLS are not connected to the UI and were not production-tested.
- WhatsApp and email actions are audited demo simulations, not real external sends.
- CRM synchronization, image generation, and advanced image processing are not implemented/verified.
- Demo data and workflow state are synthetic and browser-local, so they do not synchronize across browsers or devices and are cleared with site storage/reset.
- Automatic Git-to-Vercel deployment was not observed for this release; the production deployment used the authenticated Vercel CLI.

## Phase 1 dynamic operational pipeline handoff

Implemented: shared persisted operational datasets; Demo/Imported separation; provenance; incremental idempotent imports; authoritative tier/churn engines; validated AVO signal conversion; idempotent alerts; monitored state; versioned Changes Requested loop; separate approval/start/execution/response/outcome; actual post-outcome recalculation; dynamic analytics selectors; Reset Demo preserving imports; no-upload demo; multi-file Quick Import.

Local verification on 2026-07-19: ESLint passed; TypeScript passed; 94/94 unit tests passed; 31/31 Playwright tests passed; production build passed; npm audit found 0 vulnerabilities; tracked-file secret scan found no credential patterns.

External limitations: no credentialed OpenAI, Buffer, Supabase, WhatsApp, or email provider was exercised. Demo AVO and Demo Publisher are the verified fallbacks. Browser demo persistence is local to one browser/device. Background scheduled monitoring and ZIP bundle import remain future work.

Production source commit: `391b489` (implementation commit `f860695`). Production URL: `https://customer-pulse-ai-eight.vercel.app`. Deployment ID: `dpl_Hn4Je6fkDNQT7j18H9wXZTNYvwdW`. Production Playwright acceptance: 5/5 workflows passed, including customer/transaction/conversation/document imports, Maya AVO plus revision/approval/start/execution/response/outcome, marketing scheduling, UX/mobile, and Omar calculated recovery with alert downgrade/resolution.

## Phase 2 customer workspace acceptance

Phase 2 adds customer-specific URLs, semantic and keyboard-accessible navigation, URL-backed Customer 360 tabs, filter/sort/page restoration, advanced operational filters and sorting, summary insights, pagination, mobile cards, scoped export, ERAR-v1 calculation details, and explicit Not Found/Access Denied states. It preserves the Phase 1 authoritative operational store and existing Customer 360 tab content.

Demo assignment policy: Account Executive -> Aisha Rahman. That scope is enforced in the shared provider, lookups, conversations, alerts, recommendations, actions, AVO requests, exports, and relevant audit views. Administrator and Sales Manager have wider authorized demo scope; Auditor remains read-only. Supabase migration `202607190002_customer_assignment_rls.sql` adds assignment-aware RLS and ERAR-v1 fields, but Supabase runtime persistence is still not connected or live-tested.

Phase 2 local gates on 19 July 2026: ESLint passed; TypeScript passed; 109/109 unit tests passed; 44/44 Playwright tests passed; optimized production build passed; npm audit found zero vulnerabilities; secret scan found no real key or private key. Production deployment verified: commit `5a22d05b759808f4fa97727c85de472257d84c30`, deployment `dpl_4fAFL7gYHYVNC2Kt1XejBaLucY3K`, Ready and aliased to `https://customer-pulse-ai-eight.vercel.app`. The public Phase 2 suite passed 13/13 in 25.6 seconds; `/api/health` returned `status: ok`, `avoProvider: demo`, and `publisher: demo`.
