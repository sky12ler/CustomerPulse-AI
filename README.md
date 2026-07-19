# CustomerPulse AI

> Turn customer evidence into explainable, human-approved retention and marketing action.

CustomerPulse AI is a deployable customer-retention and marketing-intelligence workspace. It joins customer, transaction and authorised-conversation evidence; calculates tiers, churn risk and estimated revenue at risk; uses AVO to extract evidence-linked signals; and moves staff through governed retention and campaign workflows.

All bundled people and records are synthetic. Privacy-supporting controls are implemented, but the project does not claim legal or regulatory certification.

## What is implemented

- A shared operational store for imported customers, transactions, conversations, products, analyses, alerts, recommendations, retention actions, campaigns, results and audit events.
- Supabase Auth, row-level access, per-entity persistence, append-only audit insertion and Realtime refresh for the Imported Workspace.
- A separate resettable Synthetic Demo Workspace for credential-free judging.
- Customer 360 routes at `/customers/[customerId]`, role-scoped access, search, 11 filters, seven sort options, pagination, summary metrics and scoped CSV export.
- Deterministic tiering, hybrid churn calculation and ERAR-v1: eligible future 90-day revenue multiplied by normalized churn probability.
- Dynamic alerts and customer-specific AVO recommendations with evidence, confidence, uncertainty and abstention safeguards.
- Retention states: Draft → Pending Approval → Changes Requested/revision or Rejected/Approved → In Progress → Waiting for Customer/Outcome Required → Completed.
- Separate action start, execution, customer-response and outcome transitions. Outcomes run the authoritative risk engine and update customer metrics, alerts, analytics and audit history.
- Calculated segment opportunities from current operational data. Campaign audiences are recalculated from the selected segment, channel availability and current consent.
- Blank/list Campaign Studio from navigation, insight-prefilled campaigns from Marketing Intelligence and campaign-specific versions/approval history.
- Campaign approval, Demo Publisher scheduling, rescheduling, cancellation, published confirmation, imported results, calendar filters and campaign-specific analytics.
- Honest provider states: live Xiaomi MiMo when its request succeeds, explicit Demo AVO fallback with the reason when it fails, disabled Buffer selection without credentials and clearly selected Demo Publisher.

## Architecture

```text
Browser / Next.js UI
  ├─ Demo Workspace → versioned localStorage operational state
  └─ Imported Workspace → Supabase Auth + RLS + per-entity JSONB records + Realtime
                           └─ append-only audit_logs

Next.js server routes
  ├─ /api/imports/validate → governed file validation and preview
  ├─ /api/avo/analyze      → authenticated customer lookup → MiMo/OpenAI-compatible AVO
  │                          └─ explicit deterministic fallback
  ├─ /api/publish          → approval gate → Buffer or Demo Publisher
  └─ /api/health           → configured provider availability

Domain layer
  imports → tier/signals → churn/ERAR → alerts → recommendations/actions
  customer data → segment calculation → consent-filtered campaign → approval/calendar/results
```

AVO does not directly assign the authoritative churn score, approve an action, bypass consent or send customer communications. Deterministic application logic and authorised employees keep those responsibilities.

## Local setup

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. Demo Workspace works without credentials.

For the real Imported Workspace, configure:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
XIAOMIMIMO_API_KEY=
XIAOMIMIMO_BASE_URL=
XIAOMIMIMO_MODEL=mimo-v2.5
```

`SUPABASE_SERVICE_ROLE_KEY` and MiMo credentials are server-only. Never prefix them with `NEXT_PUBLIC_`. The application uses `XIAOMIMIMO_API_KEY`; a provider-specific subscription token that is not accepted by the OpenAI-compatible endpoint will fall back visibly to Demo AVO.

## Supabase deployment

Run these files in order in the Supabase SQL Editor:

1. `supabase/migrations/202607180001_initial_schema.sql`
2. `supabase/migrations/202607190002_customer_assignment_rls.sql`
3. `supabase/migrations/202607190003_operational_workspace.sql`

The third migration connects the current Imported Workspace model: per-entity records, assignment-aware RLS, Auth profile provisioning, Realtime and append-only audit protection.

Create each account through `/login`. New accounts safely default to `account_executive`. Then copy `supabase/ROLE_SETUP.sql`, replace the example email and role, and run it once per elevated user. Do not expose a client-side “make me administrator” control.

## Test data

The original fixtures are in `mock-data/`. A connected mixed-risk pack is in `mock-data/scenarios/`:

1. Upload `01-customers-mixed-risk.csv` as Customers.
2. Upload `02-transactions-mixed-risk.csv` as Transactions.
3. Upload `03-conversations-mixed-risk.csv` as Conversations.

The pack covers critical complaint/cancellation, growth/product interest, withdrawn consent, insufficient evidence, stable health, recovery and missing-channel cases. See `mock-data/scenarios/UPLOAD_MANIFEST.md` for expected observations.

## Verification commands

```powershell
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
npm audit --audit-level=low
```

The current automated baseline is 14 Vitest files / 118 tests and 45 Playwright workflows. See `docs/TESTING.md` for the last completed run and the distinction between local, provider and deployed-production verification.

## Deployment

Push the repository to GitHub, add the same environment variables in Vercel Project Settings and redeploy. After deployment, verify `/api/health`, log in, use Imported Workspace, import the scenario pack, run AVO, refresh in a second tab and confirm the same operational records remain.

## External boundaries

- MiMo AVO is live only when the response itself succeeds. Otherwise the UI names the attempted provider and fallback reason.
- Demo Publisher creates application scheduling records; it does not post to a social network.
- Buffer remains disabled until valid Buffer credentials are configured.
- WhatsApp/email actions are user-initiated links or staff-confirmed workflow transitions, not automatic delivery or inbound-message ingestion.
- Image generation and advanced image processing remain optional future work.

See `docs/FINAL_HANDOFF.md`, `docs/P0_ACCEPTANCE.md`, `docs/DEMO_SCRIPT.md`, `docs/DEVPOST_SUBMISSION.md` and `docs/DEPLOYMENT.md`.
