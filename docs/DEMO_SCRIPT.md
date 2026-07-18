# CustomerPulse AI demo script

Target duration: **2 minutes 55 seconds**. This walkthrough uses the deployed no-credential experience, so AVO output must remain visibly labelled **AVO Demo Analysis** and campaign scheduling must remain visibly labelled **Demo Publisher / simulated**.

## Before recording

- Open the deployed application in a clean browser tab at `/overview`.
- Keep browser zoom at a level where the navigation and evidence panels are readable.
- Start with the **Administrator** demo account.
- Do not reload after beginning the approval workflow because verified demo mutations are stored in session memory.
- Have the GitHub repository and `/api/health` URL available only as backup; they are not needed in the main three-minute recording.

## 0:00–0:15 — Problem and overview

**On screen:** Overview.

**Say:** “CustomerPulse AI turns fragmented customer conversations and behavioural signals into explainable retention and marketing actions. This is fully synthetic demo data, and AVO supports staff decisions rather than making final decisions.”

Point to the visible risk, revenue-at-risk, priority, and Synthetic Demo Data indicators.

## 0:15–0:35 — Governed data import

**On screen:** Data Imports.

Download `customers.csv`, then show the permanent PDFs and campaign asset. Briefly select the downloaded customer file and advance through preview/mapping and validation.

**Say:** “Authorised staff can download the permanent fixtures or import CSV, XLSX, JSON, text, PDF, DOCX, and image files. The server checks file signatures and size, previews content, supports column mapping, validates required fields, detects duplicates, produces error reports, and requires confirmation.”

Do not wait to confirm every file during the video; all 11 uploadable fixtures are covered by the automated production-browser test.

## 0:35–1:10 — Scenario A and AVO evidence

**On screen:** Conversations → Maya Tan. Switch to **Account Executive** if needed.

Run **AVO Analysis**. Show:

- Critical risk and deterministic score
- negative sentiment and cancellation language
- unresolved delivery issues
- missed follow-up
- evidence IDs `MSG-A-101`, `MSG-A-103`, and `MSG-A-104`
- confidence and uncertainty

**Say:** “Maya is a Strategic customer with declining behaviour, two unresolved delivery complaints, and a missed commitment. AVO links its explanation to real message IDs. The churn score itself is deterministic, and this no-key result is clearly labelled AVO Demo Analysis.”

Click **Generate AVO Recommendation**.

## 1:10–1:40 — Human approval and customer outreach

**On screen:** Recommendations.

Open Maya’s recommendation, edit a few words in the customer draft, and click **Submit for approval**. Open Retention Actions, switch to **Sales Manager**, enter a reviewer comment, and approve.

Open the approved WhatsApp link, then return to the application without sending a message.

**Say:** “AVO recommends resolving the complaint before any promotion. Staff can edit the draft, but it remains pending until an authorised manager reviews it. Consent and approval are checked before WhatsApp or email is enabled, and CustomerPulse never auto-sends private messages.”

## 1:40–2:10 — Scenario C and grounded campaign

**On screen:** Marketing Intelligence.

Open the North / Food & beverage trigger and show the affected customer list, revenue decline, frequency decline, engagement decline, and shared price objections. Continue to Campaign Studio.

Select the product catalogue and marketing guidelines, then generate the brief and channel variants.

**Say:** “CustomerPulse also detects segment-level decline. This synthetic segment crosses the configured thresholds and shares price objections. The campaign proposal is grounded in selected uploaded documents and produces reviewable LinkedIn, Instagram, Facebook, email, WhatsApp, hashtag, call-to-action, and landing-page copy.”

## 2:10–2:35 — Campaign approval and simulated scheduling

**On screen:** Campaign Studio. Switch to **Marketing Manager**.

Submit the campaign, enter a reviewer comment, approve it, and schedule it.

**Say:** “AVO cannot approve or publish its own campaign. A Marketing Manager reviews the factual claims and approves the final version. With no Buffer credentials, the verified Demo Publisher completes the workflow and labels the schedule as simulated.”

Briefly open Campaign Calendar to show the scheduled state.

## 2:35–2:55 — Recovery, governance, and audit

**On screen:** Analytics → Audit Reports.

Show Omar Aziz’s High-to-Medium recovery and estimated recovered revenue, then show the approval/execution audit rows and CSV export.

**Say:** “Scenario D shows a successful recovery after an approved action, positive response, and new purchase. The audit view records analysis, edits, approval, execution, and simulated scheduling. The repository includes 47 unit tests and 9 production-browser workflows. CustomerPulse keeps evidence visible, consent enforced, and final responsibility with authorised employees.”

## Claims to avoid during the recording

Do not say that:

- the shown AVO output came from a live GPT-5.6 request;
- a social post was published to a real Buffer channel;
- demo changes persist to Supabase after reload;
- WhatsApp or email messages are automatically sent;
- the application guarantees regulatory compliance;
- synthetic analytics represent real business performance.
