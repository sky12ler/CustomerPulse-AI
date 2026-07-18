# CustomerPulse AI

CustomerPulse AI is an explainable customer-retention and marketing-intelligence platform built for OpenAI Build Week's Work & Productivity track. Its named assistant, **AVO**, turns authorised customer conversations and behavioural evidence into draft actions that employees review, edit, approve and execute.

> **Synthetic Demo Data:** every bundled identity, contact, company, transaction and outcome is fictional. AVO supports staff decisions; final decisions and actions remain the responsibility of authorised employees.

## Problem and users

Account teams often discover churn signals across transactions, complaints and conversations too late. Marketing teams see segment decline without a governed path from evidence to intervention. CustomerPulse serves administrators, sales managers, marketing managers, account executives and read-only auditors without becoming a generic CRM or social scheduler.

## Solution and features

- Customer 360 with explainable tier, risk, revenue-at-risk and source-linked signals.
- Conversation workspace with validated AVO evidence, sentiment, intent, complaints and missed follow-ups.
- Deterministic RFM-plus tiering and hybrid churn scoring; AVO never decides the score alone.
- Churn/segment alert centres, editable AVO recommendations and approval histories.
- Consent-gated WhatsApp deep links and email composition; private messages are never auto-sent.
- Grounded campaign studio, factual-claim review, Marketing Manager approval and Buffer/demo scheduling.
- Import validation workflow, permanent mock templates, governance controls, lineage and immutable audit reporting.
- Demo fallback works without OpenAI, Supabase or Buffer and is labelled **AVO Demo Analysis** / simulated.

## Architecture and stack

Next.js App Router, strict TypeScript, accessible custom components, Recharts, Zod, Supabase PostgreSQL/Auth/Storage/RLS, OpenAI Responses API, Buffer GraphQL API, Vitest and Playwright. Server-only provider interfaces isolate secrets. See [Architecture](docs/ARCHITECTURE.md).

## Setup

```bash
npm install
copy .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. No credentials are required for the complete simulated demo. Optional service setup is documented in [Deployment](docs/DEPLOYMENT.md).

## Demo accounts

The UI role selector makes the local no-credential demo instant. Seeded Supabase accounts use password `PulseDemo!2026`:

| Account | Role |
|---|---|
| admin@customerpulse.demo | Administrator |
| sales.manager@customerpulse.demo | Sales Manager |
| marketing.manager@customerpulse.demo | Marketing Manager |
| account.executive@customerpulse.demo | Account Executive |
| auditor@customerpulse.demo | Auditor / Viewer |

## Mock data and imports

Permanent populated templates and grounding assets live in [`mock-data`](mock-data). They remain after import and are downloadable on Data Imports. `node scripts/reset-demo.mjs` reloads customer seed data into configured Supabase; `supabase db reset` applies migrations and `seed.sql`. See [Mock Data](docs/MOCK_DATA.md) and [Data Imports](docs/DATA_IMPORTS.md).

## Demo scenarios

- **A:** Maya Tan, Strategic/Critical, declining purchases, unresolved delivery complaints, a missed commitment, competitor and cancellation language. AVO recommends service recovery before promotion.
- **B:** Ethan Lim, Growth/Low, positive activity and explicit interest in analytics. AVO drafts a catalogue-grounded cross-sell.
- **C:** North food-and-beverage segment breaches risk, revenue, frequency and engagement thresholds with shared price objections; a grounded campaign moves through approval and Demo Publisher.
- **D:** Omar Aziz moves High to Medium after approved recovery, positive response and a new purchase; estimated recovered revenue appears in Analytics.

## Testing

```bash
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Tests cover tier/risk boundaries, evidence validation, injection detection, consent, WhatsApp links, segment triggers, approval enforcement, idempotent publishing and permanent files. See [Testing](docs/TESTING.md).

## Privacy and AI governance

The platform provides privacy-supporting controls, not regulatory certification. Tenant RLS, purpose limitation, data minimisation, consent enforcement, classification, retention review, AI disclosure, lineage and audited exports are visible. AVO cites source IDs, displays confidence/uncertainty, abstains when evidence is weak and cannot approve or execute. See [AI Governance](docs/AI_GOVERNANCE.md), [Data Governance](docs/DATA_GOVERNANCE.md) and [Privacy](docs/PRIVACY.md).

## Deployment

The repository is prepared for GitHub, Supabase and Vercel with a health endpoint at `/api/health`, SQL migration/seed, `.env.example`, demo fallback and deployment checklist. See [Deployment](docs/DEPLOYMENT.md).

## Limitations and human decisions

Live WhatsApp/email ingestion, CRM integrations, paid audiences, model training and autonomous outreach are out of scope. Buffer analytics are not claimed by the current publisher implementation. Employees decide overrides, approvals, messages, offers, exports and publication. AVO never makes final business decisions.

## How Codex and GPT-5.6 are used

Codex implemented the application, tests, schema, mock artefacts and documentation in this repository. With `OPENAI_API_KEY`, server-side AVO analysis uses the Responses API and the environment-configured `OPENAI_MODEL` (default `gpt-5.6`); outputs are Zod-validated and evidence IDs are checked. Without a key, deterministic `DemoAVOProvider` produces clearly labelled fallback analysis.

For the three-minute walkthrough, use [Demo Script](docs/DEMO_SCRIPT.md). Devpost notes are in [Devpost Submission](docs/DEVPOST_SUBMISSION.md).
