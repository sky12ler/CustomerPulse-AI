# P0 acceptance verification

Final verification: 19 July 2026. Application commit `0e7225d4b1208c3196a991bc48184969f96b6b32`; Vercel deployment `dpl_Bz4gAtdCwcV4H497JCwBDq6vDWmK`; production URL https://customer-pulse-ai-eight.vercel.app.

“Production verified” means exercised by Playwright against the public Vercel host. External providers are not marked verified without credentials and an observed provider response.

## Cross-phase P0 matrix

| P0 criterion | Evidence | Status |
| --- | --- | --- |
| Operational imports | Confirmed customers/transactions/conversations mutate Imported Workspace, preserve provenance and recalculate affected customers | Production verified |
| Validated AVO signals | Evidence IDs are checked; stored signals carry confidence and validation status; AVO cannot assign official risk directly | Production + unit verified in Demo mode |
| Dynamic churn | `recalculateCustomers()` invokes the authoritative tier/churn engine after imports, AVO and outcomes; audit stores actual score before/after | Production + unit verified |
| Dynamic alerts | High risk creates; risk change updates; recovery resolves; increase reopens; duplicate active alerts are prevented | Unit verified; update/resolution production verified |
| Changes Requested loop | Reviewer feedback, Draft Revision, content version and resubmission are persisted and audited | Production verified |
| Separate lifecycle transitions | Approval, Start, execution confirmation, customer response and business outcome are distinct permitted transitions | Production + unit verified |
| Outcome recalculation | A stored outcome calls the real churn engine and changes customer/alert/ERAR/analytics state where the evidence changes risk | Production + unit verified |
| Customer deep links | Customer name/View Customer and row mouse/Enter/Space open `/customers/[customerId]` | Production verified |
| Refresh persistence | Customer 360 route, tab and return-to-list query state survive refresh | Production verified |
| Account Executive scope | Aisha Rahman can read assigned customers only across list, route, AVO, actions, export and audit | Production + unit verified |
| Operational list controls | Search, 11 filters, seven sorts, risk-priority default, 10/25/50 pagination and summary counts use current scoped records | Production verified |
| Authoritative ERAR | ERAR-v1 = eligible forecast revenue for next 90 days x normalized churn probability, with source/version/disclaimer | Production + unit verified |
| Dynamic customer metrics | Summary risk/revenue/action metrics update after Omar's outcome and restore after Reset | Production verified |
| Dynamic analytics | Recovery insight and outcome count read current outcomes/churn records; no hard-coded successful recovery is shown before an outcome | Production verified |
| Filtered RBAC export | CSV uses all filtered/sorted scoped results, includes metadata and excludes inaccessible customers | Production verified |
| Demo Reset | Seeded customers/actions/metrics/analytics restore; Imported Workspace remains isolated | Production verified |
| Scenarios A and D | Full governed Maya revision lifecycle and actual Omar recovery lifecycle complete | Production verified |
| Desktop/mobile | Desktop table plus mobile cards/navigation/no-overflow workflows complete | Production verified |
| Before/after audit | Every lifecycle event names old/new state; AVO and outcomes include score old/new values | Production verified |

An unchanged displayed score after recalculation is valid when new evidence does not cross a rounded score boundary. The acceptance check verifies that operational evidence is stored, the authoritative engine runs, and the real before/after values are audited; it does not force a fabricated change.

## Preserved P0 capabilities

- Role persists across pages and refresh.
- Four-stage imports provide RBAC, mapping, preview, validation, explicit confirmation, structured errors, success summary, next links, history and audit.
- Permanent mock CSV, JSON, XLSX, TXT, PDF, DOCX, PNG and JPG paths are parser-tested; required production uploads pass on Vercel.
- Customer 360 exposes transactions, authorized conversations, AVO insights, alerts, actions, campaigns and audit without replacing authoritative calculations.
- AVO displays evidence, confidence and uncertainty, rejects invalid evidence and strips instruction-like message content on the optional live-provider path.
- Consent, role, reviewer-comment, self-approval and approval-before-execution guardrails remain enforced.
- Recommendation -> Retention Action and trigger -> Campaign links select/highlight the exact target.
- Campaign Studio has seven validated steps, persisted versions, consent/source review, separate approval and scheduling gates.
- Demo Publisher creates one shared ScheduledPost per channel; Campaign Calendar and audit use those records.
- Disabled controls explain missing requirements; success panels provide direct next actions.
- Guided Demo Scenarios A and C and responsive mobile navigation remain operational.

## Quality gates

| Gate | Final result |
| --- | --- |
| ESLint | Passed |
| TypeScript | Passed |
| Unit | 109/109 passed across 12 files |
| Local Playwright | 45/45 passed |
| Production Playwright | 45/45 passed in 1.4 minutes |
| Build | Passed locally and on Vercel |
| npm audit | 0 vulnerabilities at low threshold |
| Secret scan | 0 credential-like/private-key matches in the scanned source scope |

## External-service boundary

No OpenAI, Buffer or Supabase credentials were available. Therefore live GPT-5.6 inference, Buffer delivery/status callbacks and remote Supabase Auth/database/RLS are not claimed. `/api/health` confirmed `avoProvider: demo` and `publisher: demo` for the verified release. WhatsApp/email external sending is also not claimed.
