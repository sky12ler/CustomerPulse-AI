# Final production verification and handoff

Verification date: 19 July 2026 (Asia/Kuala Lumpur).

## Production release

- Production URL: https://customer-pulse-ai-eight.vercel.app
- Application commit: `675e291533482975a9404fbc785f318c98ba2002`
- Vercel deployment: `dpl_D32DHhrZDdxeHEJDnnmP6azqgxru`
- Deployment state: Ready; the production alias was confirmed on the deployment.
- Health check: `status: ok`, `release: workflow-v2`, `avoProvider: demo`, `publisher: demo`.

## Production acceptance results

All results below were exercised through the deployed UI at the production URL. The final complete production Playwright run passed 30/30 tests in Chromium, including the four explicit A-D workflow tests.

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
- Unit tests: 47/47 passed across 8 Vitest files, including all permanent mock imports and document parsing.
- Local Playwright: 30/30 passed against an optimized production server.
- Production Playwright: 30/30 passed against the public Vercel URL; the explicit A-D subset passed 4/4 separately after deployment.
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
