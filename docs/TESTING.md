# Testing

## Commands

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
npm audit --audit-level=low
```

`npm run test:e2e` builds the optimized application, starts it on an isolated local port, executes Chromium, and stops the server.

## Verified result — 19 July 2026

| Check            | Result                             |
| ---------------- | ---------------------------------- |
| ESLint           | Pass, zero warnings/errors         |
| TypeScript       | Pass                               |
| Vitest           | 12 files, 109/109 pass             |
| Playwright       | 44/44 local production-mode pass   |
| Production build | Pass                               |
| npm audit        | 0 vulnerabilities                  |
| Secret scan      | No real secret/private key matches |

The 109 unit tests validate tier/churn boundaries, consent, evidence integrity, prompt-injection removal, AVO abstention/live request construction, publisher approval/idempotency, Supabase schema controls, and every permanent import: customers.csv, transactions.csv, conversations.csv/JSON, products.csv, campaign-results.csv, four PDFs, and the campaign PNG, plus XLSX/DOCX/TXT and invalid/disguised/oversized cases.

The 13 Phase 2 customer tests plus 26 numbered release tests map directly to the requested acceptance list; four additional tests exercise the complete production A-D workflows: role persistence; Administrator/Sales/Marketing uploads; invalid and successful import states; recommendation/action linkage and query highlighting; self-approval and execution gates; trigger prefill; seven-step validation/draft persistence/approval; ScheduledPost creation/calendar insertion/highlighting; marketing evidence/uncertainty; filter-linked analytics; requester/approver/executor audit; Scenario A and C walkthroughs; mobile; and preserved Scenarios B/D.

## Production verification

Local production-mode success is not production deployment evidence. After each Vercel release, verify `/api/health` reports `workflow-v2` and repeat the three named uploads plus both end-to-end workflows. Record provider mode from health: `avoProvider: demo|openai`, `publisher: demo|buffer`.

## Verified production run

After the GitHub push and authenticated Vercel CLI deployment, Vercel health reported `release: workflow-v2`, `avoProvider: demo`, and `publisher: demo`. The same 31 Playwright tests passed directly against `https://customer-pulse-ai-eight.vercel.app` in 49.7 seconds, including the three required production uploads.

## Phase 1 verification commands

```bash
npm run lint
npm run typecheck
npm test -- --run
npm run test:e2e
npm run build
npm audit --audit-level=moderate
```

The Phase 1 suite includes explicit coverage for the 40 requested import, AVO, alert, revision, lifecycle, recalculation, RBAC, and audit behaviours. Latest local run: 10 unit-test files / 94 tests passed; 31 Playwright tests passed; lint, TypeScript, and production build passed; npm audit reported zero vulnerabilities. The tracked-file secret scan returned no matches.

## Phase 2 verification - 19 July 2026

| Check            | Result                                                              |
| ---------------- | ------------------------------------------------------------------- |
| ESLint           | Pass, zero warnings/errors                                          |
| TypeScript       | Pass                                                                |
| Vitest           | 12 files, 109/109 pass                                              |
| Playwright       | 44/44 pass against local optimized production server                |
| Production build | Pass                                                                |
| npm audit        | 0 vulnerabilities                                                   |
| Secret scan      | No real key/private-key match; one explicit non-secret test fixture |

The 13 Phase 2 Playwright cases cover the requested 40 behaviors through grouped end-to-end assertions: semantic links and View Customer, mouse/Enter/Space rows, refresh/deep tabs/Not Found, URL-backed filter restoration, all filter controls and empty state, metrics/pagination, default and selected sorting with `aria-sort`, ERAR tooltip/details, Account Executive direct-URL/API/export denial, Administrator/Sales Manager scope, Auditor read-only behavior, Overview navigation, mobile cards, and horizontal overflow. The same run also executes the 31 preserved production-acceptance/release tests for imports, retention, marketing, UX, and Scenarios A-D.

Unit additions verify demo assignment and lookup semantics, action scoping, Auditor AVO denial, all seeded ERAR-v1 identities including Maya, formula clamping, reasoned override audit output, default ordering, compatible filters, sort directions, and static Supabase assignment-policy structure.

These results are local production-mode evidence. Public Vercel verification must set `PLAYWRIGHT_BASE_URL=https://customer-pulse-ai-eight.vercel.app` and rerun the relevant suite after deployment; document failures rather than treating local success as production success.

### Phase 2 public production result

Deployment `dpl_4fAFL7gYHYVNC2Kt1XejBaLucY3K`, source commit `5a22d05b759808f4fa97727c85de472257d84c30`: 13/13 Phase 2 Playwright tests passed directly against `https://customer-pulse-ai-eight.vercel.app` in 25.6 seconds. Health returned `status: ok`, `avoProvider: demo`, and `publisher: demo`. This production run covers Customer navigation/deep links, tabs/refresh, filters/sorts/state restoration, pagination, ERAR details, Account Executive URL/API/export denial, manager/admin scope, Auditor read-only behavior, Overview navigation, and mobile overflow. The full current 44-test suite passed locally; only the 13-test Phase 2 file was rerun on this deployment.
