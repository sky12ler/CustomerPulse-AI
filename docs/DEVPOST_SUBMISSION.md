# Devpost submission

## Project tagline

Turn customer evidence into explainable, human-approved retention and marketing action.

## Concise description

CustomerPulse AI is a governed customer-retention and marketing-intelligence workspace. It combines deterministic customer tiering and hybrid churn scoring with AVO, an evidence-linked assistant that analyses authorised conversations, explains risk, and creates editable recommendations and campaign drafts. Employees verify the evidence, managers approve material actions, and the application enforces consent before outreach or simulated publishing.

## Inspiration

Customer risk signals are often scattered across transactions, complaints, conversations, missed follow-ups, and campaign results. Account teams can discover those signals too late, while marketing teams may see a declining segment without a safe path from evidence to action. We wanted to connect those fragments without turning an AI model into the final decision-maker.

## What it does

- Presents a Customer 360 view with tier, churn risk, revenue at risk, trends, conversations, alerts, actions, campaigns, and source-linked evidence.
- Validates CSV, XLSX, JSON, TXT, PDF, DOCX, PNG, and JPG imports with signature and size checks, previews, column mapping, required-field validation, duplicate detection, error reports, and confirmation.
- Calculates explainable customer tiers and hybrid churn risk using deterministic application logic.
- Runs AVO conversation analysis with evidence IDs, confidence, uncertainty, abstention, and prompt-injection handling.
- Lets staff edit AVO recommendations, provide feedback, and submit actions for human approval.
- Prevents AVO or requesters from self-approving and requires the correct manager role, reviewer comments, rejection reasons, approval before execution, and consent before outreach.
- Detects segment decline and supports a source-grounded campaign workflow through Marketing Manager approval and the clearly simulated Demo Publisher.
- Provides analytics, governance controls, approval timelines, searchable audit records, CSV export, and printable reports.
- Includes four synthetic scenarios and a visible Synthetic Demo Data label.

## How it was built

The application uses Next.js App Router, React, and TypeScript. Domain logic is separated into deterministic tier, churn, consent, segment-trigger, approval, import, AVO-provider, and publisher modules. The server exposes routes for health checks, AVO analysis, file validation, demo-file downloads, publishing, and trackable landing pages.

AVO uses an `AIProvider` interface with `OpenAIProvider` and `DemoAVOProvider`. The live provider constructs a strict structured-output request for the OpenAI Responses API, validates the response with Zod, and rejects evidence IDs that are not present in the source messages. The demo provider keeps the application usable without credentials and labels every result **AVO Demo Analysis**.

Publishing uses a `SocialPublisher` interface with `BufferPublisher` and `DemoSocialPublisher`. The verified demonstration uses the Demo Publisher, which enforces approval and idempotency and labels the result as simulated. The Buffer adapter is implemented but was not credential-tested.

A normalized Supabase PostgreSQL migration, RLS policies, seed SQL, and a guarded reset loader are included. The verified no-credential application path uses in-memory session state; the UI is not connected to live Supabase persistence.

## How Codex was used

Codex was the primary development environment for the application. It was used to inspect and structure the repository, implement the Next.js interface and server routes, build deterministic domain engines and provider abstractions, generate synthetic fixtures and source documents, create the Supabase schema and reset tooling, diagnose production-only PDF parsing and UI state defects, expand Vitest and Playwright coverage, run the release checks, and produce the technical and submission documentation.

## How GPT-5.6 was used

The application contains a server-side `OpenAIProvider` for the Responses API with `OPENAI_MODEL` defaulting to `gpt-5.6`. It requests a strict JSON schema for conversation analysis, then applies Zod and evidence-ID validation before returning output to the UI. The live request contract was verified with an injected test transport. No external GPT-5.6 call is claimed because an API key was not available; the deployed no-key path uses the explicitly labelled deterministic `DemoAVOProvider`.

## Challenges encountered

