import { describe, expect, it } from "vitest";
import { audits } from "@/lib/demo-data";
import { createInitialDemoState } from "@/lib/demo-workflow";
import {
  emptyCustomerFilters,
  estimatedRevenueAtRisk,
  filterCustomerRows,
  operationalCustomerRows,
  sortCustomerRows,
} from "@/lib/customer-selectors";
import { applyRevenueAtRiskOverride } from "@/lib/operational";

describe("Phase 2 customer selectors and ERAR", () => {
  const state = createInitialDemoState(audits);
  const dataset = state.datasets.demo;
  const rows = operationalCustomerRows(
    dataset,
    state.actions,
    dataset.customers,
  );

  it("calculates ERAR as eligible revenue times normalized probability", () => {
    expect(estimatedRevenueAtRisk(100000, 0.37)).toBe(37000);
    expect(estimatedRevenueAtRisk(100000, 2)).toBe(100000);
    expect(estimatedRevenueAtRisk(100000, -1)).toBe(0);
  });

  it("keeps every seeded display amount consistent with ERAR-v1 components", () => {
    for (const customer of dataset.customers) {
      const calculation = dataset.churnCalculations[customer.id];
      expect(calculation.revenueCalculationVersion).toBe("ERAR-v1");
      expect(calculation.estimatedRevenueAtRisk).toBe(
        Math.round(
          calculation.eligibleRevenueBase * calculation.churnProbability,
        ),
      );
      expect(customer.revenueAtRisk).toBe(calculation.estimatedRevenueAtRisk);
    }
  });

  it("keeps Maya Tan mathematically consistent", () => {
    const maya = dataset.customers.find(
      (customer) => customer.name === "Maya Tan",
    )!;
    const calculation = dataset.churnCalculations[maya.id];
    expect(maya.revenueAtRisk).toBe(calculation.estimatedRevenueAtRisk);
    expect(calculation.estimatedRevenueAtRisk).toBe(
      Math.round(
        calculation.eligibleRevenueBase * calculation.churnProbability,
      ),
    );
  });

  it("requires a reason for a manual override and returns an audit record", () => {
    const id = dataset.customers[0].id;
    expect(() =>
      applyRevenueAtRiskOverride(dataset, id, 50, "", "Admin"),
    ).toThrow(/reason is required/);
    const output = applyRevenueAtRiskOverride(
      dataset,
      id,
      50,
      "Reviewed forecast",
      "Admin",
    );
    expect(output.dataset.churnCalculations[id].revenueOverride?.reason).toBe(
      "Reviewed forecast",
    );
    expect(output.audit).toMatchObject({
      customerId: id,
      after: 50,
      user: "Admin",
    });
  });

  it("defaults to risk priority and overdue before revenue", () => {
    const sorted = sortCustomerRows(rows, "default", "asc");
    const rank = { Critical: 0, High: 1, Medium: 2, Low: 3 } as const;
    for (let index = 1; index < sorted.length; index += 1) {
      expect(rank[sorted[index - 1].customer.risk]).toBeLessThanOrEqual(
        rank[sorted[index].customer.risk],
      );
    }
  });

  it("combines search, tier, risk, owner and consent filters", () => {
    const target = dataset.customers.find((customer) => customer.consent)!;
    const filters = emptyCustomerFilters();
    filters.query = target.name;
    filters.tiers = [target.tier];
    filters.risks = [target.risk];
    filters.owner = target.staff;
    filters.consent = "Granted";
    const result = filterCustomerRows(rows, filters);
    expect(result.map((row) => row.customer.id)).toEqual([target.id]);
  });

  it("sorts revenue and names in both directions", () => {
    const ascending = sortCustomerRows(rows, "name", "asc");
    const descending = sortCustomerRows(rows, "revenue", "desc");
    expect(
      ascending[0].customer.name.localeCompare(ascending.at(-1)!.customer.name),
    ).toBeLessThanOrEqual(0);
    expect(descending[0].customer.revenueAtRisk).toBeGreaterThanOrEqual(
      descending.at(-1)!.customer.revenueAtRisk,
    );
  });
});
