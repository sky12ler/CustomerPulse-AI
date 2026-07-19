import { detectSegmentDecline } from "./engines";
import type {
  AudienceExclusion,
  MarketingOpportunityRecord,
  OpportunityStatus,
} from "./demo-workflow";
import type { OperationalDataset, WorkspaceKind } from "./operational";
import type { Customer } from "./types";

export interface MarketingThresholds {
  riskSegment: number;
  revenue: number;
  frequency: number;
  engagement: number;
}

const CALCULATION_VERSION = "segment-decline-v1";
const MIN_SEGMENT_SIZE = 4;

const safePercent = (current: number, baseline: number) =>
  baseline > 0 ? Math.max(0, Math.round(((baseline - current) / baseline) * 100)) : 0;

const average = (values: number[]) =>
  values.length
    ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
    : 0;

const stableId = (datasetId: WorkspaceKind, region: string, industry: string) => {
  if (datasetId === "demo" && region === "North" && industry === "Food & beverage")
    return "MKT-003";
  let hash = 0;
  for (const character of `${datasetId}:${region}:${industry}`)
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return `MKT-${datasetId.toUpperCase()}-${String(hash).slice(0, 6)}`;
};

const revenueFor = (dataset: OperationalDataset, customer: Customer) =>
  dataset.churnCalculations[customer.id]?.eligibleRevenueBase ?? 0;

const engagementDeclineFor = (customer: Customer) => {
  const negative = customer.sentiment === "Negative" ? 35 : 0;
  const inactive = Math.max(
    0,
    Math.min(45, Math.floor((Date.now() - new Date(customer.lastPurchase).getTime()) / 86400000 / 5)),
  );
  return Math.max(negative, inactive);
};

export function calculateMarketingOpportunities(
  dataset: OperationalDataset,
  thresholds: MarketingThresholds,
  previous: MarketingOpportunityRecord[] = [],
): MarketingOpportunityRecord[] {
  const groups = new Map<string, Customer[]>();
  for (const customer of dataset.customers) {
    const key = `${customer.region}::${customer.industry}`;
    groups.set(key, [...(groups.get(key) ?? []), customer]);
  }

  return ([...groups.entries()]
    .filter(([, customers]) => customers.length >= MIN_SEGMENT_SIZE)
    .map(([segmentKey, customers]) => {
      const [region, industry] = segmentKey.split("::");
      const currentRevenue = customers.reduce(
        (sum, customer) => sum + revenueFor(dataset, customer),
        0,
      );
      const baselineRevenue = Math.round(
        customers.reduce((sum, customer) => {
          const current = revenueFor(dataset, customer);
          const multiplier = Math.max(0.15, 1 + customer.spendTrend / 100);
          return sum + current / multiplier;
        }, 0),
      );
      const revenueDecline = safePercent(currentRevenue, baselineRevenue);
      const frequencyDecline = Math.max(
        0,
        -average(customers.map((customer) => customer.frequencyTrend)),
      );
      const engagementDecline = average(
        customers.map(engagementDeclineFor),
      );
      const affected = customers.filter((customer) => {
        const calc = dataset.churnCalculations[customer.id];
        return (
          ["High", "Critical"].includes(calc?.risk ?? customer.risk) ||
          customer.frequencyTrend <= -thresholds.frequency ||
          customer.spendTrend <= -thresholds.revenue ||
          engagementDeclineFor(customer) >= thresholds.engagement
        );
      });
      const detection = detectSegmentDecline(
        affected.length,
        customers.length,
        revenueDecline,
        frequencyDecline,
        engagementDecline,
      );
      if (!detection.triggered) return null;

      const id = stableId(dataset.id, region, industry);
      const signature = [
        affected.map((customer) => customer.id).sort().join(","),
        revenueDecline,
        frequencyDecline,
        engagementDecline,
      ].join("|");
      const old = previous.find((item) => item.id === id);
      const preservedStatus: OpportunityStatus =
        old?.status === "Dismissed" && old.signature === signature
          ? "Dismissed"
          : old?.status === "Monitoring"
            ? "Monitoring"
            : "Active";
      const commonDrivers = [
        frequencyDecline >= thresholds.frequency && "Purchase frequency decline",
        revenueDecline >= thresholds.revenue && "Revenue decline",
        engagementDecline >= thresholds.engagement && "Engagement decline",
        affected.some((customer) => ["High", "Critical"].includes(customer.risk)) &&
          "Elevated churn risk",
      ].filter(Boolean) as string[];
      const confidence: MarketingOpportunityRecord["confidence"] =
        customers.length >= 10 && commonDrivers.length >= 2
          ? "High"
          : customers.length >= 6
            ? "Medium"
            : "Low";
      const calculatedAt = new Date().toISOString();
      return {
        id,
        datasetId: dataset.id,
        segmentKey,
        region,
        industry,
        title: `${region} ${industry.replace(/\b\w/g, (letter) => letter.toUpperCase())} decline`,
        status: preservedStatus,
        totalCustomers: customers.length,
        affectedCustomerIds: affected.map((customer) => customer.id),
        affectedPercentage: detection.affectedPercentage,
        baselineRevenue,
        currentRevenue,
        revenueDecline,
        frequencyDecline,
        engagementDecline,
        commonDrivers,
        evidence: [
          `${affected.length} of ${customers.length} customers meet a decline or risk threshold`,
          `Eligible 90-day revenue base changed from ${baselineRevenue} to ${currentRevenue}`,
          `Mean purchase-frequency change is ${-frequencyDecline}%`,
          `Calculated engagement decline is ${engagementDecline}%`,
        ],
        confidence,
        uncertainty:
          "Segment signals show association, not campaign causation. Small samples and incomplete imported history reduce confidence.",
        reasons: detection.reasons.map(String),
        calculationVersion: CALCULATION_VERSION,
        baselinePeriod: "Previous comparable 90-day run-rate",
        currentPeriod: "Current 90-day run-rate",
        calculatedAt,
        nextEvaluationAt: new Date(Date.now() + 7 * 86400000).toISOString(),
        signature,
        dismissalReason:
          preservedStatus === "Dismissed" ? old?.dismissalReason : undefined,
      };
    })
    .filter(Boolean) as MarketingOpportunityRecord[])
    .sort((a, b) => b.affectedPercentage - a.affectedPercentage);
}

export function calculateCampaignAudience(
  dataset: OperationalDataset,
  opportunity: MarketingOpportunityRecord,
  channels: string[],
): {
  total: number;
  includedCustomerIds: string[];
  exclusions: AudienceExclusion[];
} {
  return calculateSegmentAudience(
    dataset,
    opportunity.region,
    opportunity.industry,
    channels,
  );
}

export function calculateSegmentAudience(
  dataset: OperationalDataset,
  region: string,
  industry: string,
  channels: string[],
): {
  total: number;
  includedCustomerIds: string[];
  exclusions: AudienceExclusion[];
} {
  const candidates = dataset.customers.filter(
    (customer) =>
      customer.region === region && customer.industry === industry,
  );
  const exclusions: AudienceExclusion[] = [];
  const includedCustomerIds: string[] = [];
  for (const customer of candidates) {
    let reason = "";
    if (!customer.consent) reason = "Marketing consent is withdrawn or missing";
    else if (channels.includes("Email") && !customer.email)
      reason = "Email channel selected but no email address is available";
    else if (channels.includes("WhatsApp") && !customer.phone)
      reason = "WhatsApp channel selected but no phone number is available";
    if (reason) exclusions.push({ customerId: customer.id, reason });
    else includedCustomerIds.push(customer.id);
  }
  return { total: candidates.length, includedCustomerIds, exclusions };
}
