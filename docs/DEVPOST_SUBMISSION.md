# Devpost submission

## 1. Tagline

Turn customer evidence into explainable, human-approved retention and marketing action.

## 2. Concise description

CustomerPulse AI is a governed customer-retention and marketing workspace. It combines imported customer, transaction and authorised-conversation evidence; deterministic tier, churn and revenue-at-risk calculations; evidence-linked AVO analysis; and human approval, consent and audit controls. Outcomes feed back into the operational record instead of ending as a static recommendation.

## 3. Inspiration

Risk signals are often fragmented across purchases, complaints, conversations and missed follow-ups. Teams can discover churn too late, while marketing may act on an unexplained segment label or an unsafe audience count. We wanted one usable path from evidence to governed action without making an AI model the final decision-maker.

## 4. What it does

- Imports and validates operational data, then recalculates customer tier, hybrid churn risk, ERAR-v1 and alerts.
- Gives staff an accessible Customer 360 with current evidence, conversations, alerts, recommendations, actions and audit history.
- Uses AVO to analyse authorised conversations with source message IDs, confidence and uncertainty, and creates a customer-specific editable recommendation.
- Enforces changes/revision, different-user approval, separate execution states, consent checks and outcome recording.
- Calculates segment opportunities from current data and creates consent/channel-filtered campaign audiences.
- Supports a seven-step campaign, campaign-specific approval/history, Demo Publisher scheduling, calendar management, publish confirmation and imported results.
- Provides a resettable synthetic Demo Workspace and a separate browser-local Imported Workspace driven by the judge’s uploads, without login.

## 5. How it was built

The UI and server use Next.js App Router, React and strict TypeScript. Domain modules isolate import validation, deterministic tier/churn/ERAR, alerts, marketing calculations, approvals, AVO providers and publishers. Imported records remain isolated in versioned browser storage. The AVO route accepts the current browser’s selected customer evidence, validates the structured result and labels any fallback explicitly.

## 6. How Codex was used

Codex was used to inspect and evolve the existing repository; implement the customer, retention, marketing, Supabase and provider changes; generate connected synthetic fixtures; diagnose cross-page contradictions and production-browser failures; build unit and Playwright coverage; run quality/security gates; and maintain the handoff and submission documentation.

## 7. How GPT-5.6 was used

GPT-5.6 powered the Codex development work in this session. The application runtime does not claim GPT-5.6 inference: its configured live provider is Xiaomi MiMo through an OpenAI-compatible Responses API. When MiMo is unavailable, the deterministic Demo AVO fallback is shown with the attempted provider and reason.

## 8. Challenges

- Replacing seeded conclusions with calculations that still produce a clear demo story.
- Keeping one authoritative risk/ERAR record across Overview, Customers, Alerts and Analytics.
- Calculating audiences without accidentally including withdrawn consent or missing channel details.
- Separating AI assistance from scoring, approval, execution and communication.
- Persisting a complex workflow across users while enforcing assignment-aware RLS.
- Finding accessibility and state-timing defects that appeared only in full Playwright workflows.

## 9. Accomplishments

- Converted the marketing workflow from a pre-seeded conclusion into calculated opportunities and audiences.
- Converted new recommendations into customer/analysis-specific records.
- Implemented a full retention feedback loop in which recorded outcomes run the real risk engine.
- Added a complete upload-driven Imported Workspace pipeline with operational audit history and no login dependency.
- Built connected mixed-risk upload cases covering risk, growth, privacy, abstention, stability and recovery.
- Reached a verified local baseline of 125 unit tests; final browser/security/production counts are copied from `docs/TESTING.md` only after completion.

## 10. What we learned

Trustworthy AI products need visible boundaries. Evidence must be resolvable, calculation ownership must be clear, provider fallback must be honest, and approval/consent cannot be decorative. A useful workflow also needs feedback: an outcome should update the operational state and future decisions, not merely add a success message.

## 11. Future development

- Credential-test Buffer publishing, delivery status and controlled retries.
- Add real WhatsApp/email ingestion and delivery only with appropriate consent and provider governance.
- Add CRM connectors, scheduled monitoring and stronger multi-tenant operational testing.
- Add optional campaign image generation and platform-aware image processing.
- Replace the JSONB operational adapter with fully normalised domain writes when scale/reporting needs justify the migration.

## 12. Built with

Codex, GPT-5.6 (development), Next.js App Router, React, TypeScript, Xiaomi MiMo OpenAI-compatible API, Zod, browser localStorage, Supabase schema artifacts, Demo Publisher, Buffer adapter, Recharts, ExcelJS, Papa Parse, pdf-parse, Mammoth, Vitest, Playwright, ESLint, GitHub and Vercel.

## 13. Demo

Use the under-three-minute script in `docs/DEMO_SCRIPT.md`. It demonstrates Maya’s complete governed retention flow, a calculated and consent-safe marketing campaign, and the real Imported Workspace architecture without claiming unverified external delivery.

## Devpost checklist

- [ ] Push the final reviewed commit to the public GitHub repository.
- [ ] Redeploy Vercel with the verified MiMo variables.
- [ ] Run the deployed 45-test regression and copy only observed results into the handoff.
- [ ] Verify `/api/health` and one AVO result’s actual provider/fallback label.
- [ ] Record a video under three minutes using `docs/DEMO_SCRIPT.md`.
- [ ] Add production URL, repository URL, screenshots and video URL.
- [ ] Copy the tagline, description, inspiration, build, challenges, accomplishments, learning and future sections from this file.
- [ ] Use accurate qualifiers: “Demo Publisher,” “MiMo live” only when returned live, and “browser-local Imported Workspace.”
- [ ] Do not claim Buffer/social delivery, WhatsApp/email delivery, CRM sync, image generation or legal certification.
- [ ] Confirm `.env.local` is ignored and no key is present in Git history/diff.
- [ ] Complete any hackathon-specific Codex session field in the Codex app; the application repository does not generate a Codex Session ID.
