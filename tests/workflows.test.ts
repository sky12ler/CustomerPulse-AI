import { describe, expect, it } from "vitest";
import {
  createAuditEvent,
  executeApproval,
  guardRecommendation,
  reviewApproval,
  submitApproval,
  verifyPromotion,
  type ApprovalRecord,
} from "@/lib/workflows";
const draft: ApprovalRecord = {
  id: "APR-1",
  type: "retention",
  status: "Draft",
  requester: "Aisha",
  requiredRole: "Sales Manager",
};
describe("approval enforcement", () => {
  it("enforces submission, separate manager approval and execution order", () => {
    const pending = submitApproval(draft, "Aisha");
    expect(pending.status).toBe("Pending Approval");
    expect(() =>
      reviewApproval(pending, {
        actor: "Aisha",
        role: "Sales Manager",
        decision: "Approved",
        comment: "ok",
      }),
    ).toThrow("cannot approve");
    expect(() =>
      reviewApproval(pending, {
        actor: "AVO",
        role: "Administrator",
        decision: "Approved",
        comment: "ok",
      }),
    ).toThrow("cannot approve");
    expect(() =>
      reviewApproval(pending, {
        actor: "Mina",
        role: "Marketing Manager",
        decision: "Approved",
        comment: "ok",
      }),
    ).toThrow("Sales Manager");
    const approved = reviewApproval(pending, {
      actor: "Farah",
      role: "Sales Manager",
      decision: "Approved",
      comment: "Evidence checked",
    });
    expect(approved.approver).toBe("Farah");
    expect(executeApproval(approved, "Aisha").status).toBe("Executed");
  });
  it("requires reviewer comments and rejection reasons", () => {
    const pending = submitApproval(draft, "Aisha");
    expect(() =>
      reviewApproval(pending, {
        actor: "Farah",
        role: "Sales Manager",
        decision: "Approved",
        comment: "",
      }),
    ).toThrow("comment");
    expect(() =>
      reviewApproval(pending, {
        actor: "Farah",
        role: "Sales Manager",
        decision: "Rejected",
        comment: "Reviewed",
      }),
    ).toThrow("reason");
  });
});
describe("deterministic conflicts", () => {
  it("blocks promotion during severe complaint and without consent", () => {
    expect(
      guardRecommendation({
        promotional: true,
        unresolvedSevereComplaint: true,
        consent: true,
      }).allowed,
    ).toBe(false);
    expect(
      guardRecommendation({
        promotional: true,
        unresolvedSevereComplaint: false,
        consent: false,
      }).reason,
    ).toContain("consent");
  });
  it("blocks expired or unavailable promotions", () => {
    expect(
      verifyPromotion({
        promotionPrice: 99,
        start: "2026-01-01",
        end: "2026-01-31",
        inventory: "available",
        now: "2026-07-01",
      }).allowed,
    ).toBe(false);
    expect(
      verifyPromotion({
        promotionPrice: 99,
        start: "2026-01-01",
        end: "2026-12-31",
        inventory: "limited",
        now: "2026-07-01",
      }).allowed,
    ).toBe(false);
    expect(
      verifyPromotion({
        promotionPrice: 99,
        start: "2026-01-01",
        end: "2026-12-31",
        inventory: "available",
        now: "2026-07-01",
      }).allowed,
    ).toBe(true);
  });
  it("creates complete audit events", () => {
    const e = createAuditEvent(
      "Approval",
      "ACT-1",
      "Farah",
      "Sales Manager",
      "Approved",
    );
    expect(e.organization).toBe("CustomerPulse Demo");
    expect(e.correlationId).toBeTruthy();
    expect(e.timestamp).toMatch(/^\d{4}-/);
  });
});
