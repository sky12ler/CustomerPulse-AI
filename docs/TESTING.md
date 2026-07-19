# Testing

Final regression date: 19 July 2026 (Asia/Kuala Lumpur).

## Commands

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
npm audit --audit-level=low
```

`npm run test:e2e` builds the optimized application, starts it on an isolated local port, runs Chromium and stops the server. To test an existing deployment without starting a local server in PowerShell:

```powershell
$env:PLAYWRIGHT_BASE_URL='https://customer-pulse-ai-eight.vercel.app'
npx playwright test --workers=1
```

## Final results

| Check | Result |
| --- | --- |
| ESLint | Passed, zero errors |
| TypeScript | Passed with `tsc --noEmit` |
| Vitest | 12 files, 109/109 tests passed |
| Local Playwright | 45/45 passed against the optimized production server in 32.1 seconds |
| Production Playwright | 45/45 passed against public Vercel in 1.4 minutes |
| Local production build | Passed |
| Vercel production build | Passed; deployment Ready |
| npm audit | 0 vulnerabilities at `--audit-level=low` |
| Secret scan | 0 credential-like/private-key matches in source scope |

Production reference:

- URL: https://customer-pulse-ai-eight.vercel.app
- Application commit: `0e7225d4b1208c3196a991bc48184969f96b6b32`
- Deployment: `dpl_Bz4gAtdCwcV4H497JCwBDq6vDWmK`
- Health: `workflow-v2`, Demo AVO, Demo Publisher

## Coverage map

The 109 unit tests cover:

- permanent mock imports and CSV/JSON/XLSX/TXT/PDF/DOCX/image validation paths;
- deterministic tier/churn boundaries, score changes and ERAR-v1;
- operational import mutation, provenance, idempotency and affected-customer recalculation;
- evidence validation and AVO signal validation/review status;
- alert create/update/resolve/reopen and duplicate prevention;
- Changes Requested, approval, Start, execution, response, outcome and audit transition rules;
- real outcome recalculation plus response/outcome analytics source records;
- consent, provider abstention, prompt-injection removal, publisher approval/idempotency;
- customer assignment scope, export selectors and Supabase migration/RLS structure.

The 45 browser tests comprise:

- 1 cross-phase Imported Workspace pipeline test;
- 13 Customer/Customer 360 Phase 2 tests;
- 5 production acceptance workflows covering imports, Maya retention, marketing, UX and Omar dynamic recovery/reset;
- 26 numbered release tests covering roles, uploads, validation, recommendation/action linking, approval/execution gates, campaigns, analytics, audit, guided scenarios and mobile.

## Important interpretation

“Dynamic recalculation” means the underlying operational record changes or the authoritative engine runs against newly stored data and writes the actual result. A rounded risk score is not forced to change when evidence weight is insufficient. Tests inspect persisted operational signals and before/after audit values rather than asserting a fabricated score movement.

The production run used a clean browser context per test. Browser localStorage is the verified persistence layer, so production results do not prove cross-device, multi-user or database persistence.

## Security scan scope

The final regex scan excluded dependencies, build output, `.git`, ignored `.env*` files and `package-lock.json`, and searched source files for private-key headers, OpenAI-style keys and populated high-risk application secret assignments. It returned zero matches. Real environment values were not printed.

## External modes not tested

No API credentials were available. Live OpenAI/GPT-5.6, Buffer publishing/callbacks and remote Supabase behavior were not exercised. The verified health modes were `avoProvider: demo` and `publisher: demo`.
