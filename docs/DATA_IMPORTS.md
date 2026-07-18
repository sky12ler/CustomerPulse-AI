# Data imports

Administrators upload CSV/XLSX customer, transaction or product records; CSV/JSON/TXT conversations; PDF/DOCX/TXT policy sources; and PDF/PNG/JPG assets. The UI performs file-type and size checks, preview/mapping, required-field validation, duplicate reporting, error-report download and explicit confirmation. The confirmed demo session records uploader, confirmer, mapping and counts in its audit state; the Supabase schema has matching `import_jobs`, `import_errors`, document and chunk tables. Persisting confirmed jobs to a live project requires the deployment integration described in `FINAL_HANDOFF.md`.

Documents retain filename, type, page, chunk index/location, owner, timestamp, classification and retention category. Permanent populated templates are downloadable from Data Imports. Production extraction should run in a sandboxed worker and scan files before Storage persistence.
