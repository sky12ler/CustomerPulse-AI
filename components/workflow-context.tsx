"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { audits } from "@/lib/demo-data";
import {
  accessibleCustomers,
  lookupAccessibleCustomer,
  accessibleActions,
} from "@/lib/customer-access";
import type { ImportResult } from "@/lib/imports";
import type { Role, Sentiment } from "@/lib/types";
import {
  assertActionTransition,
  canManagerReview,
  canOwnerOperate,
  addActionVersion,
} from "@/lib/action-lifecycle";
import {
  commitOperationalImport,
  recalculateCustomers,
  signalsFromAnalysis,
  type ImportCommitSummary,
  type OutcomeType,
  type WorkspaceKind,
} from "@/lib/operational";
import {
  actorForRole,
  createInitialDemoState,
  type CampaignDraft,
  type DemoWorkflowState,
  type RetentionActionRecord,
  type ScheduledPostRecord,
} from "@/lib/demo-workflow";

const STORAGE_KEY = "customerpulse-demo-v2";

interface WorkflowContextValue {
  state: DemoWorkflowState;
  hydrated: boolean;
  setRole: (role: Role) => void;
  update: (updater: (state: DemoWorkflowState) => DemoWorkflowState) => void;
  log: (
    action: string,
    entity: string,
    result: string,
    reason?: string,
  ) => void;
  dataset: DemoWorkflowState["datasets"][WorkspaceKind];
  accessibleCustomers: ReturnType<typeof accessibleCustomers>;
  accessibleActions: ReturnType<typeof accessibleActions>;
  lookupCustomer: (
    customerId: string,
  ) => ReturnType<typeof lookupAccessibleCustomer>;
  switchWorkspace: (workspace: WorkspaceKind) => void;
  addImport: (result: ImportResult, type: string) => ImportCommitSummary;
  submitRecommendation: (
    recommendationId: string,
    draft: string,
    owner: string,
    deadline: string,
  ) => RetentionActionRecord;
  reviewAction: (
    actionId: string,
    decision: "Approved" | "Rejected" | "Changes Requested",
    comment: string,
    reason?: string,
  ) => void;
  beginRevision: (actionId: string) => void;
  startAction: (actionId: string) => void;
  executeAction: (
    actionId: string,
    responseExpected?: boolean,
    notes?: string,
  ) => void;
  recordResponse: (
    actionId: string,
    text: string,
    sentiment: Sentiment,
  ) => void;
  recordOutcome: (
    actionId: string,
    outcome: OutcomeType,
    notes: string,
  ) => void;
  storeAnalysis: (
    customerId: string,
    analysis: Parameters<typeof signalsFromAnalysis>[2],
  ) => string[];
  recalculate: (customerId: string, trigger?: string) => void;
  updateCampaign: (patch: Partial<CampaignDraft>) => void;
  addScheduledPosts: (posts: ScheduledPostRecord[]) => void;
  reset: () => void;
}

const WorkflowContext = createContext<WorkflowContextValue | null>(null);
const timestamp = () => new Date().toISOString();

