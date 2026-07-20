# Alternate pack: walkthrough and expected results

This pack is independent of the original mixed-risk scenario. Create a separate Imported Workspace project so previous records do not change the counts or calculations below.

## 1. Start clean

1. Open Imported Workspace and create a project such as **Alternate Healthcare Project**.
2. Select **Administrator** for imports.
3. Open **Data Imports**.

Expected: the new project's operational store is empty and the selected role remains Administrator while navigating. Switching back to another project restores only that project's records.

## 2. Import the CSV files in order

| Order | File | Import type | Expected validation and commit |
|---:|---|---|---|
| 1 | `01-customers-alternate.csv` | Customers | 9 valid, 9 added, 0 rejected |
| 2 | `02-transactions-alternate.csv` | Transactions | 36 valid, 36 added, 0 rejected |
| 3 | `03-conversations-alternate.csv` | Conversations | 11 valid, 11 added, 0 rejected |
| 4 | `04-products-alternate.csv` | Products | 5 valid, 5 added, 0 rejected |

After each confirmation, expect a success summary and a data-import audit entry. Transactions and conversations depend on the customer IDs, which is why customers must be first.

## 3. Verify the initial customer results

After the first three CSV imports, open **Customers**. The deterministic initial results are:

| Customer | Expected initial risk | Test case |
|---|---:|---|
| Nadia Escalation | Medium, 55 | Repeated complaint, missed update, competitor, cancellation language |
| Omar Budget | Medium, 41 | Spend decline and price objection |
| Priya Restricted | Medium, 44 | Complaint plus withdrawn marketing consent |
| Quentin No Phone | Medium, 44 | Decline; email exists but WhatsApp is unavailable |
| Rosa Dormant | High, 67 | Severe spend decline and dormant account |
| Samuel Recovery | Low, 9 | Improving transactions and recovery language |
| Talia Expansion | Low, 9 | Growth and product-discovery interest |
| Umar Statement | Low, 14 | Weak evidence: statement request only |
| Vivian Stable | Low, 9 | Stable comparison customer |

Expected page behaviour: all names open `/customers/[customerId]`; filters, sorting, counts and pagination use these imported records. Account Executive access is limited to assigned customers.

## 4. Run AVO tests

### Nadia: strong retention evidence

1. Open **Nadia Escalation**.
2. Open her conversation and run **AVO Analysis**.

Expected validated analysis:

- confidence: `0.85`
- three evidence references: `ALT-MSG-101A`, `ALT-MSG-101B`, `ALT-MSG-101C`
- complaint, competitor mention, possible cancellation, and missed-update signals
- after validated signals are committed, risk recalculates to **Critical, 100**
- uncertainty remains visible and says staff verification is required

The analysis must show exactly three operational plans plus one separate customer-message draft. Select one plan as Administrator, assign owner and due date, and verify it appears in **Action Plans** with evidence and completion criteria. Start it, confirm execution, record an optional response, then record the outcome; only that evidence recalculates risk. An expired plan without a verified outcome becomes **Not Completed** and can be resumed. The separate message draft uses the same evidence-based outcome workflow and must belong to Nadia.

### Umar: weak evidence guardrail

1. Open **Umar Statement** and run AVO Analysis.

Expected:

- confidence: `0.45`
- no complaint signal
- no cancellation signal
- the system must not make a firm churn conclusion from a statement request

### Talia: positive discovery case

Open **Talia Expansion** and analyse the conversation. Expected: positive/product-interest evidence without turning it into a churn complaint. Product grounding may refer to **ALT-PRD-102 Clinical Analytics Review** or **ALT-PRD-104 CareConnect Portal**, but it must not invent a promotion or guarantee.

## 5. Import and verify the PDFs

| File | Select this import type | Expected knowledge test |
|---|---|---|
| `alternate-product-catalogue.pdf` | Product catalogue | Searchable one-page source containing five ALT product SKUs and permitted product-grounding rules |
| `alternate-customer-service-policy.pdf` | Customer service policy | Searchable one-page source defining escalation, approval, separated action states and outcome rules |
| `alternate-marketing-guidelines.pdf` | Marketing guidelines | Searchable one-page source defining calculated opportunity thresholds and consent/channel exclusions |

Expected: each preview reports 1 valid page, 0 invalid pages, the correct inferred document type, and a successful audit record.

## 6. Verify Marketing Intelligence

After customer and transaction imports, open **Marketing Intelligence**.

Expected calculated opportunity:

| Field | Expected value |
|---|---:|
| Title | South Healthcare decline |
| Segment size | 6 customers |
| Affected | 5 of 6, or 83% |
| Baseline eligible revenue | MYR 258,833 |
| Current eligible revenue | MYR 77,842 |
| Revenue decline | 70% |
| Frequency decline | 0% |
| Engagement decline | 13% |
| Confidence | Medium |
| Main drivers | Revenue decline; elevated churn risk |

This opportunity must be calculated from imported records, not displayed as a seeded conclusion.

Start a WhatsApp campaign from this opportunity. Expected live audience calculation:

- total segment: 6
- included: 4
- excluded: 2
- `ALT-PRIVATE-103` Priya Restricted: excluded because marketing consent is withdrawn
- `ALT-NOPHONE-104` Quentin No Phone: excluded because WhatsApp has no phone number

For an Email-only audience, Quentin is eligible because an email exists; Priya remains excluded. Approval history must belong only to this campaign. Without Buffer credentials, Buffer must show **Connection required** and Demo Publisher must be clearly selected.

## 7. What proves the pack worked

- Import counts match the table and every import has an audit entry.
- Customer risk is differentiated rather than all Low.
- Nadia changes from Medium 55 to Critical 100 only after validated AVO signals are committed.
- Umar stays a weak-evidence case with no invented complaint.
- Marketing Intelligence calculates the South Healthcare opportunity from the imported segment.
- Consent and missing-channel exclusions are visible before campaign approval or execution.
- Imported PDFs are searchable sources with distinct catalogue, service-policy and marketing-guideline content.
