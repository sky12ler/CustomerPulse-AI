import { createClient } from "@supabase/supabase-js";
import fs from "node:fs/promises";
import Papa from "papaparse";

if (!process.argv.includes("--confirm")) {
  console.error(
    "Refusing to change data without --confirm. Usage: node scripts/reset-demo.mjs --confirm",
  );
  process.exit(1);
}
if (
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  !process.env.SUPABASE_SERVICE_ROLE_KEY
) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. No data changed.",
  );
  process.exit(1);
}
const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  ),
  org = "00000000-0000-4000-8000-000000000001";
const parse = async (name) =>
  Papa.parse(
    await fs.readFile(new URL(`../mock-data/${name}`, import.meta.url), "utf8"),
    { header: true, skipEmptyLines: true },
  ).data;
const must = async (promise, label) => {
  const { data, error } = await promise;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
};
await must(
  db
    .from("organizations")
    .upsert(
      {
        id: org,
        name: "CustomerPulse Demo Organisation",
        slug: "customerpulse-demo",
        synthetic_demo: true,
      },
      { onConflict: "slug" },
    ),
  "organisation",
);

const accountSpecs = [
  [
    "10000000-0000-4000-8000-000000000001",
    "admin@customerpulse.demo",
    "Demo Administrator",
    "administrator",
  ],
  [
    "10000000-0000-4000-8000-000000000002",
    "sales.manager@customerpulse.demo",
    "Farah Chen",
    "sales_manager",
  ],
  [
    "10000000-0000-4000-8000-000000000003",
    "marketing.manager@customerpulse.demo",
    "Mina Lee",
    "marketing_manager",
  ],
  [
    "10000000-0000-4000-8000-000000000004",
    "account.executive@customerpulse.demo",
    "Aisha Rahman",
    "account_executive",
  ],
  [
    "10000000-0000-4000-8000-000000000005",
    "auditor@customerpulse.demo",
    "Omar Aziz",
    "auditor",
  ],
];
const existing = (
  await must(
    db.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    "list auth users",
  )
).users;
for (const [id, email, name, role] of accountSpecs) {
  let user = existing.find((u) => u.email === email);
  if (!user)
    user = await must(
      db.auth.admin.createUser({
        id,
        email,
        password: "PulseDemo!2026",
        email_confirm: true,
        user_metadata: { display_name: name, synthetic_demo: true },
      }),
      `create ${email}`,
    ).then((x) => x.user);
  await must(
    db
      .from("profiles")
      .upsert({
        id: user.id,
        organization_id: org,
        display_name: name,
        email,
        active: true,
      }),
    `profile ${email}`,
  );
  await must(
    db
      .from("user_roles")
      .upsert(
        { profile_id: user.id, organization_id: org, role },
        { onConflict: "profile_id,role" },
      ),
    `role ${email}`,
  );
}
const executiveId = (
  await must(
    db
      .from("profiles")
      .select("id")
      .eq("organization_id", org)
      .eq("email", "account.executive@customerpulse.demo")
      .single(),
    "executive profile",
  )
).id;
const salesId = (
  await must(
    db
      .from("profiles")
      .select("id")
      .eq("organization_id", org)
      .eq("email", "sales.manager@customerpulse.demo")
      .single(),
    "sales profile",
  )
).id;
const marketingId = (
  await must(
    db
      .from("profiles")
      .select("id")
      .eq("organization_id", org)
      .eq("email", "marketing.manager@customerpulse.demo")
      .single(),
    "marketing profile",
  )
).id;

const customerRows = await parse("customers.csv");
await must(
  db.from("customers").upsert(
    customerRows.map((r) => ({
      organization_id: org,
      external_id: r.customer_external_id,
      customer_name: r.customer_name,
      company_name: r.company_name,
      industry: r.industry,
      region: r.region,
      assigned_profile_id: executiveId,
      email: r.email,
      phone: r.phone,
      preferred_channel: r.preferred_channel,
      customer_since: r.customer_since,
      status: "active",
      deleted_at: null,
    })),
    { onConflict: "organization_id,external_id" },
  ),
  "customers",
);
const customerMap = Object.fromEntries(
  (
    await must(
      db.from("customers").select("id,external_id").eq("organization_id", org),
      "customer map",
    )
  ).map((x) => [x.external_id, x.id]),
);
await must(
  db.from("customer_consents").upsert(
    customerRows.map((r) => ({
      organization_id: org,
      customer_id: customerMap[r.customer_external_id],
      purpose: "marketing",
      status: r.consent_status === "granted" ? "granted" : "withdrawn",
      source: "synthetic customer import",
      captured_at: new Date().toISOString(),
    })),
    { onConflict: "customer_id,purpose" },
  ),
  "consents",
);

