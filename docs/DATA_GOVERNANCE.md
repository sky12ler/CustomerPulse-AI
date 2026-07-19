# Data governance

The Governance screen implements purpose limitation, minimisation, consent status/withdrawal, tenant and role access, classification, retention review, export approval, processing disclosure, lineage and customer correction/deletion-review controls. Records eligible for expiry are flagged, never automatically deleted. Audit events have no update/delete RLS policy.

Supabase policies isolate `organization_id`; operational writes are role-gated. Static tests verify every required tenant table enters the RLS policy loop and audit logs have no update/delete policy. Production deployments must still execute cross-tenant tests using two real Auth tenants and review policies whenever new tables are introduced.

## Phase 2 assignment and revenue governance

Demo authorization maps Account Executive to Aisha Rahman. Enforcement is applied before display and at customer lookup, customer URL, conversations, alerts, recommendations, actions, AVO API, exports, and relevant customer audit entries. Access Denied does not return the unassigned customer name or attributes. Administrator and Sales Manager retain wider authorized access; Auditor is read-only.

The public hackathon Imported Workspace is browser-local and does not expose anonymous Supabase reads or writes. The three Supabase migrations remain optional artifacts for a future authenticated multi-user edition; that edition would require live tenant and assignment tests before real customer data is used.

ERAR-v1 stores eligible revenue base, next-90-day period, normalized churn probability, estimated amount, version, timestamp, data source, and disclaimer. Manual overrides require a non-empty reason and user, retain the override metadata, update the customer display value, and return an audit record. The estimate is decision support, not a guaranteed loss.