- Keeping AI assistance separate from deterministic tiering, churn scoring, consent, commercial facts, approval, and execution.
- Making fallback behavior useful while never presenting deterministic demo output as GPT-5.6 output.
- Validating heterogeneous spreadsheet, document, and image imports through one governed workflow.
- Preserving evidence integrity and treating customer-message instructions as untrusted content.
- Enforcing approval and consent across both customer outreach and campaign scheduling.
- Fixing PDF extraction that passed unit tests but initially failed in the optimized production server.
- Fixing recommendation-local state that did not refresh when switching from one customer recommendation to another.

## Accomplishments

- Completed a responsive 15-route operational demo with five role views.
- Created 30 fully synthetic customers and four end-to-end scenarios covering strategic risk, growth opportunity, segment decline, and successful recovery.
- Kept all required mock imports and grounding assets permanently downloadable and verified all 11 uploadable files through the production import route.
- Implemented evidence validation, abstention, prompt-injection handling, editable drafts, correction feedback, approval separation, consent enforcement, and auditable workflow events.
- Passed 47 unit tests, 9 production-browser workflows, linting, strict type checking, the production build, and a dependency audit with zero reported vulnerabilities at verification time.

## What we learned

Useful AI workflow design depends as much on boundaries as generation. Deterministic calculations should remain inspectable, AI claims need resolvable evidence, and material actions need explicit human ownership. A transparent fallback is more trustworthy than implying that a model or external service ran when it did not. Production-browser testing also found failures that unit tests alone did not reveal.

## Future development

- Connect the UI to Supabase Authentication, PostgreSQL persistence, Storage, and live two-tenant RLS testing.
- Credential-test and complete live Buffer channel discovery, publishing, status retrieval, failure recording, and controlled retries.
- Run and evaluate live GPT-5.6 analysis when an API key is available.
- Add Supabase Realtime where it improves approvals and operational status.
- Add persistent tracking-link analytics and richer outcome reporting.
- Add optional campaign image generation, crop suggestions, and platform resizing behind feature flags.
- Explore live communication and CRM connectors only with appropriate consent, security, and approval controls.

## Built with

- Codex
- Next.js App Router
- React
- TypeScript
- OpenAI Responses API adapter
- GPT-5.6 model configuration
- Zod
- Supabase PostgreSQL migration, RLS, Auth/Storage SDKs, and seed tooling
- Buffer GraphQL adapter and Demo Publisher
- Recharts
- ExcelJS
- Mammoth
- pdf-parse
- Papa Parse
- Vitest
- Playwright
- ESLint
- Vercel

## Verified limitations

- The demonstrated AVO path is deterministic **AVO Demo Analysis**, not a live GPT-5.6 response.
- Campaign scheduling is simulated by Demo Publisher; no live Buffer publication is claimed.
- Workflow mutations use in-memory session state and reset on reload; the UI does not yet persist to Supabase.
- WhatsApp and email use user-initiated deep links; the application does not automatically send private messages.
- Audit CSV and browser Print/Save as PDF are available; a server-generated audit PDF is not implemented.
- Image generation, automatic cropping, and platform resizing are not implemented.

## Devpost submission checklist

- [ ] Confirm the public GitHub repository contains the final verified commits.
- [ ] Add the deployed Vercel URL.
- [ ] Verify `/api/health` on the deployed URL.
- [ ] Run the deployed smoke test: import, AVO Demo Analysis, approval, consent block, WhatsApp link, campaign approval, Demo Publisher, analytics, and audit export.
- [ ] Record and upload a demonstration video under three minutes using `docs/DEMO_SCRIPT.md`.
- [ ] Add the project tagline and concise description.
- [ ] Add the inspiration, implementation, challenges, accomplishments, learning, and future-development sections.
- [ ] Add the built-with technologies, using “adapter” or “demo” qualifiers where shown above.
- [ ] Copy this Codex conversation's Session ID from the Codex app and add it to the required Devpost field.
- [ ] Add screenshots that visibly retain the Synthetic Demo Data and AVO Demo Analysis labels.
- [ ] State that actions remain human-approved and that private messages are not auto-sent.
- [ ] Do not claim live GPT-5.6, Buffer publishing, or Supabase persistence unless each is separately credential-tested.
- [ ] Review the final submission for secrets, private customer data, unsupported metrics, and placeholder URLs.