const productRows = await parse("products.csv");
await must(
  db.from("products").upsert(
    productRows.map((r) => ({
      organization_id: org,
      sku: r.product_sku,
      name: r.product_name,
      category: r.category,
      description: r.description,
      standard_price: Number(r.standard_price),
      promotion_price: r.promotion_price ? Number(r.promotion_price) : null,
      promotion_start: r.promotion_start || null,
      promotion_end: r.promotion_end || null,
      inventory_status: r.inventory_status,
      product_url: r.product_url,
      deleted_at: null,
    })),
    { onConflict: "organization_id,sku" },
  ),
  "products",
);
const productMap = Object.fromEntries(
  (
    await must(
      db.from("products").select("id,sku").eq("organization_id", org),
      "product map",
    )
  ).map((x) => [x.sku, x.id]),
);
const transactionRows = await parse("transactions.csv");
await must(
  db.from("transactions").upsert(
    transactionRows.map((r) => ({
      organization_id: org,
      external_id: r.transaction_id,
      customer_id: customerMap[r.customer_external_id],
      product_id: productMap[r.product_sku],
      transaction_date: r.transaction_date,
      quantity: Number(r.quantity),
      unit_price: Number(r.unit_price),
      total_amount: Number(r.total_amount),
    })),
    { onConflict: "organization_id,external_id" },
  ),
  "transactions",
);

const messageRows = await parse("conversations.csv"),
  groups = Object.groupBy(messageRows, (r) => r.conversation_id);
await must(
  db.from("conversations").upsert(
    Object.entries(groups).map(([external_id, rows]) => ({
      organization_id: org,
      external_id,
      customer_id: customerMap[rows[0].customer_external_id],
      channel: rows[0].channel,
      source: "synthetic import",
      deleted_at: null,
    })),
    { onConflict: "organization_id,external_id" },
  ),
  "conversations",
);
const conversationMap = Object.fromEntries(
  (
    await must(
      db
        .from("conversations")
        .select("id,external_id")
        .eq("organization_id", org),
      "conversation map",
    )
  ).map((x) => [x.external_id, x.id]),
);
await must(
  db.from("messages").upsert(
    messageRows.map((r) => ({
      organization_id: org,
      conversation_id: conversationMap[r.conversation_id],
      external_id: r.message_id,
      sender_type: r.sender_type,
      sender_name: r.sender_name,
      message_text: r.message_text,
      sent_at: r.sent_at,
    })),
    { onConflict: "organization_id,external_id" },
  ),
  "messages",
);

