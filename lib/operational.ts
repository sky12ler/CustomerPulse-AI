import type { Customer, Risk, Sentiment, Tier } from "./types";
import type { ImportKind, ImportResult } from "./imports";
import type { AVOActionPlan } from "./avo";
export type WorkspaceKind = "demo" | "imported";
export type SourceType =
  | "Demo Seed"
  | "Manual Upload"
  | "Quick Import"
  | "Staff Entry"
  | "AVO Analysis"
  | "System Calculation";
export interface Provenance {
  datasetId: WorkspaceKind;
  sourceType: SourceType;
  sourceFileName?: string;
  importBatchId?: string;
  importedBy?: string;
  importedAt?: string;
  originalExternalId: string;
  calculationVersion?: string;
}
export interface OperationalTransaction extends Provenance {
  id: string;
  customerId: string;
  date: string;
  productSku: string;
  productName: string;
  amount: number;
}
export interface TierComponent {
  name: string;
  value: number;
  points: number;
}
export interface TierCalculation extends Provenance {
  customerId: string;
  calculatedTier: Tier;
  score: number;
  components: TierComponent[];
  calculatedAt: string;
  sourceRange: string;
}
export interface ConversationSignal extends Provenance {
  id: string;
  customerId: string;
  analysisId: string;
  type: string;
  severity: number;
  messageIds: string[];
  confidence: number;
  validationStatus: "Validated" | "Staff Review Required" | "Confirmed";
  createdAt: string;
}
export interface ChurnComponent {
  name: string;
  points: number;
  evidence: string[];
}
export interface ChurnCalculation extends Provenance {
  customerId: string;
  score: number;
  risk: Risk;
  confidence: number;
  components: ChurnComponent[];
  topFactors: string[];
  evidence: string[];
  eligibleRevenueBase: number;
  revenuePeriod: "Next 90 days";
  churnProbability: number;
  estimatedRevenueAtRisk: number;
  revenueCalculationVersion: "ERAR-v1";
  revenueDataSource: string;
  estimateDisclaimer: string;
  revenueOverride?: { value: number; reason: string; user: string; at: string };
  triggerType: string;
  previousScore: number;
  scoreChange: number;
  calculatedAt: string;
}
export interface DynamicAlert extends Provenance {
  id: string;
  customerId: string;
  trigger: string;
  previousRisk: Risk;
  currentRisk: Risk;
  evidence: string[];
  owner: string;
  deadline: string;
  status: "Active" | "Resolved";
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}
export interface StoredAnalysis extends Provenance {
  id: string;
  customerId: string;
  summary: string;
  confidence: number;
  evidenceIds: string[];
  actionPlans: AVOActionPlan[];
  customerMessageDraft: {
    channel: "Email" | "WhatsApp";
    subject: string;
    body: string;
    rationale: string;
    evidence_ids: string[];
  };
  createdAt: string;
}
export interface OperationalProduct extends Provenance {
  id: string;
  name: string;
  category: string;
  description: string;
}
export interface CustomerResponseRecord extends Provenance {
  id: string;
  actionId: string;
  customerId: string;
  channel: string;
  responseType: string;
  text: string;
  sentiment: Sentiment;
  receivedAt: string;
  recordedBy: string;
  evidenceReference: string;
}
export type OutcomeType =
  | "Customer retained"
  | "Complaint resolved"
  | "Offer accepted"
  | "Meeting scheduled"
  | "Purchase completed"
  | "No response"
  | "Customer declined"
  | "Customer churned"
  | "Follow-up required"
  | "Inconclusive";
export interface ActionOutcomeRecord extends Provenance {
  id: string;
  actionId: string;
  customerId: string;
  type: OutcomeType;
  notes: string;
  revenueRecovered: number;
  supportingReference: string;
  recordedBy: string;
  recordedAt: string;
  confidence: number;
  requiresFollowUp: boolean;
}
export interface OperationalDataset {
  id: WorkspaceKind;
  customers: Customer[];
  transactions: OperationalTransaction[];
  products: OperationalProduct[];
  tierCalculations: Record<string, TierCalculation>;
  churnCalculations: Record<string, ChurnCalculation>;
  analyses: StoredAnalysis[];
  signals: ConversationSignal[];
  alerts: DynamicAlert[];
  responses: CustomerResponseRecord[];
  outcomes: ActionOutcomeRecord[];
  documents: Array<Provenance & { id: string; kind: string }>;
}
export interface ImportCommitSummary {
  added: number;
  updated: number;
  skipped: number;
  rejected: number;
  affectedCustomerIds: string[];
  tiersRecalculated: number;
  churnRecalculated: number;
  alertsCreated: number;
  alertsUpdated: number;
  alertsResolved: number;
}
const VERSION = "operational-1.0";
const now = () => new Date().toISOString();
const riskFor = (score: number): Risk =>
  score >= 80
    ? "Critical"
    : score >= 60
      ? "High"
      : score >= 35
        ? "Medium"
        : "Low";
