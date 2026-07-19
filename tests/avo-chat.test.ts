import { describe, expect, it } from "vitest";
import { deterministicChatAnswer, type AvoChatContext } from "@/lib/avo-chat";

const context: AvoChatContext = {
  workspace: "imported",
  role: "Administrator",
  customers: [
    { id: "C-1", name: "Lower Risk", company: "One", tier: "Core", risk: "Medium", riskScore: 45, revenueAtRisk: 1000, staff: "Aisha", sentiment: "Neutral" },
    { id: "C-2", name: "Highest Risk", company: "Two", tier: "Strategic", risk: "Critical", riskScore: 91, revenueAtRisk: 9000, staff: "Aisha", sentiment: "Negative" },
  ],
  alerts: [],
  actions: [{ id: "ACT-1", customerId: "C-2", customer: "Highest Risk", status: "Pending Approval", owner: "Aisha", action: "Review" }],
  campaigns: [],
  opportunities: [{ id: "MKT-1", title: "West decline", affectedPercentage: 67, confidence: "Medium" }],
};

describe("AVO operational chat fallback", () => {
  it("responds naturally to greetings", () =>
    expect(deterministicChatAnswer("Hi", context)).toMatch(/Hello!/));
  it("answers highest-risk questions from current context", () =>
    expect(deterministicChatAnswer("Find the highest risk customer", context)).toContain("Highest Risk (C-2)"));
  it("summarizes approvals and opportunities", () => {
    expect(deterministicChatAnswer("What awaits approval?", context)).toContain("1 retention action");
    expect(deterministicChatAnswer("Which segment is declining?", context)).toContain("West decline (MKT-1)");
  });
});
