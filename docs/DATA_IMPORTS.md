# Data imports

Administrators first create or select an Imported Workspace project, then upload CSV/XLSX customer, transaction or product records; CSV/JSON/TXT conversations; PDF/DOCX/TXT policy sources; and PDF/PNG/JPG assets. The UI performs file-type and size checks, preview/mapping, required-field validation, duplicate reporting, error-report download and explicit confirmation. Every confirmed record is scoped to the active project.

The Project Data Library lists imports, customers, transactions, conversations, products and documents. Documents retain filename, type, page, chunk index/location, owner, timestamp, classification and retention category; users can export extracted text and download the original file. Originals use private Supabase Storage for authorised sessions or IndexedDB in no-login mode.

## Phase 1 operational imports

Confirmation now performs validation -> normalization -> stable-ID upsert -> affected-customer detection -> tier recalculation -> churn recalculation -> alert evaluation -> analytics refresh -> audit. Customer IDs, transaction IDs, message IDs, and product SKUs are stable keys. Re-uploading unchanged data skips duplicates.

Imports always enter Imported Workspace; the permanent Demo Workspace is not silently mixed or overwritten. Customers preserve related transactions and messages. Conversation imports do not claim complaints until AVO analysis runs. The success result reports added, updated, rejected, affected customers, recalculations, and alert changes.

Campaign-result imports support two evidence levels. Aggregate rows update campaign analytics only. Rows containing `customer_external_id` plus a valid `response_sentiment` and/or `outcome_type` create customer evidence, run operational-1.1 risk recalculation, and audit the before/after score. Invalid sentiments/outcomes or customer evidence without an identifier are rejected.

Load Demo Data requires no upload. Individual incremental imports and Multi-file Quick Import are available. Quick Import detects types, asks for confirmation, and orders dependencies. ZIP bundle ingestion is not implemented. Optional missing conversations lower confidence; missing policies/products limit grounded suggestions but do not block behavioural scoring.
