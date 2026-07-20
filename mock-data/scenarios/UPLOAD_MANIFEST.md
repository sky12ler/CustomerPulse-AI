# Imported Workspace scenario pack

From **Data Imports**, select **Administrator** and upload in this order:

1. `01-customers-mixed-risk.csv` as **Customers**.
2. `02-transactions-mixed-risk.csv` as **Transactions**.
3. `03-conversations-mixed-risk.csv` as **Conversations**.
4. Upload `../product-catalogue.pdf` as **Product catalogue**.
5. Upload `../customer-service-policy.pdf` as **Customer service policy**.
6. Upload `../marketing-guidelines.pdf` as **Marketing guidelines**.
7. After recording the baseline scores, upload `04-campaign-customer-results.csv` as **Campaign results**. Alicia has positive/retained evidence and Chen has negative/declined evidence; both must recalculate from their own customer-level rows.

## Expected cases

- `IMP-RISK-001`: declining spend plus complaint, missed commitment, competitor and cancellation evidence. AVO should produce a customer-specific urgent draft and an elevated dynamic risk.
- `IMP-GROW-002`: improving transactions and a product-discovery conversation.
- `IMP-PRICE-003`: declining activity plus a price-value objection.
- `IMP-NOCONSENT-004`: belongs to the declining segment but must be excluded from campaign audiences because consent is withdrawn.
- `IMP-QUIET-005`: declining transactions with weak conversation evidence. AVO should expose uncertainty instead of inventing a complaint.
- `IMP-STABLE-006`: stable comparison customer.
- `IMP-RECOVER-007`: positive recovery language and improving spend. Use it to demonstrate outcome-driven risk recalculation.
- `IMP-NOCONTACT-008`: consent is granted but contact details are missing, so Email and WhatsApp audiences must exclude it.

The six West Manufacturing customers form a calculated segment. Marketing Intelligence must derive any opportunity from these imported records; it must not reuse `MKT-003` or Demo Workspace conclusions.