const tierFor = (score: number): Tier =>
  score >= 80
    ? "Strategic"
    : score >= 60
      ? "Core"
      : score >= 35
        ? "Growth"
        : "Standard";
const num = (value: unknown) =>
  Number(String(value ?? "0").replace(/,/g, "")) || 0;
const str = (value: unknown) => String(value ?? "").trim();
const source = (
  datasetId: WorkspaceKind,
  sourceType: SourceType,
  id: string,
  file?: string,
  batch?: string,
  actor?: string,
): Provenance => ({
  datasetId,
  sourceType,
  sourceFileName: file,
  importBatchId: batch,
  importedBy: actor,
  importedAt: now(),
  originalExternalId: id,
});
export function calculateCustomerTier(
  dataset: OperationalDataset,
  customerId: string,
  asOfDate = now(),
): TierCalculation {
  const customer = dataset.customers.find((item) => item.id === customerId);
  if (!customer) throw new Error("Customer not found");
  const tx = dataset.transactions
    .filter((item) => item.customerId === customerId)
    .sort((a, b) => a.date.localeCompare(b.date));
  const monetary = tx.reduce((sum, item) => sum + item.amount, 0);
  const last = tx.at(-1)?.date ?? customer.lastPurchase;
  const recency = Math.max(
    0,
    Math.floor(
      (new Date(asOfDate).getTime() - new Date(last).getTime()) / 86400000,
    ),
  );
  const diversity =
    new Set(tx.map((item) => item.productSku || item.productName)).size ||
    customer.products.length;
  const components: TierComponent[] = [
    { name: "Recency", value: recency, points: Math.max(0, 25 - recency / 12) },
    {
      name: "Frequency",
      value: tx.length,
      points: Math.min(20, tx.length * 2),
    },
    {
      name: "Monetary value",
      value: monetary,
      points: Math.min(30, monetary / 5000),
    },
    {
      name: "Lifetime value",
      value: Math.max(customer.ltv, monetary),
      points: Math.min(15, Math.max(customer.ltv, monetary) / 15000),
    },
    {
      name: "Product diversity",
      value: diversity,
      points: Math.min(5, diversity * 1.5),
    },
    {
      name: "Relationship duration",
      value: Math.max(1, tx.length / 2),
      points: Math.min(5, Math.max(1, tx.length / 2)),
    },
  ];
  const score = Math.round(
    Math.min(
      100,
      components.reduce((sum, item) => sum + item.points, 0),
    ),
  );
  return {
    ...source(dataset.id, "System Calculation", customerId),
    customerId,
    calculatedTier: tierFor(score),
    score,
    components,
    calculationVersion: VERSION,
    calculatedAt: now(),
    sourceRange: tx.length
      ? tx[0].date + " to " + tx.at(-1)!.date
      : "No transactions",
  };
}
export function calculateChurn(
  dataset: OperationalDataset,
  customerId: string,
  triggerType: string,
): ChurnCalculation {
  const customer = dataset.customers.find((item) => item.id === customerId);
  if (!customer) throw new Error("Customer not found");
  const previousScore = dataset.churnCalculations[customerId]?.score ?? 0;
  const components: ChurnComponent[] = [];
  const add = (name: string, points: number, evidence: string[]) => {
    if (points) components.push({ name, points: Math.round(points), evidence });
  };
  add(
    "Purchase recency deterioration",
    Math.max(
      0,
      Math.min(
        25,
        (Date.now() - new Date(customer.lastPurchase).getTime()) / 864000000,
      ),
    ),
    [customer.lastPurchase],
  );
  add(
    "Purchase frequency deterioration",
    Math.max(0, -customer.frequencyTrend / 2),
    ["Frequency trend " + customer.frequencyTrend + "%"],
  );
  add("Spending deterioration", Math.max(0, -customer.spendTrend / 2), [
    "Spend trend " + customer.spendTrend + "%",
  ]);
  const weights: Record<string, number> = {
    "Cancellation intent": 25,
    "Severe complaint": 20,
    "Repeated complaint": 16,
    "Competitor mention": 15,
    "Missed staff commitment": 12,
    "Price objection": 10,
    "Negative sentiment": 8,
  };
  dataset.signals
    .filter(
      (item) =>
        item.customerId === customerId &&
        ["Validated", "Confirmed"].includes(item.validationStatus),
    )
    .forEach((signal) =>
      add(
        signal.type,
        signal.severity * (weights[signal.type] ?? 6),
        signal.messageIds,
      ),
    );
  dataset.outcomes
    .filter((item) => item.customerId === customerId)
    .forEach((outcome) => {
      const positive = [
        "Customer retained",
        "Complaint resolved",
        "Offer accepted",
        "Meeting scheduled",
        "Purchase completed",
      ].includes(outcome.type);
      add(
        positive
          ? "Successful retention outcome"
          : "Failed or inconclusive intervention",
        positive ? -24 : 10,
        [outcome.id],
      );
    });
  dataset.responses
    .filter((item) => item.customerId === customerId)
    .forEach((response) =>
      add(
        "Customer response",
        response.sentiment === "Positive"
          ? -10
          : response.sentiment === "Negative"
            ? 10
            : -2,
        [response.id],
      ),
    );
  const score = Math.max(
    0,
    Math.min(
      100,
      Math.round(components.reduce((sum, item) => sum + item.points, 8)),
    ),
  );
  const tx = dataset.transactions.filter(
    (item) => item.customerId === customerId,
  );
  const confidence = Math.min(
    98,
    55 + Math.min(25, tx.length * 3) + (customer.messages.length ? 15 : 0),
  );
  const transactionTotal = tx.reduce((sum, item) => sum + item.amount, 0);
  const firstTransaction = tx[0]?.date;
  const lastTransaction = tx.at(-1)?.date;
  const observedDays =
    firstTransaction && lastTransaction
      ? Math.max(
          90,
          Math.ceil(
            (new Date(lastTransaction).getTime() -
              new Date(firstTransaction).getTime()) /
              86400000,
          ) + 1,
        )
      : 90;
  const eligibleRevenueBase = Math.round(
    (transactionTotal / observedDays) * 90,
  );
  const churnProbability = score / 100;
  return {
    ...source(dataset.id, "System Calculation", customerId),
    customerId,
    score,
    risk: riskFor(score),
    confidence,
    components,
    topFactors: [...components]
      .sort((a, b) => b.points - a.points)
      .slice(0, 3)
      .map((item) => item.name),
    evidence: components.flatMap((item) => item.evidence),
    eligibleRevenueBase,
    revenuePeriod: "Next 90 days",
    churnProbability,
    estimatedRevenueAtRisk: Math.round(eligibleRevenueBase * churnProbability),
    revenueCalculationVersion: "ERAR-v1",
    revenueDataSource: tx.length
      ? "Observed transaction run-rate"
      : "No eligible transaction forecast",
    estimateDisclaimer: "Estimate, not a guaranteed loss.",
    calculationVersion: VERSION,
    triggerType,
    previousScore,
    scoreChange: score - previousScore,
    calculatedAt: now(),
  };
}

