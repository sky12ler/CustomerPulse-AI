# CustomerPulse AI final demo script - under three minutes

Use https://customer-pulse-ai-eight.vercel.app in a fresh browser profile. No credentials are required. If the browser has prior state, select Administrator and choose Reset Demo Data.

## 0:00-0:20 - Explain the system

Open Overview.

Say: “CustomerPulse AI turns authorized customer evidence into explainable retention action. Deterministic logic owns tier, churn and revenue-at-risk calculations; AVO supplies evidence-linked signals and editable drafts; staff approval, consent and audit remain in control.”

Point out the Demo Workspace label, persisted Demo account selector and guided scenarios.

## 0:20-1:35 - Scenario A: evidence to governed recovery

1. Select Account Executive, open Conversations and choose Maya Tan.
2. Run AVO Analysis. Show message evidence IDs, confidence, uncertainty and the Demo AVO label. Explain that AVO creates validated signals but does not write the official churn score.
3. Open the recommendation, edit the draft and Submit for Approval. Follow the success link to the highlighted Pending Approval action.
4. Select Sales Manager, add a reviewer comment and choose Request Changes.
5. Return to Account Executive, Begin Revision, edit and resubmit. Select Sales Manager, add a new comment and Approve.
6. Return to Account Executive. Choose Start Action, then Confirm Execution. Show that Approved and Ready, In Progress and Waiting for Customer are separate states.
7. Record Maya's customer response. Show Outcome Required, select Complaint resolved, add notes and record the outcome.
8. Open Audit Reports and point to the named state before/after chain and score before/after value.

## 1:35-2:25 - Scenario D: actual recalculation, metrics and reset

1. Select Administrator and Reset Demo Data. Open Customers and search Omar Aziz. Point out his current High alert, score and page summary values.
2. Open Retention Actions and select ACT-024. Start Action, Confirm Execution, record a positive customer response, then record Purchase completed with supporting notes.
3. Return to Customers. Show Omar's changed stored score/monitored state and the updated risk or revenue summary.
4. Open Analytics. The card now says Successful recovery and shows the recorded outcome plus current calculated risk. Explain that before the outcome it says Recovery monitoring; the card is no longer a hard-coded success.
5. Choose Reset Demo Data and show that the original customer metrics, ACT-024 state and Recovery monitoring card return.

## 2:25-2:50 - Customer operations and controls

Open Customers. Demonstrate a risk filter, a sort and pagination. Open a customer through the name link and refresh Customer 360. Select Account Executive and explain that Aisha Rahman can access assigned customers only; scoped exports follow the same live filters and authorization.

Close: “The deployed no-key mode was verified end to end. Demo AVO and Demo Publisher work without credentials; live OpenAI, Buffer, Supabase and external messaging are optional integrations and are not claimed as tested.”

## Presenter fallback

- If live OpenAI is unavailable, continue with the verified Demo AVO path.
- If Buffer is unavailable, use Demo Publisher; it creates in-app ScheduledPost records but does not post externally.
- If an upload is shown, use the bundled `customers.csv`, `transactions.csv`, `conversations.csv` or `product-catalogue.pdf`, complete preview/confirmation and only claim success after the summary appears.
- If the state is unexpected, select Administrator and Reset Demo Data. Reset restores Demo Workspace; Imported Workspace remains separate.