export function DemoWorkflowProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = useState(() => createInitialDemoState(audits));
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as DemoWorkflowState;
          if (parsed.version === 3) setState(parsed);
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      } finally {
        setHydrated(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [hydrated, state]);

  const update = useCallback(
    (updater: (current: DemoWorkflowState) => DemoWorkflowState) =>
      setState((current) => updater(current)),
    [],
  );

  const createEvent = useCallback(
    (
      current: DemoWorkflowState,
      action: string,
      entity: string,
      result: string,
      reason = "",
    ) => ({
      id: `AUD-${Date.now()}-${current.events.length}`,
      actor: actorForRole(current.role),
      role: current.role,
      action: reason ? `${action} · ${reason}` : action,
      entity,
      result,
      at: timestamp().replace("T", " ").slice(0, 16),
      correlationId: `COR-DEMO-${Date.now()}`,
    }),
    [],
  );

  const log = useCallback(
    (action: string, entity: string, result: string, reason = "") =>
      update((current) => ({
        ...current,
        events: [
          createEvent(current, action, entity, result, reason),
          ...current.events,
        ],
      })),
    [createEvent, update],
  );

  const addImport = useCallback(
    (result: ImportResult, type: string) => {
      let summary!: ImportCommitSummary;
      update((current) => {
        const workspace: WorkspaceKind =
          current.activeWorkspace === "demo"
            ? "imported"
            : current.activeWorkspace;
        const committed = commitOperationalImport(
          current.datasets[workspace],
          result,
          type as ImportResult["kind"],
          actorForRole(current.role),
        );
        summary = committed.summary;
        const id = "IMP-" + Date.now();
        const record = {
          id,
          type,
          filename: result.filename,
          validCount: result.validCount,
          invalidCount: result.invalidCount,
          duplicateCount: result.duplicateCount,
          recordsAdded: summary.added,
          recordsUpdated: summary.updated,
          recordsRejected: summary.rejected,
          chunksCreated: result.chunks?.length ?? 0,
          uploader: actorForRole(current.role),
          at: timestamp(),
          result,
        };
        return {
          ...current,
          activeWorkspace: workspace,
          lastImportSummary: summary,
          datasets: { ...current.datasets, [workspace]: committed.dataset },
          imports: [record, ...current.imports],
          events: [
            createEvent(
              current,
              "Operational import committed",
              id,
              "Success",
              summary.added +
                " added; " +
                summary.updated +
                " updated; " +
                summary.affectedCustomerIds.length +
                " customers recalculated",
            ),
            ...current.events,
          ],
        };
      });
      return summary;
    },
    [createEvent, update],
  );

  const submitRecommendation = useCallback(
    (
      recommendationId: string,
      draft: string,
      owner: string,
      deadline: string,
    ) => {
      const existing = state.actions.find(
        (item) => item.recommendationId === recommendationId,
      );
      if (!existing) throw new Error("Linked retention action was not found");
      if (
        !accessibleCustomers(
          state.datasets[state.activeWorkspace].customers,
          state.role,
        ).some((customer) => customer.id === existing.customerId)
      )
        throw new Error("Customer access denied");
      if (existing.status !== "Draft")
        throw new Error(`Recommendation already submitted as ${existing.id}`);
      const at = timestamp();
      const submitted: RetentionActionRecord = {
        ...existing,
        owner,
        requester: actorForRole(state.role),
        deadline,
        status: "Pending Approval",
        approvalStatus: "Pending Approval",
        humanEditedOutput: draft,
        versions: addActionVersion(
          existing,
          draft,
          actorForRole(state.role),
          at,
        ),
        submittedAt: at,
        history: [
          ...existing.history,
          {
            status: "Pending Approval",
            actor: actorForRole(state.role),
            role: state.role,
            comment: "Recommendation submitted to Sales Manager",
            at,
          },
        ],
      };
      update((current) => ({
        ...current,
        actions: current.actions.map((item) =>
          item.id === submitted.id ? submitted : item,
        ),
        recommendationStatuses: {
          ...current.recommendationStatuses,
          [recommendationId]: "Submitted",
        },
        events: [
          createEvent(
            current,
            "Recommendation submitted for approval",
            submitted.id,
            "Pending Approval",
            `Requester ${submitted.requester}; approver Sales Manager`,
          ),
          ...current.events,
        ],
      }));
      return submitted;
    },
    [createEvent, state, update],
  );
  const reviewAction = useCallback(
    (
      actionId: string,
      decision: "Approved" | "Rejected" | "Changes Requested",
      comment: string,
      reason = "",
    ) => {
      const actor = actorForRole(state.role);
      const item = state.actions.find((candidate) => candidate.id === actionId);
      if (!item) throw new Error("Retention action was not found");
      if (!canManagerReview(state.role, actor, item.requester))
        throw new Error(
          actor === item.requester
            ? "Requester cannot approve their own action"
            : "Sales Manager or Administrator role is required",
        );
      if (item.status !== "Pending Approval")
        throw new Error("Only Pending Approval actions can be reviewed");
      if (!comment.trim()) throw new Error("Reviewer comment is required");
      if (
        ["Rejected", "Changes Requested"].includes(decision) &&
        !reason.trim()
      )
        throw new Error(
          decision === "Rejected"
            ? "Rejection reason is required"
            : "Requested changes are required",
        );
      const at = timestamp();
      update((current) => ({
        ...current,
        actions: current.actions.map((candidate) =>
          candidate.id === actionId
            ? {
                ...candidate,
                status:
                  decision === "Approved" ? "Approved and Ready" : decision,
                approvalStatus: decision === "Approved" ? "Approved" : decision,
                executionStatus:
                  decision === "Approved" ? "Ready" : "Not started",
                reviewerComment: comment,
                rejectionReason: reason,
                approvedAt: decision === "Approved" ? at : undefined,
                history: [
                  ...candidate.history,
                  {
                    status: decision,
                    actor,
                    role: state.role,
                    comment: reason ? `${comment} · ${reason}` : comment,
                    at,
                  },
                ],
              }
            : candidate,
        ) as RetentionActionRecord[],
        events: [
          createEvent(
            current,
            `Retention action ${decision.toLowerCase()}`,
            actionId,
            decision,
            comment,
          ),
          ...current.events,
        ],
      }));
    },
    [createEvent, state, update],
  );
  const beginRevision = useCallback(
    (actionId: string) => {
      if (state.role !== "Account Executive" && state.role !== "Administrator")
        throw new Error("Requester role is required");
      const item = state.actions.find((candidate) => candidate.id === actionId);
      if (!item || item.status !== "Changes Requested")
        throw new Error("Action is not awaiting revision");
      assertActionTransition(item.status, "Draft");
      const at = timestamp();
      update((current) => ({
        ...current,
        recommendationStatuses: {
          ...current.recommendationStatuses,
          [item.recommendationId]: "Draft",
        },
        actions: current.actions.map((candidate) =>
          candidate.id === actionId
            ? {
                ...candidate,
                status: "Draft",
                approvalStatus: "Draft Revision",
                history: [
                  ...candidate.history,
                  {
                    status: "Draft Revision",
                    actor: actorForRole(state.role),
                    role: state.role,
                    comment: "Requester began a governed revision",
                    at,
                  },
                ],
              }
            : candidate,
        ),
        events: [
          createEvent(
            current,
            "Retention revision begun",
            actionId,
            "Draft Revision",
          ),
          ...current.events,
        ],
      }));
    },
    [createEvent, state, update],
  );

  const startAction = useCallback(
    (actionId: string) => {
      const item = state.actions.find((candidate) => candidate.id === actionId);
      if (!item || item.status !== "Approved and Ready")
        throw new Error("Manager approval is required before starting");
      assertActionTransition(item.status, "In Progress");
      const actor = actorForRole(state.role);
      if (!canOwnerOperate(state.role, actor, item.owner))
        throw new Error("Only the assigned action owner can start");
      const at = timestamp();
      update((current) => ({
        ...current,
        actions: current.actions.map((candidate) =>
          candidate.id === actionId
            ? {
                ...candidate,
                status: "In Progress",
                executionStatus: "Started; execution confirmation required",
                startedAt: at,
                startedBy: actor,
                history: [
                  ...candidate.history,
                  {
                    status: "In Progress",
                    actor,
                    role: state.role,
                    comment: "Approved action started",
                    at,
                  },
                ],
              }
            : candidate,
        ),
        events: [
          createEvent(
            current,
            "Retention action started",
            actionId,
            "In Progress",
          ),
          ...current.events,
        ],
      }));
    },
    [createEvent, state, update],
  );

  const executeAction = useCallback(
    (actionId: string, responseExpected = true, notes = "") => {
      const item = state.actions.find((candidate) => candidate.id === actionId);
      if (!item || item.status !== "In Progress")
        throw new Error(
          "Start the approved action before confirming execution",
        );
      const actor = actorForRole(state.role);
      if (!canOwnerOperate(state.role, actor, item.owner))
        throw new Error("Only the assigned action owner can execute");
      const at = timestamp();
      const status = responseExpected
        ? "Waiting for Customer"
        : "Outcome Required";
      assertActionTransition(item.status, status);
      update((current) => ({
        ...current,
        actions: current.actions.map((candidate) =>
          candidate.id === actionId
            ? {
                ...candidate,
                status,
                executionStatus: "Execution Confirmed",
                executedAt: at,
                executedBy: actor,
                responseExpected,
                responseDeadline: responseExpected
                  ? new Date(Date.now() + 3 * 86400000)
                      .toISOString()
                      .slice(0, 10)
                  : undefined,
                history: [
                  ...candidate.history,
                  {
                    status: "Execution Confirmed",
                    actor,
                    role: state.role,
                    comment:
                      notes ||
                      (responseExpected
                        ? "Customer response expected"
                        : "No response required"),
                    at,
                  },
                ],
              }
            : candidate,
        ) as RetentionActionRecord[],
        events: [
          createEvent(
            current,
            "Retention execution confirmed",
            actionId,
            status,
            "Executor " + actor,
          ),
          ...current.events,
        ],
      }));
    },
    [createEvent, state, update],
  );

  const recordResponse = useCallback(
    (actionId: string, responseText: string, sentiment: Sentiment) => {
      if (!responseText.trim()) throw new Error("Response summary is required");
      const item = state.actions.find((candidate) => candidate.id === actionId);
      if (!item || item.status !== "Waiting for Customer")
        throw new Error("Action is not waiting for a customer response");
      assertActionTransition(item.status, "Outcome Required");
      const at = timestamp(),
        actor = actorForRole(state.role);
      update((current) => {
        const workspace = current.activeWorkspace;
        const dataset = current.datasets[workspace];
        const response = {
          datasetId: workspace,
          sourceType: "Staff Entry" as const,
          originalExternalId: "RSP-" + Date.now(),
          id: "RSP-" + Date.now(),
          actionId,
          customerId: item.customerId,
          channel: item.actionType,
          responseType: "Customer response",
          text: responseText,
          sentiment,
          receivedAt: at,
          recordedBy: actor,
          evidenceReference: "Staff-recorded response",
        };
        const recalculated = recalculateCustomers(
          { ...dataset, responses: [...dataset.responses, response] },
          [item.customerId],
          "Customer response recorded",
        ).dataset;
        return {
          ...current,
          datasets: { ...current.datasets, [workspace]: recalculated },
          actions: current.actions.map((candidate) =>
            candidate.id === actionId
              ? {
                  ...candidate,
                  status: "Outcome Required",
                  customerResponse: responseText,
                  history: [
                    ...candidate.history,
                    {
                      status: "Outcome Required",
                      actor,
                      role: state.role,
                      comment: "Separate customer response recorded",
                      at,
                    },
                  ],
                }
              : candidate,
          ),
          events: [
            createEvent(
              current,
              "Customer response recorded",
              actionId + " / " + item.customerId + " / " + response.id,
              "Outcome Required",
              actionId,
            ),
            ...current.events,
          ],
        };
      });
    },
    [createEvent, state, update],
  );

  const recordOutcome = useCallback(
    (actionId: string, outcome: OutcomeType, notes: string) => {
      if (!notes.trim()) throw new Error("Outcome notes are required");
      const item = state.actions.find((candidate) => candidate.id === actionId);
      if (!item || item.status !== "Outcome Required")
        throw new Error(
          "Execution must be confirmed before recording an outcome",
        );
      assertActionTransition(item.status, "Completed");
      const at = timestamp(),
        actor = actorForRole(state.role);
      update((current) => {
        const workspace = current.activeWorkspace,
          dataset = current.datasets[workspace];
        const before = dataset.churnCalculations[item.customerId]?.score ?? 0;
        const record = {
          datasetId: workspace,
          sourceType: "Staff Entry" as const,
          originalExternalId: "OUT-" + Date.now(),
          id: "OUT-" + Date.now(),
          actionId,
          customerId: item.customerId,
          type: outcome,
          notes,
          revenueRecovered: 0,
          supportingReference:
            dataset.responses.find((response) => response.actionId === actionId)
              ?.id ?? actionId,
          recordedBy: actor,
          recordedAt: at,
          confidence: 80,
          requiresFollowUp: outcome === "Follow-up required",
        };
        const recalculated = recalculateCustomers(
          { ...dataset, outcomes: [...dataset.outcomes, record] },
          [item.customerId],
          "Outcome recorded",
        ).dataset;
        const after =
          recalculated.churnCalculations[item.customerId]?.score ?? before;
        return {
          ...current,
          datasets: { ...current.datasets, [workspace]: recalculated },
          actions: current.actions.map((candidate) =>
            candidate.id === actionId
              ? {
                  ...candidate,
                  status: "Completed",
                  executionStatus: "Completed",
                  outcome,
                  completedAt: at,
                  history: [
                    ...candidate.history,
                    {
                      status: "Completed",
                      actor,
                      role: state.role,
                      comment: outcome + " - " + notes,
                      at,
                    },
                  ],
                }
              : candidate,
          ),
          events: [
            createEvent(
              current,
              "Outcome recorded and risk recalculated",
              actionId + " / " + item.customerId + " / " + record.id,
              "Completed",
              "Score " + before + " -> " + after,
            ),
            ...current.events,
          ],
        };
      });
    },
    [createEvent, state, update],
  );

  const storeAnalysis = useCallback(
    (
      customerId: string,
      analysis: Parameters<typeof signalsFromAnalysis>[2],
    ) => {
      if (
        state.role === "Auditor" ||
        lookupAccessibleCustomer(
          state.datasets[state.activeWorkspace].customers,
          state.role,
          customerId,
        ).status !== "allowed"
      )
        throw new Error("Customer AVO access denied");
      let rejected: string[] = [];
      update((current) => {
        const workspace = current.activeWorkspace;
        const stored = signalsFromAnalysis(
          current.datasets[workspace],
          customerId,
          analysis,
        );
        rejected = stored.rejectedEvidence;
        if (rejected.length)
          return {
            ...current,
            events: [
              createEvent(
                current,
                "AVO evidence validation",
                customerId,
                "Rejected",
                rejected.join(", "),
              ),
              ...current.events,
            ],
          };
        const calculation = stored.dataset.churnCalculations[customerId];
        return {
          ...current,
          datasets: { ...current.datasets, [workspace]: stored.dataset },
          events: [
            createEvent(
              current,
              "AVO signals validated and churn recalculated",
              customerId,
              "Success",
              "Official score " + calculation.score,
            ),
            ...current.events,
          ],
        };
      });
      return rejected;
    },
    [createEvent, state, update],
  );

  const recalculate = useCallback(
    (customerId: string, trigger = "Manual recalculation") =>
      update((current) => {
        const workspace = current.activeWorkspace,
          before =
            current.datasets[workspace].churnCalculations[customerId]?.score ??
            0;
        const result = recalculateCustomers(
          current.datasets[workspace],
          [customerId],
          trigger,
        );
        const after =
          result.dataset.churnCalculations[customerId]?.score ?? before;
        return {
          ...current,
          datasets: { ...current.datasets, [workspace]: result.dataset },
          events: [
            createEvent(
              current,
              "Customer risk recalculated",
              customerId,
              "Success",
              "Score " + before + " -> " + after,
            ),
            ...current.events,
          ],
        };
      }),
    [createEvent, update],
  );

  const updateCampaign = useCallback(
    (patch: Partial<CampaignDraft>) =>
      update((current) => ({
        ...current,
        campaign: { ...current.campaign, ...patch },
      })),
    [update],
  );

  const addScheduledPosts = useCallback(
    (posts: ScheduledPostRecord[]) =>
      update((current) => ({
        ...current,
        campaign: { ...current.campaign, status: "Scheduled", step: 7 },
        scheduledPosts: [
          ...posts,
          ...current.scheduledPosts.filter(
            (item) => item.campaignId !== current.campaign.id,
          ),
        ],
        events: [
          ...posts.map((post) =>
            createEvent(
              current,
              "Campaign scheduled",
              post.id,
              "Scheduled",
              `${post.channel}; ${post.provider}; ${post.publisherId}`,
            ),
          ),
          ...current.events,
        ],
      })),
    [createEvent, update],
  );

  const value = useMemo<WorkflowContextValue>(
    () => ({
      state,
      hydrated,
      dataset: state.datasets[state.activeWorkspace],
      accessibleCustomers: accessibleCustomers(
        state.datasets[state.activeWorkspace].customers,
        state.role,
      ),
      accessibleActions: accessibleActions(
        state.actions.filter(
          (action) => action.datasetId === state.activeWorkspace,
        ),
        state.datasets[state.activeWorkspace].customers,
        state.role,
      ),
      lookupCustomer: (customerId) =>
        lookupAccessibleCustomer(
          state.datasets[state.activeWorkspace].customers,
          state.role,
          customerId,
        ),
      switchWorkspace: (workspace) =>
        update((current) => ({
          ...current,
          activeWorkspace: workspace,
          events: [
            createEvent(current, "Workspace switched", workspace, "Success"),
            ...current.events,
          ],
        })),
      setRole: (role) =>
        update((current) => ({
          ...current,
          role,
          events: [
            createEvent(current, "Demo role switched", role, "Success"),
            ...current.events,
          ],
        })),
      update,
      log,
      addImport,
      submitRecommendation,
      reviewAction,
      beginRevision,
      startAction,
      executeAction,
      recordResponse,
      recordOutcome,
      storeAnalysis,
      recalculate,
      updateCampaign,
      addScheduledPosts,
      reset: () => {
        setState((current) => {
          const fresh = createInitialDemoState(audits);
          return {
            ...fresh,
            datasets: {
              ...fresh.datasets,
              imported: current.datasets.imported,
            },
            events: [
              createEvent(
                current,
                "Demo workspace reset",
                "demo",
                "Success",
                "Imported workspace preserved",
              ),
              ...fresh.events,
            ],
          };
        });
      },
    }),
    [
      state,
      hydrated,
      update,
      createEvent,
      log,
      addImport,
      submitRecommendation,
      reviewAction,
      beginRevision,
      startAction,
      executeAction,
      recordResponse,
      recordOutcome,
      storeAnalysis,
      recalculate,
      updateCampaign,
      addScheduledPosts,
    ],
  );

  return (
    <WorkflowContext.Provider value={value}>
      {children}
    </WorkflowContext.Provider>
  );
}

export function useDemoWorkflow() {
  const value = useContext(WorkflowContext);
  if (!value) throw new Error("Demo workflow context is unavailable");
  return value;
}
