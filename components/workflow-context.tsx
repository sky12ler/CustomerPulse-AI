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
import type { ImportResult } from "@/lib/imports";
import type { Role } from "@/lib/types";
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
  addImport: (result: ImportResult, type: string) => string;
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
  executeAction: (actionId: string) => void;
  recordOutcome: (actionId: string, response: string, outcome: string) => void;
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
          if (parsed.version === 2) setState(parsed);
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
      const id = `IMP-${Date.now()}`;
      update((current) => {
        const record = {
          id,
          type,
          filename: result.filename,
          validCount: result.validCount,
          invalidCount: result.invalidCount,
          duplicateCount: result.duplicateCount,
          recordsAdded: result.validCount,
          recordsUpdated: 0,
          recordsRejected: result.invalidCount,
          chunksCreated: result.chunks?.length ?? 0,
          uploader: actorForRole(current.role),
          at: timestamp(),
          result,
        };
        return {
          ...current,
          imports: [record, ...current.imports],
          events: [
            createEvent(
              current,
              "Data import confirmed",
              id,
              "Success",
              `${result.filename}; ${result.validCount} added`,
            ),
            ...current.events,
          ],
        };
      });
      return id;
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
      if (state.role !== "Sales Manager" && state.role !== "Administrator")
        throw new Error("Sales Manager or Administrator role is required");
      if (actor === item.requester)
        throw new Error("Requester cannot approve their own action");
      if (item.status !== "Pending Approval")
        throw new Error("Only Pending Approval actions can be reviewed");
      if (!comment.trim()) throw new Error("Reviewer comment is required");
      if (decision === "Rejected" && !reason.trim())
        throw new Error("Rejection reason is required");
      const at = timestamp();
      update((current) => ({
        ...current,
        actions: current.actions.map((candidate) =>
          candidate.id === actionId
            ? {
                ...candidate,
                status: decision,
                approvalStatus: decision,
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
  const executeAction = useCallback(
    (actionId: string) => {
      const item = state.actions.find((candidate) => candidate.id === actionId);
      if (!item) throw new Error("Retention action was not found");
      if (item.status !== "Approved")
        throw new Error("Approval is required before execution");
      if (state.role !== "Account Executive" && state.role !== "Administrator")
        throw new Error("Action owner or Administrator role is required");
      const at = timestamp();
      update((current) => ({
        ...current,
        actions: current.actions.map((candidate) =>
          candidate.id === actionId
            ? {
                ...candidate,
                status: "In Progress",
                executionStatus: "Executed · outcome required",
                executedAt: at,
                history: [
                  ...candidate.history,
                  {
                    status: "Executed",
                    actor: actorForRole(state.role),
                    role: state.role,
                    comment: "Approved action executed; outcome pending",
                    at,
                  },
                ],
              }
            : candidate,
        ),
        events: [
          createEvent(
            current,
            "Retention action executed",
            actionId,
            "Success",
            "Outcome required",
          ),
          ...current.events,
        ],
      }));
    },
    [createEvent, state, update],
  );
  const recordOutcome = useCallback(
    (actionId: string, response: string, outcome: string) => {
      if (!response.trim() || !outcome.trim())
        throw new Error("Customer response and outcome are required");
      const item = state.actions.find((candidate) => candidate.id === actionId);
      if (
        !item ||
        !["In Progress", "Waiting for Customer"].includes(item.status)
      )
        throw new Error("Execute the approved action before recording outcome");
      const at = timestamp();
      update((current) => ({
        ...current,
        actions: current.actions.map((candidate) =>
          candidate.id === actionId
            ? {
                ...candidate,
                status: "Completed",
                executionStatus: "Completed",
                customerResponse: response,
                outcome,
                completedAt: at,
                history: [
                  ...candidate.history,
                  {
                    status: "Completed",
                    actor: actorForRole(state.role),
                    role: state.role,
                    comment: `${response} · ${outcome}`,
                    at,
                  },
                ],
              }
            : candidate,
        ),
        events: [
          createEvent(
            current,
            "Retention outcome recorded",
            actionId,
            "Completed",
            "Risk recalculation queued",
          ),
          ...current.events,
        ],
      }));
    },
    [createEvent, state, update],
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
      executeAction,
      recordOutcome,
      updateCampaign,
      addScheduledPosts,
      reset: () => {
        localStorage.removeItem(STORAGE_KEY);
        setState(createInitialDemoState(audits));
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
      executeAction,
      recordOutcome,
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
