# CustomerPulse AI demo script — under three minutes

Before recording, open the deployed app in a clean browser. Use Demo Workspace and choose Reset Demo Data. Keep MiMo configured; if it fails, show the explicit Demo AVO fallback rather than claiming a live response.

## 0:00–0:20 — The problem and architecture

Open Overview.

Say: “Customer evidence is usually scattered across transactions, conversations and follow-ups. CustomerPulse turns it into one explainable workflow. Deterministic logic owns tier, churn and revenue-at-risk calculations. AVO extracts cited signals and drafts actions. People still approve, execute and record outcomes.”

Point to the active workspace, provider state and current risk/action metrics.

## 0:20–1:25 — Scenario A: customer evidence to governed retention

1. Choose Account Executive, open Customers, select Maya Tan and show Customer 360.
2. Open Conversations and run AVO Analysis. Show cited message IDs, confidence and uncertainty. State whether the result says MiMo live or Demo fallback.
3. Open her dynamic alert and generate the customer-specific recommendation.
4. Submit it. In Retention Actions, show Pending Approval.
5. Choose Sales Manager, add a reviewer comment and Request Changes. Return as Account Executive, Begin Revision, edit and resubmit. Return as Sales Manager and approve with a comment.
6. Return as the action owner: Start Action, Confirm Execution, record the customer response, then record Complaint resolved.
7. Show the recalculated customer risk and Audit history’s before/after transitions.

Say: “Start, execution, response and outcome are separate records. The outcome runs the real risk engine; the demo does not fake a score change.”

## 1:25–2:20 — Scenario C: calculated marketing opportunity

1. Choose Marketing Manager and open Marketing Intelligence.
2. Show “North Food & Beverage decline”: baseline/current evidence, affected customers, confidence, uncertainty and provenance.
3. Open the audience preview. Point out included and excluded customers and the consent/channel exclusion reason.
4. Create the campaign. Show that the brief and audience came from this selected insight—not a navigation default.
5. Move through the seven Campaign Studio steps: brief, audience, sources, generated editable content, review, approval submission and schedule preparation.
6. Switch to a different authorised reviewer, approve with a comment, return to Marketing Manager and schedule through the clearly labelled Demo Publisher.
7. Open Campaign Calendar using the success link. Show the highlighted campaign, working filters and campaign-specific approval history.

## 2:20–2:50 — Real workspace and close

Open the workspace selector.

Say: “The Synthetic Demo Workspace resets safely. The Imported Workspace uses Supabase Auth, assignment-aware row security, per-entity persistence, Realtime refresh and append-only audit logs. Customer filters, analytics and campaigns use those current imported records.”

Show the scenario fixture names under Data Imports or briefly show an imported case if preloaded.

Close: “CustomerPulse is useful beyond a scripted demo: evidence changes operational state; consent and approval block unsafe actions; outcomes feed back into risk and analytics. Demo Publisher does not claim external posting, and live-provider fallback is always visible.”

## Presenter checklist

- Reset Demo Data before recording.
- Use a different user/role for approval.
- Never say Buffer posted externally when Demo Publisher is selected.
- Never say MiMo was live unless the AVO result names the live provider without a fallback reason.
- Never show `.env.local`, Supabase service-role values or API keys.
- If demonstrating Imported Workspace, apply migration 003 and user roles first.
