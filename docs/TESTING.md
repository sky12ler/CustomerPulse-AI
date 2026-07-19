# Testing

Final regression date: 19 July 2026 (Asia/Kuala Lumpur).

## Commands

```powershell
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
npm audit --audit-level=low
```

`npm run test:e2e` builds the optimized app, starts it on an isolated port, runs Chromium with a fresh browser context and stops the server.

## Latest observed results

| Check | Result |
| --- | --- |
| ESLint | Passed, zero errors |
| TypeScript | Passed with `tsc --noEmit` |
| Vitest | 14 files, 118/118 passed |
| Local production build | Passed |
| Local Playwright | 45/45 passed against the optimized production server in 35.3 seconds |
| MiMo endpoint | Connected; `mimo-v2.5` returned model output |
| npm audit | 0 vulnerabilities at `--audit-level=low` |
| Secret scan | Passed; `.env.local` ignored/untracked, no credential/private-key match (one known synthetic env assignment in an AVO unit test) |
| Vercel production Playwright | 44/45 passed in 1.4 minutes; unauthenticated Imported Workspace AVO correctly returned 401 |
| Production MiMo request | Xiaomi attempted, then explicit Demo fallback; provider returned `401 Invalid API Key` |

This table is intentionally conservative and is updated only after each command completes.

## Coverage

The 118 unit tests cover import parsers and mock files, connected scenario fixtures, tier/churn/ERAR calculations, evidence validation, prompt-injection stripping, operational mutation, alert idempotency, action transition rules, consent, publisher gates, calculated marketing opportunities/audiences, per-entity persistence merge/serialization and required Supabase RLS/audit structure.

The 45 browser workflows cover Imported Workspace import/recalculation, Customers and Customer 360 navigation/access/filter/sort/pagination/export/mobile behavior, Maya’s complete retention workflow, campaign creation/approval/calendar, Omar’s outcome recalculation, guided scenarios and audit chains.

## Live-provider interpretation

A populated key or `/api/health` value of `xiaomi-mimo-configured` proves configuration, not inference. A live AVO run is claimed only when the response names Xiaomi MiMo and `demo` is false. If the provider request fails, the route returns an explicitly labelled Demo AVO result plus attempted provider and redacted fallback reason.

## Supabase verification boundary

Local schema tests verify the migration text and access invariants. Remote persistence requires migration 003 and Auth roles on the linked Supabase project. After applying them, verify with two real accounts: an administrator can import and an Account Executive can read only customers assigned to that profile. Refresh and a second tab must show the same Imported Workspace records.

## Production command

After deployment:

```powershell
$env:E2E_SUPABASE_ADMIN_EMAIL='<test administrator email>'
$env:E2E_SUPABASE_ADMIN_PASSWORD='<test administrator password>'
$env:PLAYWRIGHT_BASE_URL='https://customer-pulse-ai-eight.vercel.app'
npx playwright test --workers=1
```

The two test credentials remain local shell variables; do not commit them or add them to Vercel. The authenticated administrator is used only by the Imported Workspace cross-phase test. Without them, that production test must and does receive 401 from imported AVO.

The deployed regression is not reported as 45/45: the imported AVO test requires a real Supabase Auth session. Its unauthenticated 401 is a security success, but not evidence of the authenticated workflow.

## Secret scan scope

The scan checks tracked/source files for private-key headers, common API-key formats and populated high-risk secret assignments while excluding dependencies, build output, `.git` and ignored local environment files. Also run `git check-ignore .env.local` and verify `.env.local` is not tracked.
