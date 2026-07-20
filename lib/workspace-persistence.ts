import type { DemoWorkflowState } from "./demo-workflow";
import { createDataset } from "./operational";
import type {
  ActionOutcomeRecord,
  ChurnCalculation,
  ConversationSignal,
  CustomerResponseRecord,
  DynamicAlert,
  OperationalProduct,
  OperationalTransaction,
  StoredAnalysis,
  TierCalculation,
} from "./operational";
import type { Customer, AuditEvent } from "./types";
import type {
  CampaignDraft,
  ImportHistoryRecord,
  MarketingOpportunityRecord,
  RecommendationRecord,
  RetentionActionRecord,
  ScheduledPostRecord,
  CampaignResultRecord,
} from "./demo-workflow";

export const WORKSPACE_SNAPSHOT_VERSION = 1;

export interface PersistedEntityRecord {
  project_id?: string;
  entity_type: string;
  entity_key: string;
  customer_external_id: string | null;
  data: unknown;
}

const record = (
  entity_type: string,
  entity_key: string,
  data: unknown,
  customer_external_id: string | null = null,
): PersistedEntityRecord => ({
  entity_type,
  entity_key,
  customer_external_id,
  data,
});

export function serializeImportedEntities(
  state: DemoWorkflowState,
): PersistedEntityRecord[] {
  const dataset = state.datasets.imported;
  const customerForEvent = (event: AuditEvent) => {
    const direct = dataset.customers.find((customer) =>
      event.entity.includes(customer.id),
    )?.id;
    if (direct) return direct;
    const related = [
      ...dataset.alerts,
      ...state.actions.filter((item) => item.datasetId === "imported"),
      ...state.recommendations.filter((item) => item.datasetId === "imported"),
    ].find((item) => event.entity.includes(item.id));
    return related?.customerId ?? null;
  };
  return [
    ...dataset.customers.map((item) => record("customer", item.id, item, item.id)),
    ...dataset.transactions.map((item) => record("transaction", item.id, item, item.customerId)),
    ...dataset.products.map((item) => record("product", item.id, item)),
    ...Object.values(dataset.tierCalculations).map((item) => record("tier_calculation", item.customerId, item, item.customerId)),
    ...Object.values(dataset.churnCalculations).map((item) => record("churn_calculation", item.customerId, item, item.customerId)),
    ...dataset.analyses.map((item) => record("analysis", item.id, item, item.customerId)),
    ...dataset.signals.map((item) => record("signal", item.id, item, item.customerId)),
    ...dataset.alerts.map((item) => record("alert", item.id, item, item.customerId)),
    ...dataset.responses.map((item) => record("response", item.id, item, item.customerId)),
    ...dataset.outcomes.map((item) => record("outcome", item.id, item, item.customerId)),
    ...dataset.documents.map((item) => record("document", item.id, item)),
    ...state.actions.filter((item) => item.datasetId === "imported").map((item) => record("action", item.id, item, item.customerId)),
    ...state.recommendations.filter((item) => item.datasetId === "imported").map((item) => record("recommendation", item.id, item, item.customerId)),
    ...state.campaigns.filter((item) => item.datasetId === "imported").map((item) => record("campaign", item.id, item)),
    ...state.marketingOpportunities.filter((item) => item.datasetId === "imported").map((item) => record("marketing_opportunity", item.id, item)),
    ...state.scheduledPosts.filter((item) => item.datasetId === "imported").map((item) => record("scheduled_post", item.id, item)),
    ...state.campaignResults.filter((item) => item.datasetId === "imported").map((item) => record("campaign_result", item.id, item)),
    ...state.imports.map((item) => record("import", item.id, item)),
    ...state.events.map((item) => record("event", item.id, item, customerForEvent(item))),
    record("settings", "thresholds", state.thresholds),
  ];
}

