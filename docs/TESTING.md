# Testing

Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, then install Chromium with `npx playwright install chromium` and run `npm run test:e2e`. Unit tests cover import assets, tier/risk boundaries, hybrid scoring, evidence integrity, prompt injection, abstention preconditions, consent, WhatsApp encoding, segment decline, publisher approval and idempotency.

The production Playwright suite contains nine workflows: all 15 routes and RBAC; all 11 permanent mock imports; Scenarios A, B, C and D; consent/approval bypass attempts; and downloads, filters, governance, settings and audit controls. The unit suite contains 47 tests, including DOCX/PDF/XLSX parsing and static verification of all required Supabase tables, tenant RLS, immutable audit policy, approval separation and schedule idempotency. Connected Supabase deployments should additionally test RLS using two organisations and every role.