export function applyRevenueAtRiskOverride(
  dataset: OperationalDataset,
  customerId: string,
  value: number,
  reason: string,
  user: string,
) {
  if (!reason.trim())
    throw new Error("Revenue-at-risk override reason is required");
  if (!Number.isFinite(value) || value < 0)
    throw new Error("Revenue-at-risk override must be a non-negative number");
  const calculation = dataset.churnCalculations[customerId];
  if (!calculation) throw new Error("Customer churn calculation not found");
  const at = now();
  const updated = {
    ...calculation,
    estimatedRevenueAtRisk: Math.round(value),
    revenueOverride: {
      value: Math.round(value),
      reason: reason.trim(),
      user,
      at,
    },
  };
  return {
    dataset: {
      ...dataset,
      churnCalculations: {
        ...dataset.churnCalculations,
        [customerId]: updated,
      },
      customers: dataset.customers.map((customer) =>
        customer.id === customerId
          ? { ...customer, revenueAtRisk: updated.estimatedRevenueAtRisk }
          : customer,
      ),
    },
    audit: {
      action: "Estimated revenue at risk overridden",
      customerId,
      before: calculation.estimatedRevenueAtRisk,
      after: updated.estimatedRevenueAtRisk,
      reason: reason.trim(),
      user,
      at,
    },
  };
}
export function evaluateCustomerAlerts(
  dataset: OperationalDataset,
  customerId: string,
  previousRisk: Risk,
) {
  const customer = dataset.customers.find((item) => item.id === customerId)!;
  const calculation = dataset.churnCalculations[customerId];
  const severe = dataset.signals.some(
    (item) =>
      item.customerId === customerId &&
      ["Severe complaint", "Cancellation intent"].includes(item.type) &&
      item.validationStatus === "Validated",
  );
  const shouldAlert =
    ["High", "Critical"].includes(calculation.risk) ||
    (customer.tier === "Strategic" && calculation.risk === "Medium") ||
    severe;
  const active = dataset.alerts.find(
    (item) =>
      item.customerId === customerId &&
      item.trigger === "Churn risk" &&
      item.status === "Active",
  );
  let alerts = [...dataset.alerts],
    created = 0,
    updated = 0,
    resolved = 0;
  if (shouldAlert && active) {
    alerts = alerts.map((item) =>
      item.id === active.id
        ? {
            ...item,
            previousRisk,
            currentRisk: calculation.risk,
            evidence: calculation.evidence,
            updatedAt: now(),
          }
        : item,
    );
    updated = 1;
  } else if (shouldAlert) {
    const id = "ALT-" + dataset.id.toUpperCase() + "-" + customerId;
    const old = alerts.find((item) => item.id === id);
    const alert: DynamicAlert = {
      ...source(dataset.id, "System Calculation", id),
      id,
      customerId,
      trigger: "Churn risk",
      previousRisk,
      currentRisk: calculation.risk,
      evidence: calculation.evidence,
      owner: customer.staff,
      deadline: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
      status: "Active",
      createdAt: old?.createdAt ?? now(),
      updatedAt: now(),
    };
    alerts = old
      ? alerts.map((item) => (item.id === id ? alert : item))
      : [alert, ...alerts];
    created = old ? 0 : 1;
    updated = old ? 1 : 0;
  } else if (active) {
    alerts = alerts.map((item) =>
      item.id === active.id
        ? {
            ...item,
            previousRisk,
            currentRisk: calculation.risk,
            status: "Resolved",
            updatedAt: now(),
            resolvedAt: now(),
          }
        : item,
    );
    resolved = 1;
  }
  return { dataset: { ...dataset, alerts }, created, updated, resolved };
}
export function recalculateCustomers(
  dataset: OperationalDataset,
  customerIds: string[],
  trigger: string,
) {
  let next = {
    ...dataset,
    customers: [...dataset.customers],
    tierCalculations: { ...dataset.tierCalculations },
    churnCalculations: { ...dataset.churnCalculations },
  };
  let alertsCreated = 0,
    alertsUpdated = 0,
    alertsResolved = 0;
  [...new Set(customerIds)]
    .filter((id) => next.customers.some((item) => item.id === id))
    .forEach((id) => {
      const previousRisk = next.churnCalculations[id]?.risk ?? "Low";
      const tier = calculateCustomerTier(next, id);
      next.tierCalculations[id] = tier;
      next.customers = next.customers.map((item) =>
        item.id === id
          ? { ...item, tier: tier.calculatedTier, tierScore: tier.score }
          : item,
      );
      const churn = calculateChurn(next, id, trigger);
      next.churnCalculations[id] = churn;
      next.customers = next.customers.map((item) =>
        item.id === id
          ? {
              ...item,
              risk: churn.risk,
              riskScore: churn.score,
              confidence: churn.confidence,
              revenueAtRisk: churn.estimatedRevenueAtRisk,
            }
          : item,
      );
      const evaluated = evaluateCustomerAlerts(next, id, previousRisk);
      next = evaluated.dataset;
      alertsCreated += evaluated.created;
      alertsUpdated += evaluated.updated;
      alertsResolved += evaluated.resolved;
      next.customers = next.customers.map((item) =>
        item.id === id
          ? {
              ...item,
              alerts: next.alerts.filter(
                (a) => a.customerId === id && a.status === "Active",
              ).length,
              status: next.alerts.some(
                (a) => a.customerId === id && a.status === "Active",
              )
                ? "Requires action"
                : "Monitored",
            }
          : item,
      );
    });
  return { dataset: next, alertsCreated, alertsUpdated, alertsResolved };
}
export function createDataset(
  id: WorkspaceKind,
  seed: Customer[] = [],
): OperationalDataset {
  let dataset: OperationalDataset = {
    id,
    customers: structuredClone(seed).map((item) => ({
      ...item,
      datasetId: id,
      sourceType: "Demo Seed",
      originalExternalId: item.id,
    })),
    transactions: [],
    products: [],
    tierCalculations: {},
    churnCalculations: {},
    analyses: [],
    signals: [],
    alerts: [],
    responses: [],
    outcomes: [],
    documents: [],
  };
  if (seed.length) {
    dataset.transactions = seed.flatMap((customer, index) =>
      Array.from(
        { length: Math.max(2, Math.round(customer.ltv / 30000)) },
        (_, i) => ({
          ...source(id, "Demo Seed", "SEED-" + customer.id + "-" + i),
          id: "SEED-" + customer.id + "-" + i,
          customerId: customer.id,
          date: new Date(
            new Date(customer.lastPurchase).getTime() - i * 45 * 86400000,
          )
            .toISOString()
            .slice(0, 10),
          productSku: "DEMO-" + ((index % 4) + 1),
          productName:
            customer.products[i % Math.max(1, customer.products.length)] ??
            "Service",
          amount: Math.max(
            1000,
            Math.round(
              customer.ltv / Math.max(2, Math.round(customer.ltv / 30000)),
            ),
          ),
        }),
      ),
    );
    dataset = recalculateCustomers(
      dataset,
      seed.map((item) => item.id),
      "Demo seed",
    ).dataset;
  }
  return dataset;
}
const customerFromRow = (
  row: Record<string, unknown>,
  file: string,
  batch: string,
  actor: string,
  datasetId: WorkspaceKind,
): Customer => ({
  id: str(row.customer_external_id),
  datasetId,
  sourceType: "Manual Upload",
  sourceFileName: file,
  importBatchId: batch,
  importedBy: actor,
  importedAt: now(),
  originalExternalId: str(row.customer_external_id),
  name: str(row.customer_name),
  company: str(row.company_name),
  industry: str(row.industry),
  region: str(row.region),
  staff: str(row.assigned_staff_email) || "Unassigned",
  email: str(row.email),
  phone: str(row.phone),
  tier: "Standard",
  tierScore: 0,
  risk: "Low",
  riskScore: 0,
  confidence: 55,
  ltv: 0,
  revenueAtRisk: 0,
  sentiment: "Neutral",
  consent: str(row.consent_status).toLowerCase() === "granted",
  preferredChannel: str(row.preferred_channel) || "Email",
  lastPurchase: str(row.customer_since) || now().slice(0, 10),
  frequencyTrend: 0,
  spendTrend: 0,
  products: [],
  alerts: 0,
  status: "Monitored",
  messages: [],
});
export function commitOperationalImport(
  dataset: OperationalDataset,
  result: ImportResult,
  kind: ImportKind,
  actor: string,
  sourceType: SourceType = "Manual Upload",
) {
  const rows = result.records ?? result.preview,
    batch = "IMP-" + Date.now();
  const next = structuredClone(dataset);
  let added = 0,
    updated = 0,
    skipped = 0,
    rejected = result.invalidCount;
  const affected = new Set<string>();
  const comparable = (value: unknown) =>
    JSON.stringify(value, (key, item) =>
      ["importedAt", "importBatchId", "importedBy"].includes(key)
        ? undefined
        : item,
    );
  const upsert = <T extends { id: string }>(list: T[], value: T): T[] => {
    const old = list.find((item) => item.id === value.id);
    if (!old) {
      added++;
      return [...list, value];
    }
    if (comparable(old) === comparable(value)) {
      skipped++;
      return list;
    }
    updated++;
    return list.map((item) => (item.id === value.id ? value : item));
  };
  for (const row of rows) {
    if (kind === "customers") {
      const value = customerFromRow(
        row,
        result.filename,
        batch,
        actor,
        dataset.id,
      );
      if (!value.id) {
        rejected++;
        continue;
      }
      const old = next.customers.find((item) => item.id === value.id);
      next.customers = upsert(
        next.customers,
        old
          ? {
              ...old,
              name: value.name,
              company: value.company,
              industry: value.industry,
              region: value.region,
              staff: value.staff,
              email: value.email,
              phone: value.phone,
              consent: value.consent,
              preferredChannel: value.preferredChannel,
            }
          : value,
      );
      affected.add(value.id);
    } else if (kind === "transactions") {
      const customerId = str(row.customer_external_id),
        id = str(row.transaction_id);
      if (!id || !next.customers.some((item) => item.id === customerId)) {
        rejected++;
        continue;
      }
      const value: OperationalTransaction = {
        ...source(dataset.id, sourceType, id, result.filename, batch, actor),
        id,
        customerId,
        date: str(row.transaction_date),
        productSku: str(row.product_sku),
        productName: str(row.product_name),
        amount: num(row.total_amount),
      };
      next.transactions = upsert(next.transactions, value);
      affected.add(customerId);
      const tx = next.transactions
        .filter((item) => item.customerId === customerId)
        .sort((a, b) => a.date.localeCompare(b.date));
      const midpoint = Math.max(1, Math.floor(tx.length / 2)),
        older = tx.slice(0, midpoint),
        recent = tx.slice(midpoint),
        olderSpend = older.reduce((sum, t) => sum + t.amount, 0),
        recentSpend = recent.reduce((sum, t) => sum + t.amount, 0);
      next.customers = next.customers.map((item) =>
        item.id === customerId
          ? {
              ...item,
              lastPurchase: tx.at(-1)?.date ?? item.lastPurchase,
              ltv: tx.reduce((sum, t) => sum + t.amount, 0),
              products: [...new Set(tx.map((t) => t.productName))],
              spendTrend: olderSpend
                ? Math.round(((recentSpend - olderSpend) / olderSpend) * 100)
                : 0,
              frequencyTrend: older.length
                ? Math.round(
                    ((recent.length - older.length) / older.length) * 100,
                  )
                : 0,
            }
          : item,
      );
    } else if (kind === "conversations") {
      const customerId = str(row.customer_external_id),
        id = str(row.message_id),
        customer = next.customers.find((item) => item.id === customerId);
      if (!customer || !id) {
        rejected++;
        continue;
      }
      const message: Customer["messages"][number] = {
        id,
        sender: str(row.sender_type) === "staff" ? "staff" : "customer",
        senderName: str(row.sender_name),
        text: str(row.message_text),
        sentAt: str(row.sent_at),
        channel: ["Email", "Support chat"].includes(str(row.channel))
          ? (str(row.channel) as "Email" | "Support chat")
          : "WhatsApp",
        evidence: true,
      };
      const old = customer.messages.find((item) => item.id === id);
      if (!old) added++;
      else if (JSON.stringify(old) === JSON.stringify(message)) skipped++;
      else updated++;
      next.customers = next.customers.map((item) =>
        item.id === customerId
          ? {
              ...item,
              messages: old
                ? item.messages.map((m) => (m.id === id ? message : m))
                : [...item.messages, message],
            }
          : item,
      );
      affected.add(customerId);
    } else if (kind === "products") {
      const id = str(row.product_sku);
      if (!id) {
        rejected++;
        continue;
      }
      next.products = upsert(next.products, {
        ...source(dataset.id, sourceType, id, result.filename, batch, actor),
        id,
        name: str(row.product_name),
        category: str(row.category),
        description: str(row.description),
      });
    } else {
      const id = batch + "-" + kind;
      next.documents = upsert(next.documents, {
        ...source(dataset.id, sourceType, id, result.filename, batch, actor),
        id,
        kind,
      });
    }
  }
  const recalculated = recalculateCustomers(
    next,
    [...affected],
    "Import completed",
  );
  return {
    dataset: recalculated.dataset,
    summary: {
      added,
      updated,
      skipped,
      rejected,
      affectedCustomerIds: [...affected],
      tiersRecalculated: affected.size,
      churnRecalculated: affected.size,
      alertsCreated: recalculated.alertsCreated,
      alertsUpdated: recalculated.alertsUpdated,
      alertsResolved: recalculated.alertsResolved,
    },
  };
}
export function signalsFromAnalysis(
  dataset: OperationalDataset,
  customerId: string,
  analysis: {
    summary?: string;
    concise_summary?: string;
    confidence?: number;
    analysis_confidence?: number;
    evidence?: Array<{ messageId?: string; message_id?: string }>;
    evidenceIds?: string[];
    action_plans?: AVOActionPlan[];
    customer_message_draft?: StoredAnalysis["customerMessageDraft"];
  },
) {
  const customer = dataset.customers.find((item) => item.id === customerId);
  if (!customer) throw new Error("Customer not found");
  const valid = new Set(customer.messages.map((item) => item.id)),
    supplied =
      analysis.evidenceIds ??
      analysis.evidence
        ?.map((item) => item.messageId ?? item.message_id ?? "")
        .filter(Boolean) ??
      [],
    rejectedEvidence = supplied.filter((id) => !valid.has(id));
  if (rejectedEvidence.length) return { dataset, rejectedEvidence };
  const analysisId = "AVO-" + Date.now(),
    confidence = Number(
      analysis.confidence ?? (analysis.analysis_confidence ?? 0.75) * 100,
    ),
    combined =
      (analysis.summary ?? analysis.concise_summary ?? "") +
      " " +
      customer.messages.map((item) => item.text).join(" ");
  const definitions: Array<[string, RegExp, number]> = [
    ["Severe complaint", /complaint|resolve|replacement|late again/i, 1],
    ["Repeated complaint", /again|second|still has not/i, 0.9],
    ["Competitor mention", /competitor/i, 0.9],
    ["Cancellation intent", /cancel|leave|churn/i, 1],
    ["Price objection", /price|expensive|value/i, 0.7],
    ["Product interest", /analytics|approved .+ option|product discovery/i, 0.5],
    ["Missed staff commitment", /passed with no update|missed/i, 0.8],
    [
      "Negative sentiment",
      /unacceptable|frustrat|disappoint|late|complaint/i,
      0.7,
    ],
  ];
  const signals = definitions
    .filter(([, pattern]) => pattern.test(combined))
    .map(
      ([type, , severity], i): ConversationSignal => ({
        ...source(dataset.id, "AVO Analysis", analysisId + "-" + i),
        id: analysisId + "-SIG-" + i,
        customerId,
        analysisId,
        type,
        severity,
        messageIds: supplied,
        confidence,
        validationStatus:
          confidence >= 70 ? "Validated" : "Staff Review Required",
        createdAt: now(),
      }),
    );
  const stored: StoredAnalysis = {
    ...source(dataset.id, "AVO Analysis", analysisId),
    id: analysisId,
    customerId,
    summary:
      analysis.summary ??
      analysis.concise_summary ??
      "Structured conversation analysis",
    confidence,
    evidenceIds: supplied,
    actionPlans: analysis.action_plans ?? [],
    customerMessageDraft: analysis.customer_message_draft ?? {
      channel: customer.preferredChannel === "WhatsApp" ? "WhatsApp" : "Email",
      subject: "Customer follow-up",
      body: "An authorised staff member will confirm the next step after review.",
      rationale: "Fallback draft created for an older analysis record.",
      evidence_ids: supplied,
    },
    createdAt: now(),
  };
  let next = {
    ...dataset,
    analyses: [stored, ...dataset.analyses],
    signals: [...dataset.signals, ...signals],
  };
  next = recalculateCustomers(
    next,
    [customerId],
    "AVO Analysis completed",
  ).dataset;
  return { dataset: next, rejectedEvidence: [] };
}
export interface OperationalRepository {
  load(workspace: WorkspaceKind): Promise<OperationalDataset>;
  save(dataset: OperationalDataset): Promise<void>;
}
export class LocalOperationalRepository implements OperationalRepository {
  constructor(private key = "customerpulse-operational") {}
  async load(workspace: WorkspaceKind) {
    const raw = localStorage.getItem(this.key + "-" + workspace);
    return raw ? JSON.parse(raw) : createDataset(workspace);
  }
  async save(dataset: OperationalDataset) {
    localStorage.setItem(this.key + "-" + dataset.id, JSON.stringify(dataset));
  }
}
export class SupabaseOperationalRepository implements OperationalRepository {
  async load(workspace: WorkspaceKind): Promise<OperationalDataset> {
    void workspace;
    throw new Error("Supabase repository requires configured credentials");
  }
  async save(dataset: OperationalDataset): Promise<void> {
    void dataset;
    throw new Error("Supabase repository requires configured credentials");
  }
}
