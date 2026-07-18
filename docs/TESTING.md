# Testing

## Commands

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
npm audit --audit-level=high
```

`npm run test:e2e` builds the optimized application, starts it on an isolated local port, executes Chromium, and stops the server.

## Verified result — 18 July 2026

| Check            | Result                             |
| ---------------- | ---------------------------------- |
| ESLint           | Pass, zero warnings/errors         |
| TypeScript       | Pass                               |
| Vitest           | 47/47 pass                         |
| Playwright       | 26/26 pass                         |
| Production build | Pass                               |
| npm audit        | 0 vulnerabilities                  |
| Secret scan      | No real secret/private key matches |

The 47 unit tests validate tier/churn boundaries, consent, evidence integrity, prompt-injection removal, AVO abstention/live request construction, publisher approval/idempotency, Supabase schema controls, and every permanent import: customers.csv, transactions.csv, conversations.csv/JSON, products.csv, campaign-results.csv, four PDFs, and the campaign PNG, plus XLSX/DOCX/TXT and invalid/disguised/oversized cases.

The 26 Playwright tests map directly to the requested acceptance list: role persistence; Administrator/Sales/Marketing uploads; invalid and successful import states; recommendation/action linkage and query highlighting; self-approval and execution gates; trigger prefill; seven-step validation/draft persistence/approval; ScheduledPost creation/calendar insertion/highlighting; marketing evidence/uncertainty; filter-linked analytics; requester/approver/executor audit; Scenario A and C walkthroughs; mobile; and preserved Scenarios B/D.

## Production verification

Local production-mode success is not production deployment evidence. After each Vercel release, verify `/api/health` reports `workflow-v2` and repeat the three named uploads plus both end-to-end workflows. Record provider mode from health: `avoProvider: demo|openai`, `publisher: demo|buffer`.

## Verified production run

After GitHub push, Vercel health reported `release: workflow-v2`, `avoProvider: demo`, and `publisher: demo`. The same 26 Playwright tests passed directly against `https://customer-pulse-ai-eight.vercel.app` in 41.5 seconds, including the three required production uploads.
