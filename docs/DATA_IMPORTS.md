# Data imports

Administrators upload CSV/XLSX customer, transaction or product records; CSV/JSON/TXT conversations; PDF/DOCX/TXT policy sources; and PDF/PNG/JPG assets. The UI performs file-type and size checks, preview/mapping, required-field validation, duplicate reporting, error-report download and explicit confirmation. Import jobs store uploader, confirmer, mapping and counts.

Documents retain filename, type, page, chunk index/location, owner, timestamp, classification and retention category. Permanent populated templates are downloadable from Data Imports. Production extraction should run in a sandboxed worker and scan files before Storage persistence.
