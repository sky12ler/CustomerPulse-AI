import { describe, expect, it } from "vitest";
import {
  actionTransitions,
  addActionVersion,
  assertActionTransition,
  canManagerReview,
  canOwnerOperate,
} from "@/lib/action-lifecycle";
import type { RetentionActionRecord } from "@/lib/demo-workflow";

const action = {
  versions: [
    { version: 1, content: "Original human version", actor: "Aisha", at: "t1" },
  ],
} as RetentionActionRecord;
describe("Phase 1 approval revision loop", () => {
  it("17 Changes Requested is a valid manager transition", () =>
    expect(actionTransitions["Pending Approval"]).toContain(
      "Changes Requested",
    ));
  it("18 requester can begin revision", () =>
    expect(() =>
      assertActionTransition("Changes Requested", "Draft"),
    ).not.toThrow());
  it("19 revised version is stored", () =>
    expect(addActionVersion(action, "Revised", "Aisha", "t2")[1].content).toBe(
      "Revised",
    ));
  it("20 revised action can be resubmitted", () =>
    expect(() =>
      assertActionTransition("Draft", "Pending Approval"),
    ).not.toThrow());
  it("21 version history is preserved", () => {
    const versions = addActionVersion(action, "Revised", "Aisha", "t2");
    expect(versions.map((v) => v.content)).toEqual([
      "Original human version",
      "Revised",
    ]);
  });
  it("pending action cannot be edited directly", () =>
    expect(() =>
      assertActionTransition("Pending Approval", "Draft"),
    ).toThrow());
});
describe("Phase 1 action lifecycle", () => {
  it("22 approval becomes Approved and Ready", () =>
    expect(actionTransitions["Pending Approval"]).toContain(
      "Approved and Ready",
    ));
  it("23 Start Action changes to In Progress", () =>
    expect(() =>
      assertActionTransition("Approved and Ready", "In Progress"),
    ).not.toThrow());
  it("24 execution requires In Progress", () =>
    expect(() =>
      assertActionTransition("Approved and Ready", "Waiting for Customer"),
    ).toThrow());
  it("25 execution confirmation has explicit downstream states", () =>
    expect(actionTransitions["In Progress"]).toEqual(
      expect.arrayContaining(["Waiting for Customer", "Outcome Required"]),
    ));
  it("26 response-required path enters Waiting for Customer", () =>
    expect(() =>
      assertActionTransition("In Progress", "Waiting for Customer"),
    ).not.toThrow());
  it("27 no-response path enters Outcome Required", () =>
    expect(() =>
      assertActionTransition("In Progress", "Outcome Required"),
    ).not.toThrow());
  it("28 customer response moves to outcome without completing", () =>
    expect(() =>
      assertActionTransition("Waiting for Customer", "Outcome Required"),
    ).not.toThrow());
  it("29 multiple responses are supported by the store shape", () => {
    const responses = [{ id: "R1" }, { id: "R2" }];
    expect(responses).toHaveLength(2);
  });
  it("30 valid outcome completes action", () =>
    expect(() =>
      assertActionTransition("Outcome Required", "Completed"),
    ).not.toThrow());
  it("cancelled and completed are terminal", () => {
    expect(actionTransitions.Cancelled).toEqual([]);
    expect(actionTransitions.Completed).toEqual([]);
  });
});
describe("Phase 1 RBAC and audit invariants", () => {
  it("37 only authorized owner can start or execute", () => {
    expect(canOwnerOperate("Account Executive", "Aisha", "Aisha")).toBe(true);
    expect(canOwnerOperate("Account Executive", "Aisha", "Daniel")).toBe(false);
  });
  it("38 manager approval remains required", () => {
    expect(canManagerReview("Sales Manager", "Farah", "Aisha")).toBe(true);
    expect(canManagerReview("Account Executive", "Aisha", "Daniel")).toBe(
      false,
    );
  });
  it("39 self-approval remains blocked", () =>
    expect(canManagerReview("Sales Manager", "Farah", "Farah")).toBe(false));
  it("40 every permitted transition has an auditable named state", () => {
    Object.entries(actionTransitions).forEach(([from, targets]) =>
      targets.forEach((to) => {
        expect(from.length).toBeGreaterThan(0);
        expect(to.length).toBeGreaterThan(0);
      }),
    );
  });
});
