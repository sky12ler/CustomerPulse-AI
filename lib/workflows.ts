import type { Role } from "./types";

export type ApprovalStatus =
  | "Draft"
  | "Pending Approval"
  | "Approved"
  | "Rejected"
  | "Changes Requested"
  | "Cancelled"
  | "Executed";
export interface ApprovalRecord {
  id: string;
  type: "retention" | "campaign" | "export" | "override";
  status: ApprovalStatus;
  requester: string;
  requiredRole: Role;
  approver?: string;
  reviewerComment?: string;
  rejectionReason?: string;
  submittedAt?: string;
  approvedAt?: string;
  executedAt?: string;
}
export function submitApproval(
  record: ApprovalRecord,
  actor: string,
): ApprovalRecord {
  if (record.status !== "Draft")
    throw new Error("Only Draft items can be submitted");
  if (actor !== record.requester)
    throw new Error("Only the requester can submit this draft");
  return {
    ...record,
    status: "Pending Approval",
    submittedAt: new Date().toISOString(),
  };
}
export function reviewApproval(
  record: ApprovalRecord,
  input: {
    actor: string;
    role: Role;
    decision: "Approved" | "Rejected" | "Changes Requested";
    comment: string;
    reason?: string;
  },
): ApprovalRecord {
  if (record.status !== "Pending Approval")
    throw new Error("Only Pending Approval items can be reviewed");
  if (input.actor === "AVO" || input.actor === record.requester)
    throw new Error(
      "Requester and AVO cannot approve their own recommendation",
    );
  if (input.role !== record.requiredRole && input.role !== "Administrator")
    throw new Error(`${record.requiredRole} role is required`);
  if (!input.comment.trim()) throw new Error("Reviewer comment is required");
  if (input.decision === "Rejected" && !input.reason?.trim())
    throw new Error("Rejection reason is required");
  return {
    ...record,
    status: input.decision,
    approver: input.actor,
    reviewerComment: input.comment,
    rejectionReason: input.reason,
    approvedAt:
      input.decision === "Approved" ? new Date().toISOString() : undefined,
  };
}
export function executeApproval(
  record: ApprovalRecord,
  actor: string,
): ApprovalRecord {
  if (record.status !== "Approved")
    throw new Error("Approval is required before execution");
  if (!actor || actor === "AVO")
    throw new Error("An authorised employee must execute the action");
  return {
    ...record,
    status: "Executed",
    executedAt: new Date().toISOString(),
  };
}
export function verifyPromotion(input: {
  promotionPrice?: number | null;
  start?: string | null;
  end?: string | null;
  inventory: string;
  now: string;
}) {
  if (input.promotionPrice == null)
    return { allowed: false, reason: "No approved promotion is recorded" };
  const now = new Date(input.now);
  if (
    !input.start ||
    !input.end ||
    now < new Date(input.start) ||
    now > new Date(input.end)
  )
    return {
      allowed: false,
      reason: "Promotion is outside its approved dates",
    };
  if (input.inventory !== "available")
    return { allowed: false, reason: "Product availability is not verified" };
  return { allowed: true, reason: "Approved product record verified" };
}
export function guardRecommendation(input: {
  promotional: boolean;
  unresolvedSevereComplaint: boolean;
  consent: boolean;
}) {
  if (input.promotional && input.unresolvedSevereComplaint)
    return {
      allowed: false,
      reason: "Resolve severe complaint before promotion",
    };
  if (input.promotional && !input.consent)
    return {
      allowed: false,
      reason: "Marketing consent is absent or withdrawn",
    };
  return { allowed: true, reason: "No deterministic conflict found" };
}
export function createAuditEvent(
  action: string,
  entity: string,
  actor: string,
  role: Role,
  result: string,
) {
  if (!action || !entity || !actor)
    throw new Error("Audit event requires action, entity and actor");
  return {
    id: `AUD-${crypto.randomUUID()}`,
    organization: "CustomerPulse Demo",
    actor,
    role,
    action,
    entity,
    result,
    correlationId: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
}
