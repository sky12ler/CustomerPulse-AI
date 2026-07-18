import type { AuditEvent, Risk, Role, Tier } from "./types";
import type { ImportResult } from "./imports";
import { customers as seedCustomers } from "./demo-data";
import {
  createDataset,
  type ImportCommitSummary,
  type OperationalDataset,
  type WorkspaceKind,
} from "./operational";

export type ActionStatus =
  | "Draft"
  | "Pending Approval"
  | "Changes Requested"
  | "Rejected"
  | "Approved and Ready"
  | "In Progress"
  | "Waiting for Customer"
  | "Outcome Required"
  | "Completed"
  | "Cancelled";

export type CampaignStatus =
  | "Draft"
  | "Pending Approval"
  | "Changes Requested"
  | "Approved"
  | "Rejected"
  | "Scheduled"
  | "Published"
  | "Failed"
  | "Cancelled";

export interface ApprovalHistoryItem {
  status: string;
  actor: string;
  role: string;
  comment: string;
  at: string;
}

export interface RetentionActionRecord {
  id: string;
  datasetId: WorkspaceKind;
  sourceType: string;
  recommendationId: string;
  alertId: string;
  customerId: string;
  customerName: string;
  tier: Tier;
  risk: Risk;
  recommendation: string;
  explanation: string;
  priority: "Urgent" | "High" | "Medium" | "Low";
  actionType: string;
  owner: string;
  approver: string;
  requester: string;
  deadline: string;
  status: ActionStatus;
  approvalStatus: string;
  executionStatus: string;
  confidence: string;
  uncertainty: string;
  evidence: string[];
  originalAvoOutput: string;
  humanEditedOutput: string;
  reviewerComment: string;
  rejectionReason: string;
  outcome: string;
  customerResponse: string;
  submittedAt?: string;
  approvedAt?: string;
  startedAt?: string;
  startedBy?: string;
  executedAt?: string;
  executedBy?: string;
  responseExpected?: boolean;
  responseDeadline?: string;
  completedAt?: string;
  versions: Array<{
    version: number;
    content: string;
    actor: string;
    at: string;
  }>;
  history: ApprovalHistoryItem[];
}

export interface ImportHistoryRecord {
  id: string;
  type: string;
  filename: string;
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
  recordsAdded: number;
  recordsUpdated: number;
  recordsRejected: number;
  chunksCreated: number;
  uploader: string;
  at: string;
  result: ImportResult;
}

export interface CampaignDraft {
  id: string;
  datasetId: WorkspaceKind;
  sourceType: string;
  triggerId: string;
  status: CampaignStatus;
  step: number;
  name: string;
  objective: string;
  problem: string;
  expectedOutcome: string;
  channels: string[];
  startDate: string;
  endDate: string;
  segment: string;
  totalAudience: number;
  consentedAudience: number;
  excludedAudience: number;
  sources: string[];
  generated: boolean;
  content: Record<string, string>;
  versions: Array<{
    version: number;
    at: string;
    content: Record<string, string>;
  }>;
  confirmations: Record<string, boolean>;
  requester: string;
  reviewer: string;
  reviewerComment: string;
  approvalHistory: ApprovalHistoryItem[];
  scheduleDate: string;
  scheduleTime: string;
  timeZone: string;
  publisher: "Demo Publisher" | "Buffer";
}

export interface ScheduledPostRecord {
  id: string;
  datasetId: WorkspaceKind;
  sourceType: string;
  campaignId: string;
  campaignName: string;
  channel: string;
  date: string;
  time: string;
  timeZone: string;
  status: CampaignStatus;
  provider: string;
  approver: string;
  publisherId: string;
  triggerId: string;
  owner: string;
}

export interface WalkthroughState {
  active: boolean;
  scenario: "A" | "C" | null;
  step: number;
}

