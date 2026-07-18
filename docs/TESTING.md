# Testing

Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, then install Chromium with `npx playwright install chromium` and run `npm run test:e2e`. Unit tests cover import assets, tier/risk boundaries, hybrid scoring, evidence integrity, prompt injection, abstention preconditions, consent, WhatsApp encoding, segment decline, publisher approval and idempotency.

The Playwright flow covers Overview -> Conversation -> AVO analysis/evidence -> manager approval -> segment trigger -> campaign studio -> audit. Connected Supabase deployments should additionally test RLS using two organisations and every role.
