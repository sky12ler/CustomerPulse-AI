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
| Vitest | 18 files, 132/132 passed |
| Local production build | Passed |
| Local Playwright | 47/47 passed against the optimized production server in 39.4 seconds |
| MiMo endpoint | Connected; `mimo-v2.5-pro` returned model output |
| npm audit | 0 vulnerabilities at `--audit-level=high` |
| Secret scan | Passed; `.env.local` ignored/untracked, no credential/private-key match (one known synthetic env assignment in an AVO unit test) |
| Previous Vercel production Playwright | 45/45 passed against the public URL in 2.0 minutes; new project/action-plan changes are not yet deployed or production-tested |
| Production MiMo requests | Chat and structured analysis passed; `mimo-v2.5-pro` returned `Xiaomi MiMo live provider`, `demo: false`, valid evidence IDs and enforced uncertainty |

This table is intentionally conservative and is updated only after each command completes.

## Coverage

The 132 unit tests cover import parsers and both mock packs, project snapshot isolation, the ordered mixed-risk scenario pipeline, tier/churn/ERAR calculations, imported-evidence validation, three-plan-plus-message AVO output, contextual chat answers and Markdown cleanup, MiMo JSON compatibility, prompt-injection stripping, operational mutation, alert idempotency, action transition rules, consent, publisher gates, calculated marketing opportunities/audiences, per-entity persistence and Supabase project/storage schema structure.

The 45 browser workflows cover Imported Workspace import/recalculation, Customers and Customer 360 navigation/access/filter/sort/pagination/export/mobile behavior, Maya’s complete retention workflow, campaign creation/approval/calendar, Omar’s outcome recalculation, guided scenarios and audit chains.

The 47 browser workflows also verify two user-created projects without data mixing, the project data library and original-PDF download, three AVO plans plus a message, Action Plan assignment/manual completion, and automatic overdue status on reload.

## Live-provider interpretation

A populated key or `/api/health` value of `xiaomi-mimo-configured` proves configuration, not inference. A live AVO run is claimed only when the response names Xiaomi MiMo and `demo` is false. If the provider request fails, the route returns an explicitly labelled Demo AVO result plus attempted provider and redacted fallback reason.

## Imported Workspace boundary

Imported Workspace is tested with multiple isolated projects in a browser. Tests verify project creation/switching, upload, mutation, refresh persistence, role-scoped views and export. The Supabase project/file migration is schema-tested locally; this run did not re-test a remote Supabase deployment.

## Production command

After deployment:

```powershell
$env:PLAYWRIGHT_BASE_URL='https://customer-pulse-ai-eight.vercel.app'
npx playwright test --workers=1
```

The deployed Imported Workspace pipeline passed without credentials; no login is part of that walkthrough.

## Secret scan scope

The scan checks tracked/source files for private-key headers, common API-key formats and populated high-risk secret assignments while excluding dependencies, build output, `.git` and ignored local environment files. Also run `git check-ignore .env.local` and verify `.env.local` is not tracked.
