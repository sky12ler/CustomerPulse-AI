# CustomerPulse AI

> Turn customer evidence into explainable, human-approved retention and marketing action.

CustomerPulse AI joins customer, transaction and authorised-conversation evidence; calculates tier, churn risk and estimated revenue at risk; uses AVO to extract cited signals; and moves staff through governed retention and campaign workflows. All bundled people and records are synthetic. The product supports privacy controls but does not claim legal or regulatory certification.

## Implemented system

- User-created Imported Workspace projects. Each project isolates imports, customers, conversations, transactions, documents, analyses, alerts, actions, campaigns, analytics and audit history.
- Supabase project/entity persistence and private original-file storage for authorised sessions, with a no-login localStorage/IndexedDB fallback.
- A separate resettable Synthetic Demo Workspace.
- Customer 360 at `/customers/[customerId]`, role-scoped access, search, filters, sorting, pagination, metrics and scoped export.
- Deterministic tiering, hybrid churn calculation and ERAR-v1: eligible future 90-day revenue multiplied by normalized churn probability.
- Dynamic alerts plus evidence-linked AVO analysis with confidence, uncertainty and abstention safeguards.
- Exactly three operational AVO action plans and one separate customer-message draft per structured analysis.
- A dedicated Action Plans queue: Administrator selection, owner/deadline assignment, reminders and completion criteria. Plans require Start, execution, optional response and a verified outcome before completion and risk recalculation.
- Governed retention approval and distinct start, execution, response and outcome transitions. Outcomes rerun the risk engine and update alerts, metrics, analytics and audit.
- Calculated segment opportunities, consent-safe campaign audiences, seven-step campaign creation, separate-person approval, Demo Publisher scheduling, calendar lifecycle and imported results. Customer-level result rows recalculate named customers; aggregate rows remain analytics-only.
- Honest provider states: live Xiaomi MiMo only after a successful response, explicit Demo AVO fallback, disabled Buffer without credentials and clearly labelled Demo Publisher.
- Project Data Library views imported customers, transactions, conversations, products and documents, exports raw data/extracted text and downloads original files.

## Architecture

```text
Browser / Next.js UI
  - Demo Workspace -> versioned synthetic state
  - Imported Workspace -> user-created selectable projects
      - Supabase records + private file storage for authorised sessions
      - localStorage + IndexedDB no-login fallback

Next.js routes
  - /api/imports/validate -> governed validation and preview
  - /api/avo/analyze      -> project customer evidence -> MiMo or explicit fallback
  - /api/avo/chat         -> role/project-scoped assistant
  - /api/publish          -> approval gate -> Buffer or Demo Publisher
  - /api/health           -> provider configuration state

Domain pipeline
  imports -> deterministic signals/tier -> AVO signals -> churn/ERAR -> alerts
  alert -> four recommendations -> selected Action Plan or message approval flow
  customer data -> segment opportunity -> consent-safe audience -> campaign lifecycle
```

AVO does not assign the authoritative churn score, select its own plan, approve an action, bypass consent or send communications. Deterministic logic and authorised employees retain those responsibilities.

## Local setup

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. Demo Workspace and the no-login Imported Workspace fallback work without credentials.

For live AVO:

```text
MIMO_API_KEY=
MIMO_BASE_URL=https://api.xiaomimimo.com/v1
MIMO_MODEL=mimo-v2.5-pro
```

MiMo values are server-only; never prefix them with `NEXT_PUBLIC_`. A failed provider request falls back visibly to Demo AVO.

## Imported projects and Supabase

Create a project before importing. All downstream state is scoped to the selected project; switching projects replaces the complete operational view instead of mixing datasets.

After the earlier migrations, run:

```text
supabase/migrations/202607200004_imported_projects.sql
```

It creates `operational_projects`, project-scopes operational records and audit logs, and creates the private `imported-project-files` bucket. With no authenticated Supabase session, the browser-local fallback remains available; clearing browser storage removes that local data.

## Test data

For project one, import from `mock-data/scenarios/` in this order:

1. `01-customers-mixed-risk.csv`
2. `02-transactions-mixed-risk.csv`
3. `03-conversations-mixed-risk.csv`

For project two, import the different customers, transactions, conversations and PDFs under `mock-data/scenarios/alternate-pack/`. See each pack's manifest for expected results.

## Verification

```powershell
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
npm audit --audit-level=high
```

Latest local result: ESLint and TypeScript passed; 18 Vitest files with 136/136 tests passed; the optimized production build passed; 48/48 Playwright workflows passed. See `docs/TESTING.md` for the exact security and production verification status.

## Deployment

1. Apply migration `202607200004_imported_projects.sql`.
2. Push the current code to GitHub.
3. Add MiMo and existing Supabase values in Vercel Project Settings.
4. Redeploy, check `/api/health`, and run the Playwright suite against the production URL.
5. Create two Imported Workspace projects and verify that switching them changes the entire data and analytics view.

## External boundaries

- Demo Publisher creates application scheduling records; it does not post to a social network.
- Buffer remains disabled until valid Buffer credentials are configured.
- WhatsApp/email actions are user-initiated links or staff-confirmed transitions, not automatic delivery or inbound-response ingestion.
- Overdue Action Plans are evaluated when a project loads and every minute while the app is open; an always-on background scheduler is not included.
- Image generation, advanced image processing and CRM synchronization are not implemented.

See `docs/FINAL_HANDOFF.md`, `docs/P0_ACCEPTANCE.md`, `docs/DEMO_SCRIPT.md`, `docs/TESTING.md` and `docs/DEPLOYMENT.md`.
