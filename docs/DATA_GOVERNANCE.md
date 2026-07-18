# Data governance

The Governance screen implements purpose limitation, minimisation, consent status/withdrawal, tenant and role access, classification, retention review, export approval, processing disclosure, lineage and customer correction/deletion-review controls. Records eligible for expiry are flagged, never automatically deleted. Audit events have no update/delete RLS policy.

Supabase policies isolate `organization_id`; operational writes are role-gated. Static tests verify every required tenant table enters the RLS policy loop and audit logs have no update/delete policy. Production deployments must still execute cross-tenant tests using two real Auth tenants and review policies whenever new tables are introduced.
