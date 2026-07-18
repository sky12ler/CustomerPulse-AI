# Data imports

Administrators upload CSV/XLSX customer, transaction or product records; CSV/JSON/TXT conversations; PDF/DOCX/TXT policy sources; and PDF/PNG/JPG assets. The UI performs file-type and size checks, preview/mapping, required-field validation, duplicate reporting, error-report download and explicit confirmation. The confirmed demo session records uploader, confirmer, mapping and counts in its audit state; the Supabase schema has matching `import_jobs`, `import_errors`, document and chunk tables. Persisting confirmed jobs to a live project requires the deployment integration described in `FINAL_HANDOFF.md`.

Documents retain filename, type, page, chunk index/location, owner, timestamp, classification and retention category. Permanent populated templates are downloadable from Data Imports. Production extraction should run in a sandboxed worker and scan files before Storage persistence.

## Phase 1 operational imports

Confirmation now performs validation -> normalization -> stable-ID upsert -> affected-customer detection -> tier recalculation -> churn recalculation -> alert evaluation -> analytics refresh -> audit. Customer IDs, transaction IDs, message IDs, and product SKUs are stable keys. Re-uploading unchanged data skips duplicates.

Imports always enter Imported Workspace; the permanent Demo Workspace is not silently mixed or overwritten. Customers preserve related transactions and messages. Conversation imports do not claim complaints until AVO analysis runs. The success result reports added, updated, rejected, affected customers, recalculations, and alert changes.

Load Demo Data requires no upload. Individual incremental imports and Multi-file Quick Import are available. Quick Import detects types, asks for confirmation, and orders dependencies. ZIP bundle ingestion is not implemented. Optional missing conversations lower confidence; missing policies/products limit grounded suggestions but do not block behavioural scoring.