export interface DemoWorkflowState {
  version: number;
  activeWorkspace: WorkspaceKind;
  datasets: Record<WorkspaceKind, OperationalDataset>;
  lastImportSummary?: ImportCommitSummary;
  role: Role;
  recommendationStatuses: Record<string, string>;
  actions: RetentionActionRecord[];
  imports: ImportHistoryRecord[];
  campaign: CampaignDraft;
  scheduledPosts: ScheduledPostRecord[];
  events: AuditEvent[];
  requests: string[];
  dismissedTriggers: string[];
  thresholds: {
    high: number;
    critical: number;
    riskSegment: number;
    revenue: number;
    frequency: number;
    engagement: number;
  };
  walkthrough: WalkthroughState;
}

const now = "2026-07-18 12:00";
const history = (
  status: string,
  actor: string,
  role: string,
  comment: string,
): ApprovalHistoryItem => ({ status, actor, role, comment, at: now });

const action = (
  id: string,
  customerId: string,
  customerName: string,
  tier: Tier,
  risk: Risk,
  status: ActionStatus,
  owner: string,
  recommendation: string,
  priority: RetentionActionRecord["priority"],
  deadline: string,
): RetentionActionRecord => ({
  id,
  datasetId: "demo",
  sourceType: "Demo Seed",
  recommendationId:
    id === "ACT-021"
      ? "REC-001"
      : id === "ACT-022"
        ? "REC-002"
        : id === "ACT-024"
          ? "REC-003"
          : `REC-${id.slice(-3)}`,
  alertId: id === "ACT-021" ? "ALT-001" : `ALT-${id.slice(-3)}`,
  customerId,
  customerName,
  tier,
  risk,
  recommendation,
  explanation:
    "Evidence-linked customer context requires a governed staff response.",
  priority,
  actionType:
    status === "Completed" ? "Service recovery" : "Customer follow-up",
  owner,
  approver: "Farah Chen",
  requester: owner,
  deadline,
  status,
  approvalStatus:
    status === "Draft"
      ? "Not submitted"
      : status === "Pending Approval"
        ? "Pending Approval"
        : [
              "Approved",
              "In Progress",
              "Waiting for Customer",
              "Completed",
            ].includes(status)
          ? "Approved"
          : status,
  executionStatus:
    status === "Completed"
      ? "Completed"
      : ["In Progress", "Waiting for Customer"].includes(status)
        ? status
        : status === "Approved and Ready"
          ? "Ready"
          : "Not started",
  confidence: "High",
  uncertainty: "Customer response and future churn cannot be confirmed.",
  evidence:
    customerId === "CUS-1001"
      ? [
          "MSG-A-101",
          "MSG-A-103",
          "MSG-A-104",
          "customer-service-policy.pdf · page 1",
        ]
      : ["Customer record", "Transaction trend"],
  originalAvoOutput: recommendation,
  humanEditedOutput:
    customerId === "CUS-1001"
      ? "Hi Maya, I’m reviewing the replacement under our service policy and will confirm the approved next step."
      : recommendation,
  reviewerComment:
    status === "Draft" || status === "Pending Approval"
      ? ""
      : "Evidence and policy reviewed.",
  rejectionReason:
    status === "Rejected" ? "Insufficient supporting evidence." : "",
  outcome: status === "Completed" ? "Customer retained" : "",
  customerResponse:
    status === "Completed"
      ? "Positive response and subsequent purchase recorded."
      : "",
  versions: [{ version: 1, content: recommendation, actor: owner, at: now }],
  history:
    status === "Draft"
      ? [
          history(
            "Draft",
            owner,
            "Account Executive",
            "Draft created from recommendation",
          ),
        ]
      : [
          history(
            status,
            status === "Pending Approval" ? owner : "Farah Chen",
            status === "Pending Approval"
              ? "Account Executive"
              : "Sales Manager",
            status === "Pending Approval"
              ? "Submitted for review"
              : "Workflow state recorded",
          ),
        ],
});

