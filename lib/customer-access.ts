import type { RetentionActionRecord } from "./demo-workflow";
import type { Customer, Role } from "./types";

export const DEMO_ROLE_OWNER: Partial<Record<Role, string>> = {
  "Account Executive": "Aisha Rahman",
};

export type CustomerAccessResult =
  | { status: "allowed"; customer: Customer }
  | { status: "denied" }
  | { status: "not-found" };

export function accessibleCustomers(
  customers: Customer[],
  role: Role,
): Customer[] {
  const owner = DEMO_ROLE_OWNER[role];
  return owner
    ? customers.filter((customer) => customer.staff === owner)
    : customers;
}

export function lookupAccessibleCustomer(
  customers: Customer[],
  role: Role,
  customerId: string,
): CustomerAccessResult {
  const customer = customers.find((item) => item.id === customerId);
  if (!customer) return { status: "not-found" };
  if (
    !accessibleCustomers(customers, role).some((item) => item.id === customerId)
  )
    return { status: "denied" };
  return { status: "allowed", customer };
}

export function accessibleActions(
  actions: RetentionActionRecord[],
  customers: Customer[],
  role: Role,
) {
  const allowedIds = new Set(
    accessibleCustomers(customers, role).map((customer) => customer.id),
  );
  return actions.filter((action) => allowedIds.has(action.customerId));
}

export function isReadOnlyRole(role: Role) {
  return role === "Auditor";
}

export function canUseCustomerAVO(
  customers: Customer[],
  role: Role,
  customerId: string,
) {
  return (
    lookupAccessibleCustomer(customers, role, customerId).status ===
      "allowed" && !isReadOnlyRole(role)
  );
}
