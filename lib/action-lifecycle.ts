import type { ActionStatus, RetentionActionRecord } from "./demo-workflow";
import type { Role } from "./types";

export const actionTransitions: Record<ActionStatus, ActionStatus[]> = {
  Draft: ["Pending Approval", "Cancelled"],
  "Pending Approval": ["Approved and Ready", "Changes Requested", "Rejected"],
  "Changes Requested": ["Draft", "Cancelled"],
  Rejected: [],
  "Approved and Ready": ["In Progress", "Cancelled"],
  "In Progress": ["Waiting for Customer", "Outcome Required", "Cancelled"],
  "Waiting for Customer": ["Outcome Required", "Cancelled"],
  "Outcome Required": ["Completed", "Cancelled"],
  Completed: [],
  "Not Completed": ["In Progress", "Cancelled"],
  Cancelled: [],
};
export function assertActionTransition(from: ActionStatus, to: ActionStatus) {
  if (!actionTransitions[from].includes(to))
    throw new Error("Invalid action transition: " + from + " -> " + to);
}
export function canManagerReview(role: Role, actor: string, requester: string) {
  return (
    (role === "Sales Manager" || role === "Administrator") &&
    actor !== requester
  );
}
export function canOwnerOperate(role: Role, actor: string, owner: string) {
  return (
    role === "Administrator" ||
    (role === "Account Executive" && actor === owner)
  );
}
export function addActionVersion(
  action: RetentionActionRecord,
  content: string,
  actor: string,
  at: string,
) {
  return [
    ...action.versions,
    { version: action.versions.length + 1, content, actor, at },
  ];
}
