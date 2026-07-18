import { describe, expect, it } from "vitest";
import { customers, recommendations } from "@/lib/demo-data";
import { detectSegmentDecline } from "@/lib/engines";
describe("required demo scenarios", () => {
  it("A: Strategic customer has critical evidence and service-first action", () => {
    const c = customers.find((x) => x.scenario === "A")!;
    expect(c.tier).toBe("Strategic");
    expect(c.risk).toBe("Critical");
    expect(c.frequencyTrend).toBeLessThan(0);
    expect(c.spendTrend).toBeLessThan(0);
    expect(
      c.messages.filter((m) => /delivery|replacement/i.test(m.text)).length,
    ).toBeGreaterThanOrEqual(2);
    expect(c.messages.some((m) => /cancel/i.test(m.text))).toBe(true);
    expect(
      recommendations.find((r) => r.customerId === c.id)?.action,
    ).toContain("before any promotion");
  });
  it("B: Growth customer has explicit product interest and grounded gap", () => {
    const c = customers.find((x) => x.scenario === "B")!;
    expect(c.tier).toBe("Growth");
    expect(c.sentiment).toBe("Positive");
    expect(c.frequencyTrend).toBeGreaterThan(0);
    expect(c.productGap).toBe("Analytics Suite");
    expect(c.messages.some((m) => /campaign performance/i.test(m.text))).toBe(
      true,
    );
  });
  it("C: 12-customer segment breaches decline and shared-objection trigger", () => {
    const segment = customers.filter(
      (c) =>
        c.scenario === "C" &&
        c.region === "North" &&
        c.industry === "Food & beverage",
    );
    expect(segment.length).toBeGreaterThanOrEqual(12);
    expect(
      segment.filter((c) => c.frequencyTrend < 0).length / segment.length,
    ).toBeGreaterThanOrEqual(0.2);
    expect(
      segment.filter((c) => c.messages.some((m) => /price/i.test(m.text)))
        .length,
    ).toBeGreaterThanOrEqual(4);
    expect(detectSegmentDecline(4, 12, 18, 24, 29).triggered).toBe(true);
  });
  it("D: recovery scenario begins with an actionable high-risk customer", () => {
    const c = customers.find((x) => x.scenario === "D")!;
    expect(c.status).toBe("Needs recovery");
    expect(c.risk).toBe("High");
    expect(c.messages.some((m) => /placed our next order/i.test(m.text))).toBe(
      true,
    );
    expect(c.sentiment).toBe("Positive");
    expect(c.revenueAtRisk).toBeGreaterThan(0);
  });
});