export function mergeImportedEntityRecords(
  state: DemoWorkflowState,
  rows: PersistedEntityRecord[],
): DemoWorkflowState {
  const dataset = createDataset("imported");
  const values = <T>(type: string) =>
    rows.filter((row) => row.entity_type === type).map((row) => row.data as T);
  dataset.customers = values<Customer>("customer");
  dataset.transactions = values<OperationalTransaction>("transaction");
  dataset.products = values<OperationalProduct>("product");
  dataset.tierCalculations = Object.fromEntries(
    values<TierCalculation>("tier_calculation").map((item) => [item.customerId, item]),
  );
  dataset.churnCalculations = Object.fromEntries(
    values<ChurnCalculation>("churn_calculation").map((item) => [item.customerId, item]),
  );
  dataset.analyses = values<StoredAnalysis>("analysis");
  dataset.signals = values<ConversationSignal>("signal");
  dataset.alerts = values<DynamicAlert>("alert");
  dataset.responses = values<CustomerResponseRecord>("response");
  dataset.outcomes = values<ActionOutcomeRecord>("outcome");
  dataset.documents = values<DemoWorkflowState["datasets"]["imported"]["documents"][number]>("document");

  const actions = values<RetentionActionRecord>("action");
  const recommendations = values<RecommendationRecord>("recommendation");
  const campaigns = values<CampaignDraft>("campaign");
  const opportunities = values<MarketingOpportunityRecord>("marketing_opportunity");
  const posts = values<ScheduledPostRecord>("scheduled_post");
  const campaignResults = values<CampaignResultRecord>("campaign_result");
  const imports = values<ImportHistoryRecord>("import");
  const events = values<AuditEvent>("event");
  const thresholds = values<DemoWorkflowState["thresholds"]>("settings")[0] ?? state.thresholds;
  const activeCampaign = campaigns[0];
  return {
    ...state,
    datasets: { ...state.datasets, imported: dataset },
    actions: [...state.actions.filter((item) => item.datasetId !== "imported"), ...actions],
    recommendations: [...state.recommendations.filter((item) => item.datasetId !== "imported"), ...recommendations],
    recommendationStatuses: {
      ...state.recommendationStatuses,
      ...Object.fromEntries(recommendations.map((item) => [item.id, item.status === "Submitted" ? "Submitted" : "Draft"])),
    },
    campaigns: [...state.campaigns.filter((item) => item.datasetId !== "imported"), ...campaigns],
    marketingOpportunities: [...state.marketingOpportunities.filter((item) => item.datasetId !== "imported"), ...opportunities],
    scheduledPosts: [...state.scheduledPosts.filter((item) => item.datasetId !== "imported"), ...posts],
    campaignResults: [...state.campaignResults.filter((item) => item.datasetId !== "imported"), ...campaignResults],
    imports,
    events: events.length ? events : state.events,
    thresholds,
    campaign:
      state.activeWorkspace === "imported" && activeCampaign
        ? activeCampaign
        : state.campaign,
    activeCampaignId:
      state.activeWorkspace === "imported" && activeCampaign
        ? activeCampaign.id
        : state.activeCampaignId,
  };
}

export interface ImportedWorkspaceSnapshot {
  version: number;
  dataset: DemoWorkflowState["datasets"]["imported"];
  actions: DemoWorkflowState["actions"];
  recommendations: DemoWorkflowState["recommendations"];
  campaigns: DemoWorkflowState["campaigns"];
  marketingOpportunities: DemoWorkflowState["marketingOpportunities"];
  scheduledPosts: DemoWorkflowState["scheduledPosts"];
  campaignResults: DemoWorkflowState["campaignResults"];
  imports: DemoWorkflowState["imports"];
  events: DemoWorkflowState["events"];
  thresholds: DemoWorkflowState["thresholds"];
  savedAt: string;
}

export function snapshotImportedWorkspace(
  state: DemoWorkflowState,
): ImportedWorkspaceSnapshot {
  return {
    version: WORKSPACE_SNAPSHOT_VERSION,
    dataset: state.datasets.imported,
    actions: state.actions.filter((item) => item.datasetId === "imported"),
    recommendations: state.recommendations.filter(
      (item) => item.datasetId === "imported",
    ),
    campaigns: state.campaigns.filter((item) => item.datasetId === "imported"),
    marketingOpportunities: state.marketingOpportunities.filter(
      (item) => item.datasetId === "imported",
    ),
    scheduledPosts: state.scheduledPosts.filter(
      (item) => item.datasetId === "imported",
    ),
    campaignResults: state.campaignResults.filter(
      (item) => item.datasetId === "imported",
    ),
    imports: state.imports,
    events: state.events,
    thresholds: state.thresholds,
    savedAt: new Date().toISOString(),
  };
}

export function mergeImportedWorkspace(
  state: DemoWorkflowState,
  snapshot: ImportedWorkspaceSnapshot,
): DemoWorkflowState {
  if (snapshot.version !== WORKSPACE_SNAPSHOT_VERSION)
    throw new Error("Unsupported Imported Workspace snapshot version");
  const campaigns = [
    ...state.campaigns.filter((item) => item.datasetId !== "imported"),
    ...snapshot.campaigns,
  ];
  const activeImportedCampaign = snapshot.campaigns[0];
  return {
    ...state,
    datasets: { ...state.datasets, imported: snapshot.dataset },
    actions: [
      ...state.actions.filter((item) => item.datasetId !== "imported"),
      ...snapshot.actions,
    ],
    recommendations: [
      ...state.recommendations.filter((item) => item.datasetId !== "imported"),
      ...snapshot.recommendations,
    ],
    campaigns,
    marketingOpportunities: [
      ...state.marketingOpportunities.filter(
        (item) => item.datasetId !== "imported",
      ),
      ...snapshot.marketingOpportunities,
    ],
    scheduledPosts: [
      ...state.scheduledPosts.filter((item) => item.datasetId !== "imported"),
      ...snapshot.scheduledPosts,
    ],
    campaignResults: [
      ...state.campaignResults.filter((item) => item.datasetId !== "imported"),
      ...snapshot.campaignResults,
    ],
    imports: snapshot.imports,
    events: snapshot.events,
    thresholds: snapshot.thresholds,
    campaign:
      state.activeWorkspace === "imported" && activeImportedCampaign
        ? activeImportedCampaign
        : state.campaign,
    activeCampaignId:
      state.activeWorkspace === "imported" && activeImportedCampaign
        ? activeImportedCampaign.id
        : state.activeCampaignId,
  };
}
