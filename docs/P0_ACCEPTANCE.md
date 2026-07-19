# P0 acceptance verification

Verified 19 July 2026. “Browser verified” means exercised with Playwright against an optimized Next.js server. “Unit verified” means executed with Vitest. External services are not marked verified without credentials and a live response.

| Acceptance criterion                       | Evidence                                                                                                | Status                                             |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Role remains selected across pages/refresh | Shared localStorage state, immediate navigation filtering, Playwright 1                                 | Browser verified                                   |
| Authorized production-compatible uploads   | Four-stage wizard, type RBAC, lazy parser runtimes; Playwright 2–4; all mock imports unit-tested        | Production browser + unit verified                 |
| Understandable upload errors               | JSON content-type guard, structured 422 result display, field/row errors and error export; Playwright 5 | Browser verified                                   |
| Import success and next steps              | Persistent Import History, counts, audit, contextual route; Playwright 6                                | Browser verified                                   |
| Recommendation visibly creates action      | Shared linked models, duplicate prevention, `/actions?actionId=ACT-021`; Playwright 7–8                 | Browser verified                                   |
| Retention Actions operational queue        | Summary, ten tabs, filters, full rows/details and every requested status                                | Browser verified                                   |
| Approval owner/status clarity              | Requester/approver/timestamp/history shown; comment and rejection reason enforced                       | Browser verified                                   |
| Self-approval blocked                      | Synchronous domain guard; Playwright 9                                                                  | Browser verified                                   |
| Approval separate from execution           | Approved/Ready transition; execution control appears only after approval; Playwright 10–11              | Browser verified                                   |
| Outcome recorded separately                | Response/outcome required; Completed transition and recalculation audit                                 | Browser verified in implementation and state tests |
| Marketing actionable insight               | 11 requested sections, filters, affected customers, evidence, avoid, confidence/uncertainty             | Browser verified (Playwright 19)                   |
| Analytics management insights              | Nine requested management categories plus Scenario D; filter-linked KPIs/table                          | Browser verified (Playwright 20, 26)               |
| True seven-step campaign wizard            | Per-step content/validation/back/save/continue; localStorage draft                                      | Browser verified (Playwright 12–15)                |
| Disabled actions explain why               | Inline missing-requirement text and titles across import/actions/campaign                               | Browser verified                                   |
| Campaign approval required                 | Reviewer role/comment/self-approval and publisher approval gate                                         | Browser + unit verified                            |
| Scheduled campaign enters calendar         | One ScheduledPost per channel, shared store, publisher IDs and audit                                    | Browser verified (Playwright 16–18)                |
| Cross-page workflow links                  | Query IDs select/highlight customer/recommendation/action/campaign/calendar records                     | Browser verified                                   |
| Shared persistent state                    | One store for customer and marketing chains, role and walkthrough                                       | Browser verified                                   |
| Complete audit chain                       | Submission, approval, execution and schedule events preserve actors                                     | Browser verified (Playwright 21)                   |
| Guided walkthrough                         | Non-blocking persisted Scenario A/C panel with outcomes and next routes                                 | Browser verified (Playwright 22–23)                |
| Desktop/mobile smooth                      | Responsive stepper, tables, navigation and walkthrough                                                  | Browser verified (Playwright 24)                   |
| Tests/build/security                       | Lint, typecheck, 47 unit, 30 Playwright, build, audit, secret scan                                      | Passed                                             |

## Preserved original P0

Deterministic tiering, hybrid churn scoring, AVO Analysis and Chat, evidence/confidence/uncertainty, consent controls, approval controls, audit logging, permanent mock data, RBAC, Demo AVO fallback, Demo Publisher, optional OpenAI/Buffer adapters, Supabase migration/RLS/reset artifacts, Customer 360, alerts, governance, and all four original demo scenarios remain present. All permanent mock import assets validate in unit tests.

## External-service caveats

No OpenAI, Buffer, or Supabase credentials were available. Therefore live GPT-5.6 responses, Buffer delivery, and remote Supabase deployment are not claimed. Demo AVO and Demo Publisher are verified and explicitly labelled. The pushed Vercel `workflow-v2` release was observed and all 30 Playwright tests passed against the public production URL.

## Phase 1 acceptance verification

Passed locally on 2026-07-19:

- Confirmed imports update operational data and recalculate only affected customers.
- Transaction changes update tier, churn, revenue at risk, and alerts.
- AVO evidence validation creates official signals without allowing AVO to set the score.
- Alerts create, update, resolve, and reopen idempotently.
- Demo and Imported Workspaces are isolated and persisted; Demo reset preserves imported records.
- Changes Requested supports versioned revision and resubmission.
- Approval, start, execution confirmation, responses, outcomes, and recalculation are separate.
- Waiting for Customer and Outcome Required are reachable.
- Analytics reads current customers, actions, signals, responses, and outcomes.
- RBAC, manager approval, self-approval protection, consent checks, and audit events remain enforced.
- Credential-free demo requires no upload.

Not part of the verified Phase 1 acceptance: background scheduling, ZIP bundle import, or credentialed external providers.

## Phase 2 customer acceptance

| Criterion                        | Verified evidence                                                                                 | Status                                      |
| -------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Deep links and refresh           | `/customers/[customerId]`, URL tab state, Not Found/Access Denied, refresh tests                  | Local browser verified                      |
| Semantic and keyboard navigation | Name anchors, View Customer, row mouse/Enter/Space, focus styles, Overview link                   | Local browser verified                      |
| Account Executive assignment     | Aisha-only provider/lookup/routes/conversations/alerts/recommendations/actions/AVO/export/audit   | Unit + local browser verified               |
| Search/filter URL state          | Explicit search label/clear/Escape, dynamic counts, 11 filters, chips, encoded query state        | Local browser verified                      |
| Sorting and priority             | Seven accessible sortable fields, `aria-sort`, Critical-to-Low default ordering                   | Unit + local browser verified               |
| Summary and pagination           | Six filtered/scoped metrics, quick filters, 10/25/50, range/page/empty state                      | Local browser verified                      |
| ERAR-v1                          | 90-day base x normalized churn probability; all seeds and Maya consistency; override reason/audit | Unit + local browser verified               |
| Operational table/export         | alerts/actions/deadlines/status detail; complete filtered/sorted scoped CSV with metadata         | Local browser verified                      |
| Responsive/accessibility         | desktop table, tablet column reduction, mobile cards, labels/text/focus, no page overflow         | Local browser verified                      |
| Supabase assignment design       | follow-up migration removes permissive customer reads and adds assignment-aware policies          | Static unit verified; not remotely deployed |
| Quality gates                    | lint, TypeScript, 109 unit, 44 Playwright, build, audit, secret scan                              | Local passed                                |

No Phase 2 production result is claimed until the public Vercel deployment is tested directly.
