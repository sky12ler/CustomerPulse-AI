# CustomerPulse AI

> **Turn customer evidence into explainable, human-approved retention and marketing action.**

CustomerPulse AI is a governed customer-retention and marketing-intelligence workspace built for the OpenAI Build Week Work & Productivity track. Its named assistant, **AVO**, analyses authorised synthetic conversations, explains evidence, and creates editable recommendations and campaign drafts. Deterministic application logic calculates customer tiers, churn risk, consent eligibility, segment triggers, and approval constraints; authorised employees remain responsible for every material decision and action.

> **Synthetic Demo Data:** every bundled identity, contact, company, transaction, conversation, campaign, and outcome is fictional. The application provides privacy-supporting controls and does not claim regulatory certification.

## Why it exists

Customer risk signals are commonly split across purchases, complaints, conversations, missed commitments, and campaign results. That fragmentation delays retention work and makes marketing interventions difficult to justify. CustomerPulse connects those signals to visible evidence, deterministic calculations, editable AVO assistance, role-based approval, and explicit execution without becoming an autonomous outreach system.

## What the verified demo does

- Provides a responsive 15-route workspace for Administrator, Sales Manager, Marketing Manager, Account Executive, and read-only Auditor views.
- Shows Customer 360 records with tier, risk, confidence, lifetime value, revenue at risk, behavioural trends, product gaps, conversations, alerts, actions, campaign history, and audit history.
- Validates CSV, XLSX, JSON, TXT, PDF, DOCX, PNG, and JPG imports with file-signature and size checks, preview, column mapping, required fields, duplicate detection, invalid-row reporting, error download, and explicit confirmation.
- Calculates explainable deterministic RFM-plus tiers and hybrid churn risk; AVO does not set either score.
- Runs AVO conversation analysis with sentiment, intent, complaints, product interest, objections, competitor and cancellation signals, staff commitments, evidence IDs, confidence, and uncertainty.
- Rejects nonexistent evidence IDs, removes instruction-like customer content before live-provider submission, and abstains when evidence is insufficient.
- Creates editable AVO recommendations and records useful, partially useful, not useful, or incorrect feedback; incorrect feedback requires a correction note.
- Enforces manager roles, reviewer comments, rejection reasons, approval before execution, requester/AVO separation, promotion facts, severe-complaint rules, and marketing consent.
- Opens approved WhatsApp and email deep links, creates internal tasks, and provides trackable landing-page links without auto-sending private messages.
- Detects segment decline, shows affected customers and common evidence, and creates source-grounded campaign briefs and channel variants for human review.
- Schedules approved campaigns through the verified, explicitly simulated Demo Publisher.
- Shows synthetic customer, action, marketing, and AVO-governance analytics plus searchable audit records, CSV export, and printable reports.

## Verified implementation status

| Capability                | Verified status                                                                                                                                |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| AVO without credentials   | `DemoAVOProvider` verified end to end and labelled **AVO Demo Analysis**                                                                       |
| OpenAI Responses API      | `OpenAIProvider` strict-schema request and validation contract verified with an injected transport; no external API call claimed               |
| Campaign scheduling       | `DemoSocialPublisher` approval and idempotency verified; result labelled simulated                                                             |
| Buffer                    | Adapter implemented and code-reviewed; live Buffer account and publishing not credential-tested                                                |
| Demo workflow state       | In-memory for a frictionless demonstration; resets on reload                                                                                   |
| Supabase                  | Normalized migration, RLS policies, seed SQL, SDK dependencies, and reset loader included; UI persistence is not connected or runtime-verified |
| WhatsApp and email        | Approved, consent-gated user-initiated links; no automatic sending or live ingestion                                                           |
| Image generation/cropping | Not implemented; documented as optional future work                                                                                            |

## Architecture

The runtime is a Next.js App Router application with React and strict TypeScript. Server routes handle health checks, AVO analysis, import validation, demo-file download, publishing, and trackable landing pages. Domain modules keep deterministic tiering, churn scoring, consent, segment detection, approvals, imports, AI providers, and publishers separate from the UI.

`AIProvider` has `OpenAIProvider` and `DemoAVOProvider` implementations. The OpenAI path uses the Responses API, an environment-configurable model name defaulting to `gpt-5.6`, strict structured output, Zod validation, and source-message ID verification. The no-key path is deterministic and visibly labelled.

`SocialPublisher` has `BufferPublisher` and `DemoSocialPublisher` implementations. The verified demo publisher requires approval and protects against duplicate schedules. Live Buffer behavior is not claimed.

The Supabase migration defines the normalized tenant tables, organization RLS, role policies, approval separation, scheduling idempotency, and an audit table without normal update/delete policies. These are deployment artifacts rather than evidence of active UI persistence. See [Architecture](docs/ARCHITECTURE.md) and [P0 acceptance verification](docs/P0_ACCEPTANCE.md).

## Technology

Codex, Next.js App Router, React, TypeScript, OpenAI Responses API adapter, GPT-5.6 model configuration, Zod, Supabase PostgreSQL migration/RLS/SDK tooling, Buffer GraphQL adapter, Demo Publisher, Recharts, ExcelJS, Mammoth, pdf-parse, Papa Parse, Vitest, Playwright, ESLint, and Vercel.

