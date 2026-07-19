# Final handoff

Verification date: 20 July 2026 (Asia/Kuala Lumpur).

## Release reference

- Production URL: https://customer-pulse-ai-eight.vercel.app
- Deployed application commit: `127d27d`
- Vercel deployment: `dpl_H8PSSBnyaNon3TMh6sbfxWbA4dH1` (`READY`, production)
- Production MiMo connection: verified against the configured OpenAI-compatible endpoint with model `mimo-v2.5-pro`
- Imported Workspace mode: browser-local by product decision; no login or shared anonymous Supabase access

## Problems found during the user walkthrough and resolution

| Walkthrough problem | Resolution in this release |
| --- | --- |
| Customers were report-only rows | Customer name links, View Customer links, row mouse/Enter/Space navigation and `/customers/[customerId]` Customer 360 |
| No filters, sorting, metrics or pagination | 11 filters, seven sorts, risk-first default, six live metrics, 10/25/50 pagination and result-aware search text |
| Revenue at risk was unexplained/inconsistent | ERAR-v1 is authoritative across pages and exposes base, risk probability, calculation version, time and disclaimer |
| Imported state needed a safe demo boundary | Imported records remain isolated in versioned browser storage; no shared anonymous database is exposed |
| Marketing Intelligence was pre-seeded | Opportunities are grouped and calculated from the active operational customer/transaction/risk data; no threshold match means no manufactured insight |
| Campaign audience totals ignored consent | Audience inclusion/exclusion is recalculated by segment, current consent and selected channel availability; exclusions include reasons |
| Campaign Studio always opened CAM-003 | Navigation opens a campaign list/blank state; an insight opens its own prefilled campaign; an existing campaign opens by ID |
| Pages contradicted one another on risk | Overview, Customers, Customer 360, Alerts and Analytics read the same authoritative operational dataset |
| AVO reused fixed recommendations | Each analysis creates a customer- and analysis-specific recommendation with its own ID and evidence |
| Imported conversations could not validate as AVO evidence | Confirmed imported messages are evidence-bearing; confidence reflects evidence volume, validated signals persist and churn recalculates |
| Ask AVO returned one scripted insufficient-evidence answer | Chat now handles greetings and ordinary questions, queries the active accessible workspace and visibly identifies Xiaomi live output or the operational fallback |
| Alert Centre reconstructed fake fields | It renders operational alerts with stored trigger/evidence, score movement, owner, deadline, ERAR and status |
| Calendar showed non-scheduled drafts and shared history | Only scheduled/published/cancelled records use calendar events; history is campaign-specific; reschedule changes date/time; cancel is distinct; filters operate |
| Decorative controls | Evidence, version comparison, monitor, reassign, approved follow-up, calendar filters, reschedule, cancel, publish and results controls now mutate or reveal stated records |
| Buffer silently became Demo Publisher | Buffer is unavailable/disabled without credentials; Demo Publisher is visibly selected; server rejects misleading publisher requests |
| Analytics mixed fixed claims with observed data | Cards identify calculated, observed, imported-result and synthetic/demo sources; campaign results drive observed metrics when imported |
| Action lifecycle collapsed transitions | Start, execution, customer response and outcome are separate authorised transitions; Changes Requested supports revision/resubmission |
| Outcome did not prove operational change | Recording a valid outcome stores the outcome and runs tier/churn/ERAR/alert/metric/analytics recalculation with before/after audit |

## Completed functionality

- Dynamic import → deterministic signals/tier → AVO signals → churn/ERAR → alerts pipeline.
- Governed recommendation/action approval with requester separation, reviewer comments, rejection/change reasons and consent gates.
- Dynamic segment opportunities, consent-safe campaign audience, seven-step creation, campaign-specific approval, scheduling, publish confirmation and result import.
- Walkthrough-role persistence across both workspaces, with scoped Customers, routes, AVO and exports.
- Operational audit events with actor, role, action, entity, before/after, reason, reviewer and result fields.
- Resettable demo plus a separate refresh-persistent, browser-local Imported Workspace.
- Connected mixed-risk import fixtures under `mock-data/scenarios/`.

## Quality results

| Gate | Latest result |
| --- | --- |
| ESLint | Passed |
| TypeScript | Passed |
| Vitest | 16 files, 125/125 passed |
| Local production build | Passed as part of Playwright runner |
| Local Playwright | 45/45 passed against an optimized production server in 43.7 seconds |
| Xiaomi MiMo endpoint | Connected; `mimo-v2.5-pro` returned output |
| npm audit | 0 vulnerabilities at `--audit-level=low` |
| Secret scan | Passed; `.env.local` ignored/untracked and no real credential/private-key match |
| Vercel production regression | 45/45 passed against the public production URL in 2.1 minutes |
| Production MiMo AVO | Live chat and structured analysis passed: `Xiaomi MiMo live provider`, `demo: false`, model `mimo-v2.5-pro`, valid evidence IDs and enforced uncertainty |

## Required environment variables

Live MiMo AVO:

```text
MIMO_API_KEY=
MIMO_BASE_URL=https://api.xiaomimimo.com/v1
MIMO_MODEL=mimo-v2.5-pro
```

Optional publishing:

```text
BUFFER_API_KEY=
BUFFER_ORGANIZATION_ID=
NEXT_PUBLIC_APP_URL=
```

No variable is required for Synthetic Demo Workspace + Demo AVO + Demo Publisher. Never expose service-role, MiMo or Buffer secrets through `NEXT_PUBLIC_*`.

## Database deployment

No database or Auth account is required for the selected hackathon workflow. Migration 003 has been applied but the public walkthrough does not read or write the shared database anonymously.

## Vercel deployment steps

1. Push the final commit to GitHub.
2. Confirm all environment variables exist for Production in Vercel.
3. Redeploy after future application changes. Deployment `dpl_H8PSSBnyaNon3TMh6sbfxWbA4dH1` currently serves the verified release.
4. Check `/api/health`; “configured” means credentials exist, while a completed AVO response proves live use.
5. Select Imported Workspace, import the connected scenario pack and refresh in the same browser.
6. Run the 45-test Playwright regression against the production URL and record any environment-only failures honestly.

## Walkthrough roles

Use the on-screen selector: Administrator, Sales Manager, Marketing Manager, Account Executive and Auditor. These are synthetic workflow roles, not login accounts.

## Demo scenarios

- A: Maya Tan complaint/cancellation evidence → AVO → customer-specific recommendation → changes/revision → approval → start → execution → response → outcome → risk/audit.
- B: Ethan Lim product-interest evidence → grounded Growth recommendation.
- C: calculated North Food & Beverage opportunity → consent-safe audience → campaign approval → Demo Publisher → calendar → published/results.
- D: Omar Aziz recovery action → separate transitions → purchase outcome → actual recalculation → metrics/analytics → Demo Reset.
- Imported mixed cases: use the three files in `mock-data/scenarios/` to show critical, growth, withdrawn-consent, insufficient-evidence, stable, recovery and unavailable-channel behavior.

## Remaining limitations

- Demo Publisher is an in-app simulator, not social delivery.
- WhatsApp/email are user-initiated links or staff-confirmed transitions; delivery and inbound responses are not integrated.
- Image generation/advanced image processing and CRM sync are not implemented.
- Imported data is device/browser-local and does not synchronize across browsers or users.
- MiMo can still fail because of provider quota, model access or endpoint availability; the application reports the fallback instead of hiding it.
