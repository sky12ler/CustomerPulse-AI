import { describe, expect, it } from "vitest";
import { customers, audits } from "@/lib/demo-data";
import { createInitialDemoState } from "@/lib/demo-workflow";
import {
  accessibleActions,
  accessibleCustomers,
  canUseCustomerAVO,
  lookupAccessibleCustomer,
  isReadOnlyRole,
} from "@/lib/customer-access";

describe("Phase 2 customer authorization", () => {
  const state = createInitialDemoState(audits);
  const assigned = accessibleCustomers(customers, "Account Executive");

  it("scopes the demo Account Executive to Aisha Rahman", () => {
    expect(assigned.length).toBeGreaterThan(0);
    expect(
      assigned.every((customer) => customer.staff === "Aisha Rahman"),
    ).toBe(true);
    expect(assigned.length).toBeLessThan(customers.length);
  });

  it("denies direct lookup of another executive customer without returning data", () => {
    const other = customers.find(
      (customer) => customer.staff !== "Aisha Rahman",
    )!;
    expect(
      lookupAccessibleCustomer(customers, "Account Executive", other.id),
    ).toEqual({ status: "denied" });
  });

  it("returns not-found separately from access denied", () => {
    expect(
      lookupAccessibleCustomer(customers, "Account Executive", "CUS-NOT-REAL"),
    ).toEqual({ status: "not-found" });
  });

  it.each(["Administrator", "Sales Manager"] as const)(
    "retains wide customer access for %s",
    (role) => {
      expect(accessibleCustomers(customers, role)).toHaveLength(
        customers.length,
      );
    },
  );

  it("scopes retention actions to authorized customers", () => {
    const actions = accessibleActions(
      state.actions,
      customers,
      "Account Executive",
    );
    const ids = new Set(assigned.map((customer) => customer.id));
    expect(actions.every((action) => ids.has(action.customerId))).toBe(true);
  });

  it("blocks AVO for an unassigned customer and all Auditor writes", () => {
    const other = customers.find(
      (customer) => customer.staff !== "Aisha Rahman",
    )!;
    const own = assigned[0];
    expect(canUseCustomerAVO(customers, "Account Executive", other.id)).toBe(
      false,
    );
    expect(canUseCustomerAVO(customers, "Account Executive", own.id)).toBe(
      true,
    );
    expect(canUseCustomerAVO(customers, "Auditor", own.id)).toBe(false);
    expect(isReadOnlyRole("Auditor")).toBe(true);
  });
});
