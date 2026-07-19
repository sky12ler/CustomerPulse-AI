import type { RetentionActionRecord } from "./demo-workflow";
import type { DynamicAlert, OperationalDataset } from "./operational";
import type { Customer, Risk, Tier } from "./types";

export const CUSTOMER_PAGE_SIZES = [10, 25, 50] as const;
export type CustomerSortKey =
  | "default"
  | "name"
  | "tier"
  | "risk"
  | "revenue"
  | "owner"
  | "conversation"
  | "deadline";
export type SortDirection = "asc" | "desc";
export interface CustomerFilters {
  query: string;
  tiers: Tier[];
  risks: Risk[];
  owner: string;
  region: string;
  industry: string;
  consent: "All" | "Granted" | "Withdrawn";
  activeAlert: "All" | "Yes" | "No";
  pendingAction: "All" | "Yes" | "No";
  overdueAction: "All" | "Yes" | "No";
  sentiment: "All" | "Positive" | "Neutral" | "Negative";
  status: string;
}
export interface CustomerOperationalRow {
  customer: Customer;
  calculation: OperationalDataset["churnCalculations"][string] | undefined;
  alert: DynamicAlert | undefined;
  action: RetentionActionRecord | undefined;
  overdue: boolean;
  lastConversation: string;
  deadline: string;
}
export const emptyCustomerFilters = (): CustomerFilters => ({
  query: "",
  tiers: [],
  risks: [],
  owner: "",
  region: "",
  industry: "",
  consent: "All",
  activeAlert: "All",
  pendingAction: "All",
  overdueAction: "All",
  sentiment: "All",
  status: "",
});
const activeStatuses = new Set([
  "Draft",
  "Pending Approval",
  "Changes Requested",
  "Approved and Ready",
  "In Progress",
  "Waiting for Customer",
  "Outcome Required",
]);
export function operationalCustomerRows(
  dataset: OperationalDataset,
  actions: RetentionActionRecord[],
  customers: Customer[],
): CustomerOperationalRow[] {
  return customers.map((customer) => {
    const customerActions = actions.filter(
      (action) =>
        action.customerId === customer.id && activeStatuses.has(action.status),
    );
    const action = customerActions.sort((a, b) =>
      a.deadline.localeCompare(b.deadline),
    )[0];
    const deadline = action?.responseDeadline ?? action?.deadline ?? "";
    return {
      customer,
      calculation: dataset.churnCalculations[customer.id],
      alert: dataset.alerts.find(
        (alert) =>
          alert.customerId === customer.id && alert.status === "Active",
      ),
      action,
      overdue: Boolean(deadline && new Date(deadline).getTime() < Date.now()),
      lastConversation:
        customer.messages
          .map((message) => message.sentAt)
          .sort()
          .at(-1) ?? "",
      deadline,
    };
  });
}
export function filterCustomerRows(
  rows: CustomerOperationalRow[],
  filters: CustomerFilters,
) {
  const yesNo = (value: "All" | "Yes" | "No", condition: boolean) =>
    value === "All" || (value === "Yes" ? condition : !condition);
  const q = filters.query.trim().toLowerCase();
  return rows.filter(
    ({ customer, alert, action, overdue }) =>
      (!q ||
        (customer.name + " " + customer.company + " " + customer.id)
          .toLowerCase()
          .includes(q)) &&
      (!filters.tiers.length || filters.tiers.includes(customer.tier)) &&
      (!filters.risks.length || filters.risks.includes(customer.risk)) &&
      (!filters.owner || customer.staff === filters.owner) &&
      (!filters.region || customer.region === filters.region) &&
      (!filters.industry || customer.industry === filters.industry) &&
      (filters.consent === "All" ||
        (filters.consent === "Granted") === customer.consent) &&
      yesNo(filters.activeAlert, Boolean(alert)) &&
      yesNo(filters.pendingAction, action?.status === "Pending Approval") &&
      yesNo(filters.overdueAction, overdue) &&
      (filters.sentiment === "All" ||
        customer.sentiment === filters.sentiment) &&
      (!filters.status || customer.status === filters.status),
  );
}
const riskRank: Record<Risk, number> = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
};
const tierRank: Record<Tier, number> = {
  Strategic: 0,
  Core: 1,
  Growth: 2,
  Standard: 3,
};
export function sortCustomerRows(
  rows: CustomerOperationalRow[],
  key: CustomerSortKey,
  direction: SortDirection,
) {
  const factor = direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    if (key === "default")
      return (
        riskRank[a.customer.risk] - riskRank[b.customer.risk] ||
        Number(b.overdue) - Number(a.overdue) ||
        b.customer.revenueAtRisk - a.customer.revenueAtRisk ||
        (a.deadline || "9999").localeCompare(b.deadline || "9999") ||
        a.customer.name.localeCompare(b.customer.name)
      );
    const values: Record<
      Exclude<CustomerSortKey, "default">,
      [string | number, string | number]
    > = {
      name: [a.customer.name, b.customer.name],
      tier: [tierRank[a.customer.tier], tierRank[b.customer.tier]],
      risk: [a.customer.riskScore, b.customer.riskScore],
      revenue: [a.customer.revenueAtRisk, b.customer.revenueAtRisk],
      owner: [a.customer.staff, b.customer.staff],
      conversation: [a.lastConversation, b.lastConversation],
      deadline: [a.deadline || "9999", b.deadline || "9999"],
    };
    const [left, right] = values[key];
    return (
      (typeof left === "number" && typeof right === "number"
        ? left - right
        : String(left).localeCompare(String(right))) * factor
    );
  });
}
export function estimatedRevenueAtRisk(base: number, probability: number) {
  return Math.round(base * Math.max(0, Math.min(1, probability)));
}