const tierNames = ["Standard", "Growth", "Core", "Strategic"];
const tiers = customerRows.map((r, i) => ({
  id: `30000000-0000-4000-8000-${String(1001 + i).padStart(12, "0")}`,
  organization_id: org,
  customer_id: customerMap[r.customer_external_id],
  tier:
    r.customer_external_id === "CUS-1001"
      ? "Strategic"
      : r.customer_external_id === "CUS-1002"
        ? "Growth"
        : r.customer_external_id === "CUS-1004"
          ? "Core"
          : tierNames[i % 4],
  score: r.customer_external_id === "CUS-1001" ? 91 : 35 + ((i * 7) % 60),
  calculation_version: "tier-v1.0",
  manual_override: false,
}));
await must(db.from("customer_tiers").upsert(tiers), "tiers");
const churn = customerRows.map((r, i) => {
  const special = {
    "CUS-1001": [86, "Critical", 72400],
    "CUS-1002": [18, "Low", 5100],
    "CUS-1003": [68, "High", 35400],
    "CUS-1004": [42, "Medium", 18200],
  }[r.customer_external_id];
  const score = special?.[0] ?? 12 + ((i * 7) % 65),
    level =
      special?.[1] ?? (score >= 60 ? "High" : score >= 30 ? "Medium" : "Low");
  return {
    id: `40000000-0000-4000-8000-${String(1001 + i).padStart(12, "0")}`,
    organization_id: org,
    customer_id: customerMap[r.customer_external_id],
    score,
    risk_level: level,
    confidence: 88,
    revenue_at_risk: special?.[2] ?? score * 350,
    top_factors:
      r.customer_external_id === "CUS-1001"
        ? [
            "unresolved_complaints",
            "frequency_deterioration",
            "cancellation_language",
          ]
        : ["behavioural_trend"],
    evidence: [],
    calculation_version: "churn-v1.0",
    manual_override: false,
  };
});
await must(db.from("churn_scores").upsert(churn), "churn scores");
await must(
  db.from("alerts").upsert([
    {
      id: "50000000-0000-4000-8000-000000000001",
      organization_id: org,
      customer_id: customerMap["CUS-1001"],
      alert_type: "critical_churn",
      title: "Strategic customer requires service recovery",
      severity: "Critical",
      status: "New",
      assigned_profile_id: executiveId,
      deadline: new Date(Date.now() + 86400000).toISOString(),
      evidence: ["MSG-A-101", "MSG-A-103", "MSG-A-104"],
    },
    {
      id: "50000000-0000-4000-8000-000000000002",
      organization_id: org,
      customer_id: customerMap["CUS-1003"],
      alert_type: "high_churn",
      title: "Segment price objection",
      severity: "High",
      status: "Assigned",
      assigned_profile_id: executiveId,
      evidence: ["MSG-C-301"],
    },
  ]),
  "alerts",
);
await must(
  db.from("recommendations").upsert([
    {
      id: "60000000-0000-4000-8000-000000000001",
      organization_id: org,
      customer_id: customerMap["CUS-1001"],
      alert_id: "50000000-0000-4000-8000-000000000001",
      provider: "DemoAVOProvider",
      original_output: {
        action: "Resolve complaints before promotion",
        evidence: ["MSG-A-101", "MSG-A-103", "MSG-A-104"],
      },
      action: "Resolve both delivery complaints before any promotion",
      priority: "Urgent",
      channel: "WhatsApp",
      confidence: "High",
      uncertainty: "Future behaviour is uncertain",
      required_approver_role: "sales_manager",
      status: "pending_approval",
      owner_id: executiveId,
      created_by: executiveId,
    },
    {
      id: "60000000-0000-4000-8000-000000000002",
      organization_id: org,
      customer_id: customerMap["CUS-1002"],
      provider: "DemoAVOProvider",
      original_output: {
        action: "Introduce Analytics Suite",
        evidence: ["MSG-B-201"],
      },
      action: "Introduce Analytics Suite from the approved catalogue",
      priority: "Medium",
      channel: "Email",
      confidence: "High",
      required_approver_role: "sales_manager",
      status: "draft",
      owner_id: executiveId,
      created_by: executiveId,
    },
  ]),
  "recommendations",
);
await must(
  db
    .from("marketing_triggers")
    .upsert({
      id: "70000000-0000-4000-8000-000000000001",
      organization_id: org,
      segment_definition: { region: "North", industry: "Food & beverage" },
      affected_count: 4,
      affected_percentage: 33.3,
      revenue_decline: 18,
      frequency_decline: 24,
      engagement_decline: 29,
      common_factors: ["price objection", "frequency decline"],
      evidence: ["MSG-C-301", "MSG-C-505", "MSG-C-508", "MSG-C-511"],
      status: "new",
    }),
  "marketing trigger",
);
await must(
  db
    .from("campaigns")
    .upsert({
      id: "80000000-0000-4000-8000-000000000003",
      organization_id: org,
      trigger_id: "70000000-0000-4000-8000-000000000001",
      name: "Value clarity",
      objective: "Grounded value education",
      provider: "DemoAVOProvider",
      status: "draft",
      created_by: marketingId,
    }),
  "campaign",
);
await must(
  db
    .from("approval_requests")
    .upsert({
      id: "90000000-0000-4000-8000-000000000021",
      organization_id: org,
      entity_type: "retention_action",
      entity_id: "60000000-0000-4000-8000-000000000001",
      requester_id: executiveId,
      required_role: "sales_manager",
      approver_id: salesId,
      status: "approved",
      original_avo_output: { action: "service recovery" },
      human_edited_version: { message: "Apology and status review" },
      reviewer_comment: "Evidence and policy checked",
      approved_at: new Date().toISOString(),
    }),
  "approval history",
);
await must(
  db.from("audit_logs").upsert([
    {
      id: "a0000000-0000-4000-8000-000000009201",
      organization_id: org,
      actor_id: executiveId,
      actor_label: "Aisha Rahman",
      actor_role: "account_executive",
      action: "AVO recommendation",
      entity_type: "recommendation",
      entity_id: "REC-001",
      result: "Pending Approval",
    },
    {
      id: "a0000000-0000-4000-8000-000000009178",
      organization_id: org,
      actor_id: salesId,
      actor_label: "Farah Chen",
      actor_role: "sales_manager",
      action: "Retention action approved",
      entity_type: "approval",
      entity_id: "ACT-021",
      reviewer_comment: "Evidence and policy checked",
      result: "Approved",
    },
    {
      id: "a0000000-0000-4000-8000-000000009150",
      organization_id: org,
      actor_id: marketingId,
      actor_label: "Mina Lee",
      actor_role: "marketing_manager",
      action: "Campaign created",
      entity_type: "campaign",
      entity_id: "CAM-003",
      result: "Draft",
    },
  ]),
  "audit logs",
);
console.log(
  `Reloaded ${customerRows.length} customers, ${transactionRows.length} transactions, ${messageRows.length} messages, providers, approvals and audit history. Permanent mock files were not removed.`,
);
