# P0 acceptance

Verification date: 19 July 2026. “Verified” below means covered by an observed local test or provider response. Remote Supabase and the next Vercel release remain pending until migration/deployment steps are completed.

| P0 criterion | Implementation evidence | Status |
| --- | --- | --- |
| Imports mutate operational data | Confirmed customer/transaction/conversation/product/result imports merge records, retain provenance and recalculate affected entities | Local browser + unit verified |
| Project isolation | User-created project names are dynamic; uploads and all downstream operational state restore independently when projects switch | Unit + browser verified |
| Imported content library | Imported entities/documents are listed per project; raw data/extracted text can be exported and original files downloaded | Browser verified locally |
| AVO creates validated signals | Evidence IDs must resolve to authorised messages; confidence/uncertainty stored; invalid/low evidence is rejected or review-required | Unit + browser verified; MiMo endpoint connected |
| Dynamic churn/ERAR | Authoritative tier/churn engine runs after imports, AVO and outcomes; ERAR-v1 is shared across pages | Unit + browser verified |
| Dynamic alerts | Operational alerts create/update/resolve/reopen idempotently and render consistently in Alert Centre/Customer 360 | Unit + browser verified |
| Customer-specific recommendations | New IDs bind customer, analysis and evidence; no shared REC-001 mapping for new analyses | Browser verified |
| Four AVO choices | Structured output requires exactly three evidence-linked operational plans plus one separate message draft | Unit + browser verified |
| Action Plan feedback loop | Admin selection requires owner/deadline; owner must Start, execute, optionally record response and record outcome; outcome recalculates risk; expired work becomes Not Completed and can be resumed | Unit + browser verified |
| Campaign feedback loop | Aggregate results update analytics only; valid customer-level response/outcome rows recalculate the identified customer and audit before/after | Unit + browser verified |
| Changes Requested loop | Reviewer comment → Draft Revision → new version → resubmission → different-user approval | Browser + unit verified |
| Separate execution lifecycle | Start, execution, customer response and outcome are distinct transitions with role/status guards | Browser + unit verified |
| Outcome recalculation | Stored outcome invokes real recalculation and updates score/alert/metrics/analytics using actual before/after | Browser + unit verified |
| Customer entry and persistence | Semantic links and accessible rows open `/customers/[customerId]`; route/tab survives refresh | Browser verified |
| Customer operations | Scoped search/filter/sort/pagination/metrics/export use current operational records | Browser verified |
| Account Executive scope | Assigned records only across list, direct URL, AVO, actions and export in the browser-local walkthrough | Browser verified |
| Dynamic Marketing Intelligence | Active data is grouped by segment and compared to calculated baseline/current signals; no threshold match yields no insight | Unit + browser verified |
| Consent-safe audience | Inclusion uses selected segment, current consent and channel availability; every exclusion has a reason | Unit + browser verified |
| Correct Campaign Studio context | Navigation shows list/blank; insight creates prefilled campaign; ID opens exact campaign | Browser verified |
| Campaign-specific governance | Versions, approval history, reviewer, scheduling, publish state and results belong to the selected campaign | Browser verified |
| Calendar behavior | Scheduled/published/cancelled events only; working filters; real date/time reschedule; distinct cancellation | Browser verified |
| Honest provider states | MiMo attempted live; fallback names reason; Buffer disabled without credentials; Demo Publisher explicit | Provider + unit/browser verified |
| Honest analytics | Calculated/observed/imported/demo labels reflect the source; campaign results drive observed reporting | Unit + browser verified |
| Approval/consent/audit guards | Role, different-user review, comment/reason, approval-before-execution, consent and append-only audit fields enforced | Unit + browser + schema verified |
| Demo Reset | Original Demo Workspace is restored without deleting Imported Workspace | Browser verified |
| Desktop/mobile | Customer cards, navigation and core workflows work without horizontal overflow | Browser verified |

## Current quality gates

- ESLint: passed.
- TypeScript: passed.
- Vitest: 18 files, 136/136 passed.
- Production build: passed.
- Playwright: 48/48 passed against the optimized local production server.
- MiMo: production OpenAI-compatible requests succeeded with `mimo-v2.5-pro`; browser Scenario B also completed the AVO route during regression.
- npm audit: 0 vulnerabilities at high threshold. Secret scan passed with `.env.local` ignored and untracked. The earlier public Vercel release passed 45/45; the current project/action-plan working tree still requires deployment and a fresh production regression.

## Manual production prerequisites

- Update the three MiMo variables in Vercel to the locally working values.
- Push and redeploy to Vercel.
- Run the production browser regression. No Auth account is required.
