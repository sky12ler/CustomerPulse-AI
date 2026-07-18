import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const sql = readFileSync(
  path.join(
    process.cwd(),
    "supabase/migrations/202607180001_initial_schema.sql",
  ),
  "utf8",
).toLowerCase();

const requiredTables = [
  "organizations",
  "profiles",
  "user_roles",
  "customers",
  "customer_consents",
  "transactions",
  "products",
  "customer_products",
  "conversations",
  "messages",
  "uploaded_documents",
  "document_chunks",
  "import_jobs",
  "import_errors",
  "conversation_analyses",
  "customer_tiers",
  "tier_components",
  "churn_scores",
  "churn_score_components",
  "alerts",
  "recommendations",
  "recommendation_feedback",
  "approval_requests",
  "approval_events",
  "outreach_messages",
  "tasks",
  "marketing_triggers",
  "campaigns",
  "campaign_audiences",
  "campaign_sources",
  "campaign_assets",
  "campaign_versions",
  "scheduled_posts",
  "campaign_events",
  "link_events",
  "audit_logs",
  "governance_policies",
  "data_retention_rules",
  "integration_settings",
  "system_settings",
];

describe("Supabase security migration", () => {
  it("defines every required normalized table", () => {
    for (const table of requiredTables) {
      expect(sql, table).toContain(`create table public.${table}`);
    }
  });

  it("enables tenant RLS and leaves audit records immutable", () => {
    expect(sql).toContain("enable row level security");
    expect(sql).toContain("organization_id=public.current_org_id()");
    expect(sql).toContain(
      "intentionally no update or delete policy on audit_logs",
    );
    expect(sql).not.toMatch(
      /create policy[^;]+on audit_logs for (update|delete)/,
    );
  });

  it("guards approval self-review and scheduling idempotency in the schema", () => {
    expect(sql).toContain(
      "check(approver_id is null or approver_id<>requester_id)",
    );
    expect(sql).toContain("unique(organization_id,idempotency_key)");
  });
});