const campaignContent = {
  "Campaign brief":
    "Value education for consented North food and beverage customers, grounded in approved product documentation.",
  "LinkedIn caption":
    "Make every order work harder with clearer inventory insight. Explore the approved Inventory Optimizer guide.",
  "Instagram caption":
    "Plan with a clearer view. Explore the approved Inventory Optimizer overview. #InventoryPlanning #CustomerSuccess",
  "Facebook caption":
    "Looking for a clearer view of inventory movement? Read the approved Inventory Optimizer overview.",
  "Email content":
    "Explore the approved Inventory Optimizer overview. Reply if you would like a staff-led walkthrough.",
  "WhatsApp content":
    "See the approved Inventory Optimizer overview. Reply if you would like a staff-led walkthrough.",
  Hashtags: "#InventoryPlanning #CustomerSuccess #FoodOperations",
  CTA: "Review the approved product overview",
  "Landing-page content":
    "Understand the documented planning views and decide whether the product fits your workflow.",
};

export function createInitialDemoState(
  seedEvents: AuditEvent[],
): DemoWorkflowState {
  return {
    version: 3,
    activeWorkspace: "demo",
    datasets: {
      demo: createDataset("demo", seedCustomers),
      imported: createDataset("imported"),
    },
    role: "Administrator",
    recommendationStatuses: {
      "REC-001": "Draft",
      "REC-002": "Draft",
      "REC-003": "Executed",
    },
    actions: [
      action(
        "ACT-021",
        "CUS-1001",
        "Maya Tan",
        "Strategic",
        "Critical",
        "Draft",
        "Aisha Rahman",
        "Resolve both delivery complaints before any promotion",
        "Urgent",
        "2026-07-19",
      ),
      action(
        "ACT-022",
        "CUS-1002",
        "Ethan Lim",
        "Growth",
        "Low",
        "Draft",
        "Daniel Wong",
        "Introduce Analytics Suite from the approved catalogue",
        "Medium",
        "2026-07-24",
      ),
      action(
        "ACT-023",
        "CUS-1003",
        "Priya Nair",
        "Core",
        "High",
        "Approved and Ready",
        "Aisha Rahman",
        "Arrange value review meeting",
        "High",
        "2026-07-20",
      ),
      action(
        "ACT-024",
        "CUS-1004",
        "Omar Aziz",
        "Core",
        "High",
        "Approved and Ready",
        "Daniel Wong",
        "Complete recovery check-in",
        "Low",
        "2026-07-10",
      ),
      action(
        "ACT-025",
        "CUS-1005",
        "Noah Demo",
        "Standard",
        "High",
        "In Progress",
        "Aisha Rahman",
        "Call customer about unresolved service issue",
        "High",
        "2026-07-18",
      ),
      action(
        "ACT-026",
        "CUS-1006",
        "Synthetic Customer 6",
        "Growth",
        "Medium",
        "Waiting for Customer",
        "Daniel Wong",
        "Confirm meeting availability",
        "Medium",
        "2026-07-22",
      ),
      action(
        "ACT-027",
        "CUS-1007",
        "Synthetic Customer 7",
        "Core",
        "High",
        "Pending Approval",
        "Aisha Rahman",
        "Escalate renewal risk to manager",
        "High",
        "2026-07-19",
      ),
      action(
        "ACT-028",
        "CUS-1008",
        "Synthetic Customer 8",
        "Standard",
        "Medium",
        "Rejected",
        "Daniel Wong",
        "Create re-engagement offer",
        "Medium",
        "2026-07-16",
      ),
      action(
        "ACT-029",
        "CUS-1009",
        "Synthetic Customer 9",
        "Core",
        "High",
        "Changes Requested",
        "Aisha Rahman",
        "Revise the recovery message using reviewer feedback",
        "High",
        "2026-07-21",
      ),
    ],
    imports: [],
    campaign: {
      datasetId: "demo",
      sourceType: "Demo Seed",
      id: "CAM-003",
      triggerId: "MKT-003",
      status: "Draft",
      step: 1,
      name: "North value clarity",
      objective:
        "Re-engage North food and beverage customers with approved product value education",
      problem:
        "Frequency, revenue, and engagement declined while price-value concerns increased.",
      expectedOutcome:
        "Improve product understanding and invite staff-led re-engagement; no result is guaranteed.",
      channels: ["LinkedIn", "Email"],
      startDate: "2026-07-24",
      endDate: "2026-07-30",
      segment: "North · Food & beverage",
      totalAudience: 12,
      consentedAudience: 8,
      excludedAudience: 4,
      sources: [
        "product-catalogue.pdf · page 1",
        "marketing-guidelines.pdf · page 1",
        "MKT-003 aggregate evidence",
      ],
      generated: false,
      content: campaignContent,
      versions: [],
      confirmations: {},
      requester: "Nadia Wong",
      reviewer: "Farah Chen",
      reviewerComment: "",
      approvalHistory: [
        history(
          "Draft",
          "Nadia Wong",
          "Marketing Specialist",
          "Campaign opened from MKT-003",
        ),
      ],
      scheduleDate: "2026-07-24",
      scheduleTime: "10:00",
      timeZone: "Asia/Kuala_Lumpur",
      publisher: "Demo Publisher",
    },
    scheduledPosts: [
      {
        datasetId: "demo",
        sourceType: "Demo Seed",
        id: "POST-001",
        campaignId: "CAM-001",
        campaignName: "Product planning guide",
        channel: "Instagram",
        date: "2026-07-26",
        time: "12:30",
        timeZone: "Asia/Kuala_Lumpur",
        status: "Approved",
        provider: "Demo Publisher",
        approver: "Mina Lee",
        publisherId: "not-scheduled",
        triggerId: "MKT-001",
        owner: "Nadia Wong",
      },
      {
        datasetId: "demo",
        sourceType: "Demo Seed",
        id: "POST-002",
        campaignId: "CAM-002",
        campaignName: "Recovery stories",
        channel: "Facebook",
        date: "2026-07-30",
        time: "09:00",
        timeZone: "Asia/Kuala_Lumpur",
        status: "Draft",
        provider: "Demo Publisher",
        approver: "Pending",
        publisherId: "not-scheduled",
        triggerId: "MKT-002",
        owner: "Nadia Wong",
      },
    ],
    events: seedEvents,
    requests: [],
    dismissedTriggers: [],
    thresholds: {
      high: 60,
      critical: 80,
      riskSegment: 20,
      revenue: 15,
      frequency: 20,
      engagement: 25,
    },
    walkthrough: { active: false, scenario: null, step: 0 },
  };
}

export const actorForRole = (role: Role) =>
  role === "Administrator"
    ? "Demo Administrator"
    : role === "Marketing Manager"
      ? "Mina Lee"
      : role === "Sales Manager"
        ? "Farah Chen"
        : role === "Account Executive"
          ? "Aisha Rahman"
          : "Demo Auditor";

export const canUploadType = (role: Role, type: string) => {
  const allowed: Record<Role, string[]> = {
    Administrator: [
      "customers",
      "transactions",
      "conversations",
      "products",
      "campaign_results",
      "retention_playbook",
      "customer_service_policy",
      "product_catalogue",
      "marketing_guidelines",
      "campaign_asset",
    ],
    "Sales Manager": [
      "customers",
      "transactions",
      "conversations",
      "retention_playbook",
      "customer_service_policy",
    ],
    "Marketing Manager": [
      "products",
      "product_catalogue",
      "marketing_guidelines",
      "campaign_asset",
      "campaign_results",
    ],
    "Account Executive": ["conversations"],
    Auditor: [],
  };
  return allowed[role].includes(type);
};
