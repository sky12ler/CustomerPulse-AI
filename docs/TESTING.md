# Testing

Final regression date: 20 July 2026 (Asia/Kuala Lumpur).

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
| Vitest | 16 files, 125/125 passed |
| Local production build | Passed |
| Local Playwright | 45/45 passed against the optimized production server in 43.7 seconds |
| MiMo endpoint | Connected; `mimo-v2.5-pro` returned model output |
| npm audit | 0 vulnerabilities at `--audit-level=low` |
| Secret scan | Passed; `.env.local` ignored/untracked, no credential/private-key match (one known synthetic env assignment in an AVO unit test) |
| Vercel production Playwright | 45/45 passed against the public URL in 2.0 minutes |
| Production MiMo requests | Chat and structured analysis passed; `mimo-v2.5-pro` returned `Xiaomi MiMo live provider`, `demo: false`, valid evidence IDs and enforced uncertainty |

This table is intentionally conservative and is updated only after each command completes.

## Coverage

The 125 unit tests cover import parsers and mock files, the ordered mixed-risk scenario pipeline, tier/churn/ERAR calculations, imported-evidence validation, contextual AVO chat answers, MiMo JSON compatibility, prompt-injection stripping, operational mutation, alert idempotency, action transition rules, consent, publisher gates, calculated marketing opportunities/audiences, per-entity persistence merge/serialization and optional Supabase schema structure.

The 45 browser workflows cover Imported Workspace import/recalculation, Customers and Customer 360 navigation/access/filter/sort/pagination/export/mobile behavior, Maya’s complete retention workflow, campaign creation/approval/calendar, Omar’s outcome recalculation, guided scenarios and audit chains.

## Live-provider interpretation

A populated key or `/api/health` value of `xiaomi-mimo-configured` proves configuration, not inference. A live AVO run is claimed only when the response names Xiaomi MiMo and `demo` is false. If the provider request fails, the route returns an explicitly labelled Demo AVO result plus attempted provider and redacted fallback reason.

## Imported Workspace boundary

Imported Workspace is tested as an isolated browser dataset. Tests verify upload, mutation, refresh persistence, role-scoped views and export, but do not claim cross-browser or database persistence. Supabase schema tests cover optional future artifacts only.

## Production command

After deployment:

```powershell
$env:PLAYWRIGHT_BASE_URL='https://customer-pulse-ai-eight.vercel.app'
npx playwright test --workers=1
```

The deployed Imported Workspace pipeline passed without credentials; no login is part of that walkthrough.

## Secret scan scope

The scan checks tracked/source files for private-key headers, common API-key formats and populated high-risk secret assignments while excluding dependencies, build output, `.git` and ignored local environment files. Also run `git check-ignore .env.local` and verify `.env.local` is not tracked.