## Local setup

```bash
npm install
copy .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. All values in `.env.local` may remain blank for the verified simulated demo. Never commit real credentials.

Optional server-side configuration:

```text
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.6
BUFFER_API_KEY=
```

Supabase variables are used by the reset tooling, not by the current in-memory UI runtime. See [Deployment](docs/DEPLOYMENT.md) before configuring external services.

## Demo roles and optional seeded accounts

The no-credential demo uses the visible **Demo account** selector. If the Supabase reset loader is run against a configured project, it provisions these synthetic users with password `PulseDemo!2026`:

| Account                                | Role              |
| -------------------------------------- | ----------------- |
| `admin@customerpulse.demo`             | Administrator     |
| `sales.manager@customerpulse.demo`     | Sales Manager     |
| `marketing.manager@customerpulse.demo` | Marketing Manager |
| `account.executive@customerpulse.demo` | Account Executive |
| `auditor@customerpulse.demo`           | Auditor / Viewer  |

The current UI does not authenticate against those Supabase users.

## Mock data and imports

Permanent synthetic fixtures live in [`mock-data`](mock-data) and remain downloadable from Data Imports. They include customer, transaction, conversation, product, campaign-result, grounding-document, and campaign-image files. The fixture set contains 30 customers, all four tiers, transaction dates spanning at least 12 months, multiple channels and product categories, and the evidence needed for Scenarios A–D.

`node scripts/reset-demo.mjs --confirm` is a guarded loader for an explicitly configured Supabase project. `supabase db reset` applies the migration and `supabase/seed.sql` to a disposable local Supabase environment. Neither command removes the permanent mock files. See [Data Imports](docs/DATA_IMPORTS.md) and [Mock Data](docs/MOCK_DATA.md).

## Demo scenarios

- **A — Strategic customer at risk:** Maya Tan has declining activity, two unresolved delivery complaints, negative sentiment, a missed commitment, competitor language, and cancellation language. AVO recommends service recovery before promotion; approval and consent gate the WhatsApp action.
- **B — Growth opportunity:** Ethan Lim has positive sentiment, strong activity, product interest, and an Analytics Suite gap. AVO creates a catalogue-grounded outreach draft for review.
- **C — Segment decline:** the synthetic North / Food & beverage segment crosses configured risk, revenue, frequency, engagement, and shared-objection thresholds. Marketing reviews a source-grounded campaign and schedules it through Demo Publisher.
- **D — Successful recovery:** Omar Aziz has a recorded approved recovery, positive response, new purchase, High-to-Medium risk change, and estimated recovered revenue shown in Analytics.

## Testing

```bash
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm audit
```

Final verification passed:

- **47/47 unit tests** across imports, tier/churn boundaries, AVO safeguards, workflows, scenarios, publisher behavior, mock data, and required Supabase security structure.
- **9/9 production-browser workflows** across all routes/RBAC, AVO Chat, all permanent mock imports, Scenarios A–D, approval and consent bypass attempts, downloads, governance, settings, and audit controls.
- Lint, strict type checking, production build, and dependency audit; the audit reported zero vulnerabilities at verification time.

See [Testing](docs/TESTING.md) and [Final handoff](docs/FINAL_HANDOFF.md).

## Privacy, AI governance, and human decisions

AVO output displays evidence, confidence, uncertainty, and a verification warning. Material recommendations remain drafts until reviewed. Staff may edit drafts; managers approve or reject them; employees explicitly open outreach links or schedule campaigns. AVO cannot approve, execute, change deterministic scores, override consent, invent prices or policies, or publish autonomously.

The Governance screen presents purpose limitation, minimisation, consent, classification, retention review, processing disclosure, data lineage, correction/export/deletion-review requests, and auditability. These are privacy-supporting controls, not a guarantee of compliance with every law. See [AI Governance](docs/AI_GOVERNANCE.md), [Data Governance](docs/DATA_GOVERNANCE.md), and [Privacy](docs/PRIVACY.md).

## How Codex and GPT-5.6 fit

Codex was used to implement and review the application, domain engines, server routes, import parsers, synthetic assets, Supabase schema, test suites, release fixes, and documentation in this development session.

The application’s live AVO adapter targets the OpenAI Responses API with `OPENAI_MODEL=gpt-5.6` by default. Its structured request and validation path are tested, but no external model response is claimed because no API key was available during verification. The verified no-key workflow uses `DemoAVOProvider` and labels its output **AVO Demo Analysis**.

## Limitations and future development

The current demo resets workflow mutations on reload. Live Supabase Auth/persistence/Storage, two-tenant runtime testing, live GPT-5.6 evaluation, credential-tested Buffer publishing/status/retries, persistent tracking analytics, Realtime, automatic campaign-image processing, AI image generation, live WhatsApp/email ingestion, CRM integration, and autonomous outreach are not implemented or verified. Future development should preserve the existing evidence, consent, authorization, approval, and audit boundaries.

For submission-ready copy, use [Devpost Submission](docs/DEVPOST_SUBMISSION.md). For the walkthrough, use the [under-three-minute Demo Script](docs/DEMO_SCRIPT.md).
