import { describe, expect, it } from "vitest";
import { customers } from "@/lib/demo-data";
import { createDataset } from "@/lib/operational";
import {
  calculateCampaignAudience,
  calculateMarketingOpportunities,
  calculateSegmentAudience,
} from "@/lib/marketing-operational";

const thresholds = {
  riskSegment: 20,
  revenue: 15,
  frequency: 20,
  engagement: 25,
};

describe("operational Marketing Intelligence", () => {
  it("calculates the demo segment from operational records with stable provenance", () => {
    const dataset = createDataset("demo", customers);
    const opportunity = calculateMarketingOpportunities(dataset, thresholds).find(
      (item) => item.id === "MKT-003",
    );
    expect(opportunity).toBeTruthy();
    expect(opportunity?.segmentKey).toBe("North::Food & beverage");
    expect(opportunity?.calculationVersion).toBe("segment-decline-v1");
    expect(opportunity?.evidence.length).toBeGreaterThan(2);
    expect(opportunity?.affectedCustomerIds.length).toBeGreaterThan(0);
  });

  it("excludes withdrawn consent from the calculated campaign audience", () => {
    const dataset = createDataset("demo", customers);
    const opportunity = calculateMarketingOpportunities(dataset, thresholds).find(
      (item) => item.id === "MKT-003",
    )!;
    const audience = calculateCampaignAudience(dataset, opportunity, ["Email"]);
    expect(audience.includedCustomerIds).not.toContain("CUS-1005");
    expect(audience.exclusions.find((item) => item.customerId === "CUS-1005")?.reason).toContain("consent");
    expect(audience.total).toBe(
      dataset.customers.filter(
        (item) => item.region === "North" && item.industry === "Food & beverage",
      ).length,
    );
  });

  it("excludes missing contact details for the selected channel", () => {
    const dataset = createDataset("demo", [
      ...customers,
      { ...customers[0], id: "NO-EMAIL", region: "North", industry: "Food & beverage", consent: true, email: "" },
    ]);
    const audience = calculateSegmentAudience(dataset, "North", "Food & beverage", ["Email"]);
    expect(audience.includedCustomerIds).not.toContain("NO-EMAIL");
    expect(audience.exclusions.find((item) => item.customerId === "NO-EMAIL")?.reason).toContain("no email");
  });

  it("preserves a dismissal only until the underlying signature changes", () => {
    const dataset = createDataset("demo", customers);
    const first = calculateMarketingOpportunities(dataset, thresholds);
    const dismissed = first.map((item) =>
      item.id === "MKT-003" ? { ...item, status: "Dismissed" as const, dismissalReason: "Reviewed" } : item,
    );
    expect(calculateMarketingOpportunities(dataset, thresholds, dismissed).find((item) => item.id === "MKT-003")?.status).toBe("Dismissed");
    const changed = {
      ...dataset,
      customers: dataset.customers.map((item) =>
        item.id === "CUS-1006" ? { ...item, frequencyTrend: item.frequencyTrend - 30 } : item,
      ),
    };
    expect(calculateMarketingOpportunities(changed, thresholds, dismissed).find((item) => item.id === "MKT-003")?.status).toBe("Active");
  });
});
