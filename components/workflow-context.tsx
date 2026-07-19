"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
  actorForRole as demoActorForRole,
  canUploadType,
  createInitialDemoState,
  type CampaignDraft,
  type CampaignResultRecord,
  type DemoWorkflowState,
  type RecommendationRecord,
  type RetentionActionRecord,
  type ScheduledPostRecord,
} from "@/lib/demo-workflow";
import {
  calculateCampaignAudience,
  calculateMarketingOpportunities,
  calculateSegmentAudience,
} from "@/lib/marketing-operational";
import {
  getSupabaseBrowserClient,
  supabaseBrowserConfigured,
} from "@/lib/supabase-browser";
import {
  mergeImportedEntityRecords,
  serializeImportedEntities,
  type PersistedEntityRecord,
} from "@/lib/workspace-persistence";

const STORAGE_KEY = "customerpulse-demo-v2";

interface WorkflowContextValue {
  state: DemoWorkflowState;
  hydrated: boolean;
  persistence: {
    configured: boolean;
    authenticated: boolean;
    mode: "supabase" | "local";
    status: "checking" | "synced" | "saving" | "error" | "signed-out";
    email: string;
    actor: string;
    error: string;
  };
  signOut: () => Promise<void>;
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
  createRecommendation: (customerId: string) => RecommendationRecord;
  recalculate: (customerId: string, trigger?: string) => void;
  updateCampaign: (patch: Partial<CampaignDraft>) => void;
  openCampaignFromOpportunity: (opportunityId: string) => CampaignDraft;
  selectCampaign: (campaignId: string) => void;
  setOpportunityStatus: (
    opportunityId: string,
    status: "Active" | "Monitoring" | "Dismissed",
    reason?: string,
  ) => void;
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
  const [state, setState] = useState(() => {
    const initial = createInitialDemoState(audits);
    return { ...initial, campaigns: [initial.campaign] };
  });
  const [hydrated, setHydrated] = useState(false);
  const [persistence, setPersistence] = useState<WorkflowContextValue["persistence"]>({
    configured: supabaseBrowserConfigured(),
    authenticated: false,
    mode: "local",
    status: "checking",
    email: "",
    actor: "",
    error: "",
  });
  const [databaseReady, setDatabaseReady] = useState(false);
  const databaseUser = useRef<{ id: string; organizationId: string } | null>(null);
  const databaseActor = useRef("");
  const auditBaseline = useRef<Set<string>>(new Set());
  const remoteApplying = useRef(false);
  const actorForRole = useCallback(
    (role: Role) => databaseActor.current || demoActorForRole(role),
    [],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as DemoWorkflowState;
          if (parsed.version === 5) {
            setState({
              ...parsed,
              campaigns: parsed.campaigns?.length
                ? parsed.campaigns
                : [parsed.campaign],
            });
          }
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

  useEffect(() => {
    if (!hydrated) return;
    const client = getSupabaseBrowserClient();
    if (!client) {
      const timer = window.setTimeout(() => {
        setPersistence((current) => ({ ...current, status: "signed-out", mode: "local" }));
        setDatabaseReady(true);
      }, 0);
      return () => window.clearTimeout(timer);
    }
    let cancelled = false;
    void (async () => {
      const { data: userData, error: userError } = await client.auth.getUser();
      if (cancelled) return;
      if (userError || !userData.user) {
        setPersistence((current) => ({ ...current, status: "signed-out", mode: "local", authenticated: false, error: userError?.message ?? "" }));
        setDatabaseReady(true);
        return;
      }
      const user = userData.user;
      const [{ data: profile, error: profileError }, { data: roles, error: rolesError }] = await Promise.all([
        client.from("profiles").select("organization_id,display_name,email").eq("id", user.id).maybeSingle(),
        client.from("user_roles").select("role").eq("profile_id", user.id),
      ]);
      if (profileError || rolesError || !profile) {
        setPersistence((current) => ({ ...current, authenticated: true, status: "error", error: profileError?.message ?? rolesError?.message ?? "Supabase profile is missing" }));
        setDatabaseReady(true);
        return;
      }
      const roleNames = new Set((roles ?? []).map((item) => item.role));
      const databaseRole: Role = roleNames.has("administrator")
        ? "Administrator"
        : roleNames.has("sales_manager")
          ? "Sales Manager"
          : roleNames.has("marketing_manager")
            ? "Marketing Manager"
            : roleNames.has("auditor")
              ? "Auditor"
              : "Account Executive";
      databaseUser.current = { id: user.id, organizationId: profile.organization_id };
      databaseActor.current = profile.display_name || profile.email || user.email || "Authenticated user";
      const { data: stored, error: loadError } = await client
        .from("operational_entity_records")
        .select("entity_type,entity_key,customer_external_id,data")
        .eq("workspace", "imported")
        .order("created_at", { ascending: true });
      if (cancelled) return;
      setState((current) => {
        const merged = stored?.length
          ? mergeImportedEntityRecords(current, stored as PersistedEntityRecord[])
          : current;
        auditBaseline.current = new Set(merged.events.map((event) => event.id));
        return { ...merged, role: databaseRole };
      });
      setPersistence({
        configured: true,
        authenticated: true,
        mode: "supabase",
        status: loadError ? "error" : "synced",
        email: profile.email ?? user.email ?? "",
        actor: profile.display_name || profile.email || user.email || "Authenticated user",
        error: loadError?.message ?? "",
      });
      setDatabaseReady(true);
    })();
    return () => { cancelled = true; };
  }, [hydrated]);

  useEffect(() => {
    const client = getSupabaseBrowserClient();
    const identity = databaseUser.current;
    if (!hydrated || !databaseReady || !client || !identity || persistence.mode !== "supabase") return;
    if (remoteApplying.current) {
      remoteApplying.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      void (async () => {
        setPersistence((current) => ({ ...current, status: "saving", error: "" }));
        const writable: Record<Role, string[] | null> = {
          Administrator: null,
          "Sales Manager": ["tier_calculation", "churn_calculation", "analysis", "signal", "alert", "response", "outcome", "action", "recommendation"],
          "Marketing Manager": ["campaign", "marketing_opportunity", "scheduled_post", "campaign_result"],
          "Account Executive": ["response", "outcome", "action", "recommendation"],
          Auditor: [],
        };
        const allowedTypes = writable[state.role];
        const records = serializeImportedEntities(state).filter(
          (item) => allowedTypes === null || allowedTypes.includes(item.entity_type),
        );
        const databaseRows = records.map((item) => ({
          organization_id: identity.organizationId,
          workspace: "imported",
          entity_type: item.entity_type,
          entity_key: item.entity_key,
          customer_external_id: item.customer_external_id,
          data: item.data,
          updated_by: identity.id,
          updated_at: new Date().toISOString(),
        }));
        let error: { message: string } | null = null;
        for (const batch of [
          databaseRows.filter((item) => item.entity_type === "customer"),
          databaseRows.filter((item) => item.entity_type !== "customer"),
        ]) {
          if (!batch.length) continue;
          const result = await client.from("operational_entity_records").upsert(
            batch,
            { onConflict: "organization_id,workspace,entity_type,entity_key" },
          );
          if (result.error) { error = result.error; break; }
        }
        const newEvents = state.events.filter((event) => !auditBaseline.current.has(event.id));
        if (newEvents.length) {
          const { error: auditError } = await client.from("audit_logs").insert(
            newEvents.map((event) => ({
              organization_id: identity.organizationId,
              actor_id: identity.id,
              actor_label: event.actor,
              actor_role: event.role,
              action: event.action,
              entity_type: "workflow_event",
              entity_id: event.entity,
              before_state: event.beforeState ?? null,
              after_state: event.afterState ?? { result: event.result },
              reason: event.reason ?? null,
              reviewer_comment: event.reviewerComment ?? null,
              correlation_id: event.correlationId,
              result: event.result,
              external_event_id: event.id,
            })),
          );
          if (!auditError || auditError.code === "23505")
            newEvents.forEach((event) => auditBaseline.current.add(event.id));
        }
        setPersistence((current) => ({ ...current, status: error ? "error" : "synced", error: error?.message ?? "" }));
      })();
    }, 700);
    return () => window.clearTimeout(timer);
  }, [databaseReady, hydrated, persistence.mode, state]);

  useEffect(() => {
    const client = getSupabaseBrowserClient();
    if (!client || persistence.mode !== "supabase" || !databaseReady) return;
    const channel = client
      .channel("customerpulse-imported-workspace")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "operational_entity_records", filter: "workspace=eq.imported" },
        (payload) => {
          const changed = payload.new as Record<string, unknown>;
          if (changed.updated_by === databaseUser.current?.id) return;
          void client
            .from("operational_entity_records")
            .select("entity_type,entity_key,customer_external_id,data")
            .eq("workspace", "imported")
            .order("created_at", { ascending: true })
            .then(({ data, error }) => {
              if (error || !data) return;
              remoteApplying.current = true;
              setState((current) => mergeImportedEntityRecords(current, data as PersistedEntityRecord[]));
              setPersistence((current) => ({ ...current, status: "synced", error: "" }));
            });
        },
      )
      .subscribe();
    return () => { void client.removeChannel(channel); };
  }, [databaseReady, persistence.mode]);

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
    ) => {
      const transition = reason.match(/([^;]+?)\s*->\s*([^;]+)/);
      return {
        id: `AUD-${Date.now()}-${current.events.length}`,
        actor: actorForRole(current.role),
        role: current.role,
        action: reason ? `${action} · ${reason}` : action,
        entity,
        result,
        at: timestamp().replace("T", " ").slice(0, 16),
        correlationId: globalThis.crypto.randomUUID(),
        beforeState: transition ? { value: transition[1].trim() } : null,
        afterState: transition ? { value: transition[2].trim() } : { result },
        reason: reason || undefined,
      };
    },
    [actorForRole],
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
        if (!canUploadType(current.role, type))
          throw new Error(`${current.role} cannot import ${type}`);
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
        const campaignResults: CampaignResultRecord[] =
          type === "campaign_results"
            ? (result.records ?? result.preview).map((row, index) => ({
                id: `${String(row.campaign_id)}-${String(row.channel)}-${String(row.recorded_at)}-${index}`,
                datasetId: workspace,
                sourceType: "Manual Upload",
                campaignId: String(row.campaign_id ?? ""),
                campaignName: String(row.campaign_name ?? ""),
                channel: String(row.channel ?? ""),
                status: String(row.status ?? "recorded"),
                audienceSize: Number(row.audience_size ?? 0),
                impressions: Number(row.impressions ?? 0),
                clicks: Number(row.clicks ?? 0),
                responses: Number(row.responses ?? 0),
                conversions: Number(row.conversions ?? 0),
                revenue: Number(row.revenue ?? 0),
                recordedAt: String(row.recorded_at ?? timestamp()),
                sourceFileName: result.filename,
              }))
            : [];
        return {
          ...current,
          activeWorkspace: workspace,
          lastImportSummary: summary,
          datasets: { ...current.datasets, [workspace]: committed.dataset },
          marketingOpportunities: [
            ...current.marketingOpportunities.filter(
              (item) => item.datasetId !== workspace,
            ),
            ...calculateMarketingOpportunities(
              committed.dataset,
              current.thresholds,
              current.marketingOpportunities.filter(
                (item) => item.datasetId === workspace,
              ),
            ),
          ],
          imports: [record, ...current.imports],
          campaignResults: campaignResults.length
            ? [
                ...campaignResults,
                ...current.campaignResults.filter(
                  (item) =>
                    !campaignResults.some((incoming) => incoming.id === item.id),
                ),
              ]
            : current.campaignResults,
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
    [actorForRole, createEvent, update],
  );

  const createRecommendation = useCallback(
    (customerId: string) => {
      const customer = state.datasets[state.activeWorkspace].customers.find(
        (item) => item.id === customerId,
      );
      if (!customer) throw new Error("Customer was not found");
      if (
        state.role === "Auditor" ||
        !accessibleCustomers(
          state.datasets[state.activeWorkspace].customers,
          state.role,
          state.activeWorkspace === "imported" && persistence.authenticated
            ? persistence.actor
            : undefined,
        ).some((item) => item.id === customerId)
      )
        throw new Error("Customer access denied");
      const analysis = state.datasets[state.activeWorkspace].analyses.find(
        (item) => item.customerId === customerId,
      );
      if (!analysis)
        throw new Error("Run and validate AVO Analysis before generating a recommendation");
      const existingForAnalysis = state.recommendations.find(
        (item) => item.analysisId === analysis.id && item.customerId === customerId,
      );
      if (existingForAnalysis) return existingForAnalysis;
      const signals = state.datasets[state.activeWorkspace].signals.filter(
        (item) => item.analysisId === analysis.id,
      );
      const types = new Set(signals.map((item) => item.type));
      const action =
        types.has("Cancellation intent") || types.has("Severe complaint")
          ? "Resolve validated service issues before any promotional outreach"
          : types.has("Price objection")
            ? "Arrange a staff-led value review using approved product information"
            : customer.productGap
              ? `Offer a staff-led review of ${customer.productGap} using the approved catalogue`
              : "Complete an evidence-led customer follow-up";
      const stableSeedId =
        customerId === "CUS-1001"
          ? "REC-001"
          : customerId === "CUS-1002"
            ? "REC-002"
            : undefined;
      const id =
        stableSeedId ??
        `REC-${customerId.replace(/[^A-Z0-9]/gi, "").slice(-6)}-${analysis.id.slice(-6)}`;
      const calculation =
        state.datasets[state.activeWorkspace].churnCalculations[customerId];
      const record: RecommendationRecord = {
        id,
        datasetId: state.activeWorkspace,
        sourceType: "AVO Analysis",
        customerId,
        analysisId: analysis.id,
        action,
        explanation: analysis.summary,
        priority:
          calculation?.risk === "Critical"
            ? "Urgent"
            : calculation?.risk === "High"
              ? "High"
              : calculation?.risk === "Medium"
                ? "Medium"
                : "Low",
        status: "Draft",
        channel: customer.preferredChannel,
        confidence: `${analysis.confidence}%`,
        uncertainty:
          "This recommendation is a draft inference. Staff must validate current customer context and policy before submission.",
        owner: customer.staff,
        deadline: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
        evidenceIds: analysis.evidenceIds,
        createdAt: timestamp(),
      };
      update((current) => ({
        ...current,
        recommendations: [
          record,
          ...current.recommendations.filter((item) => item.id !== id),
        ],
        recommendationStatuses: {
          ...current.recommendationStatuses,
          [id]: "Draft",
        },
        events: [
          createEvent(
            current,
            "Customer-specific recommendation created",
            `${id} / ${customerId} / ${analysis.id}`,
            "Draft",
            `Based on ${analysis.evidenceIds.length} validated evidence references`,
          ),
          ...current.events,
        ],
      }));
      return record;
    },
    [createEvent, persistence.actor, persistence.authenticated, state, update],
  );

  const submitRecommendation = useCallback(
    (
      recommendationId: string,
      draft: string,
      owner: string,
      deadline: string,
    ) => {
      let existing = state.actions.find(
        (item) => item.recommendationId === recommendationId,
      );
      const recommendation = state.recommendations.find(
        (item) => item.id === recommendationId,
      );
      if (!recommendation) throw new Error("Recommendation was not found");
      const customer = state.datasets[state.activeWorkspace].customers.find(
        (item) => item.id === recommendation.customerId,
      );
      if (!customer) throw new Error("Linked customer was not found");
      if (!existing) {
        const at = timestamp();
        existing = {
          id: `ACT-${Date.now()}`,
          datasetId: state.activeWorkspace,
          sourceType: "AVO Recommendation",
          recommendationId,
          alertId:
            state.datasets[state.activeWorkspace].alerts.find(
              (item) => item.customerId === customer.id && item.status === "Active",
            )?.id ?? "No active alert",
          customerId: customer.id,
          customerName: customer.name,
          tier: customer.tier,
          risk: customer.risk,
          recommendation: recommendation.action,
          explanation: recommendation.explanation,
          priority: recommendation.priority,
          actionType: recommendation.channel,
          owner,
          approver: "Farah Chen",
          requester: actorForRole(state.role),
          deadline,
          status: "Draft",
          approvalStatus: "Not submitted",
          executionStatus: "Not started",
          confidence: recommendation.confidence,
          uncertainty: recommendation.uncertainty,
          evidence: recommendation.evidenceIds,
          originalAvoOutput: recommendation.action,
          humanEditedOutput: draft,
          reviewerComment: "",
          rejectionReason: "",
          outcome: "",
          customerResponse: "",
          versions: [{ version: 1, content: draft, actor: actorForRole(state.role), at }],
          history: [{ status: "Draft", actor: actorForRole(state.role), role: state.role, comment: "Action created from customer-specific recommendation", at }],
        };
      }
      if (
        !accessibleCustomers(
          state.datasets[state.activeWorkspace].customers,
          state.role,
          state.activeWorkspace === "imported" && persistence.authenticated
            ? persistence.actor
            : undefined,
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
            fromStatus: "Draft",
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
        actions: current.actions.some((item) => item.id === submitted.id)
          ? current.actions.map((item) =>
              item.id === submitted.id ? submitted : item,
            )
          : [submitted, ...current.actions],
        recommendations: current.recommendations.map((item) =>
          item.id === recommendationId
            ? { ...item, status: "Submitted" }
            : item,
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
            `Draft -> Pending Approval; requester ${submitted.requester}; approver Sales Manager`,
          ),
          ...current.events,
        ],
      }));
      return submitted;
    },
    [actorForRole, createEvent, persistence.actor, persistence.authenticated, state, update],
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
                    fromStatus: "Pending Approval",
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
          {
            ...createEvent(
            current,
            `Retention action ${decision.toLowerCase()}`,
            actionId,
            decision,
            `Pending Approval -> ${decision === "Approved" ? "Approved and Ready" : decision}; ${comment}`,
            ),
            reviewerComment: comment,
          },
          ...current.events,
        ],
      }));
    },
    [actorForRole, createEvent, state, update],
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
                    fromStatus: "Changes Requested",
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
            "Changes Requested -> Draft Revision",
          ),
          ...current.events,
        ],
      }));
    },
    [actorForRole, createEvent, state, update],
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
                    fromStatus: "Approved and Ready",
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
            "Approved and Ready -> In Progress",
          ),
          ...current.events,
        ],
      }));
    },
    [actorForRole, createEvent, state, update],
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
                    fromStatus: "In Progress",
                    status,
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
            "In Progress -> " + status + "; executor " + actor,
          ),
          ...current.events,
        ],
      }));
    },
    [actorForRole, createEvent, state, update],
  );

  const recordResponse = useCallback(
    (actionId: string, responseText: string, sentiment: Sentiment) => {
      if (!responseText.trim()) throw new Error("Response summary is required");
      const item = state.actions.find((candidate) => candidate.id === actionId);
      if (!item || item.status !== "Waiting for Customer")
        throw new Error("Action is not waiting for a customer response");
      const actor = actorForRole(state.role);
      if (!canOwnerOperate(state.role, actor, item.owner))
        throw new Error("Only the assigned action owner can record a customer response");
      assertActionTransition(item.status, "Outcome Required");
      const at = timestamp();
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
          marketingOpportunities: [
            ...current.marketingOpportunities.filter((item) => item.datasetId !== workspace),
            ...calculateMarketingOpportunities(
              recalculated,
              current.thresholds,
              current.marketingOpportunities.filter((item) => item.datasetId === workspace),
            ),
          ],
          actions: current.actions.map((candidate) =>
            candidate.id === actionId
              ? {
                  ...candidate,
                  status: "Outcome Required",
                  customerResponse: responseText,
                  history: [
                    ...candidate.history,
                    {
                      fromStatus: "Waiting for Customer",
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
              "Waiting for Customer -> Outcome Required; action " + actionId,
            ),
            ...current.events,
          ],
        };
      });
    },
    [actorForRole, createEvent, state, update],
  );

  const recordOutcome = useCallback(
    (actionId: string, outcome: OutcomeType, notes: string) => {
      if (!notes.trim()) throw new Error("Outcome notes are required");
      const item = state.actions.find((candidate) => candidate.id === actionId);
      if (!item || item.status !== "Outcome Required")
        throw new Error(
          "Execution must be confirmed before recording an outcome",
        );
      const actor = actorForRole(state.role);
      if (!canOwnerOperate(state.role, actor, item.owner))
        throw new Error("Only the assigned action owner can record an outcome");
      assertActionTransition(item.status, "Completed");
      const at = timestamp();
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
          marketingOpportunities: [
            ...current.marketingOpportunities.filter((item) => item.datasetId !== workspace),
            ...calculateMarketingOpportunities(
              recalculated,
              current.thresholds,
              current.marketingOpportunities.filter((item) => item.datasetId === workspace),
            ),
          ],
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
                      fromStatus: "Outcome Required",
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
              "Outcome Required -> Completed; Score " + before + " -> " + after,
            ),
            ...current.events,
          ],
        };
      });
    },
    [actorForRole, createEvent, state, update],
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
          marketingOpportunities: [
            ...current.marketingOpportunities.filter(
              (item) => item.datasetId !== workspace,
            ),
            ...calculateMarketingOpportunities(
              stored.dataset,
              current.thresholds,
              current.marketingOpportunities.filter(
                (item) => item.datasetId === workspace,
              ),
            ),
          ],
          events: [
            createEvent(
              current,
              "AVO signals validated and churn recalculated",
              customerId,
              "Success",
              "Score " + calculation.previousScore + " -> " + calculation.score,
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
          marketingOpportunities: [
            ...current.marketingOpportunities.filter(
              (item) => item.datasetId !== workspace,
            ),
            ...calculateMarketingOpportunities(
              result.dataset,
              current.thresholds,
              current.marketingOpportunities.filter(
                (item) => item.datasetId === workspace,
              ),
            ),
          ],
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
      update((current) => {
        if (!["Administrator", "Marketing Manager"].includes(current.role))
          throw new Error("Marketing Manager or Administrator role is required");
        let campaign = { ...current.campaign, ...patch };
        const opportunity = current.marketingOpportunities.find(
          (item) => item.id === campaign.triggerId,
        );
        if (opportunity) {
          const audience = calculateCampaignAudience(
            current.datasets[campaign.datasetId],
            opportunity,
            campaign.channels,
          );
          campaign = {
            ...campaign,
            totalAudience: audience.total,
            consentedAudience: audience.includedCustomerIds.length,
            excludedAudience: audience.exclusions.length,
            includedCustomerIds: audience.includedCustomerIds,
            exclusions: audience.exclusions,
            audienceCalculatedAt: timestamp(),
          };
        } else if (campaign.audienceRegion && campaign.audienceIndustry) {
          const audience = calculateSegmentAudience(
            current.datasets[campaign.datasetId],
            campaign.audienceRegion,
            campaign.audienceIndustry,
            campaign.channels,
          );
          campaign = {
            ...campaign,
            segment: `${campaign.audienceRegion} · ${campaign.audienceIndustry}`,
            totalAudience: audience.total,
            consentedAudience: audience.includedCustomerIds.length,
            excludedAudience: audience.exclusions.length,
            includedCustomerIds: audience.includedCustomerIds,
            exclusions: audience.exclusions,
            audienceCalculatedAt: timestamp(),
          };
        }
        const campaigns = current.campaigns.some(
          (item) => item.id === campaign.id,
        )
          ? current.campaigns.map((item) =>
              item.id === campaign.id ? campaign : item,
            )
          : [campaign, ...current.campaigns];
        return { ...current, campaign, campaigns, activeCampaignId: campaign.id };
      }),
    [update],
  );

  const selectCampaign = useCallback(
    (campaignId: string) =>
      update((current) => {
        const selected = current.campaigns.find((item) => item.id === campaignId);
        if (!selected) throw new Error("Campaign was not found");
        return { ...current, campaign: selected, activeCampaignId: campaignId };
      }),
    [update],
  );

  const openCampaignFromOpportunity = useCallback(
    (opportunityId: string) => {
      let opened!: CampaignDraft;
      update((current) => {
        if (!["Administrator", "Marketing Manager"].includes(current.role))
          throw new Error("Marketing Manager or Administrator role is required");
        const opportunity = current.marketingOpportunities.find(
          (item) =>
            item.id === opportunityId && item.datasetId === current.activeWorkspace,
        );
        if (!opportunity) throw new Error("Marketing opportunity was not found");
        const existing = current.campaigns.find(
          (item) => item.triggerId === opportunityId,
        ) ?? (current.campaign.triggerId === opportunityId ? current.campaign : undefined);
        if (existing) {
          opened = existing;
          return {
            ...current,
            campaign: existing,
            campaigns: current.campaigns.some((item) => item.id === existing.id)
              ? current.campaigns
              : [existing, ...current.campaigns],
            activeCampaignId: existing.id,
          };
        }
        const channels = ["LinkedIn", "Email"];
        const audience = calculateCampaignAudience(
          current.datasets[opportunity.datasetId],
          opportunity,
          channels,
        );
        const id = opportunity.id === "MKT-003" ? "CAM-003" : `CAM-${Date.now()}`;
        const actor = actorForRole(current.role);
        opened = {
          ...current.campaign,
          id,
          datasetId: opportunity.datasetId,
          sourceType: "Calculated Opportunity",
          triggerId: opportunity.id,
          status: "Draft",
          step: 1,
          name: `${opportunity.region} value clarity`,
          objective: `Re-engage consented ${opportunity.region} ${opportunity.industry} customers with approved product education`,
          problem: `${opportunity.affectedPercentage}% of the segment meets a calculated decline or risk threshold.`,
          segment: `${opportunity.region} · ${opportunity.industry}`,
          audienceRegion: opportunity.region,
          audienceIndustry: opportunity.industry,
          channels,
          totalAudience: audience.total,
          consentedAudience: audience.includedCustomerIds.length,
          excludedAudience: audience.exclusions.length,
          includedCustomerIds: audience.includedCustomerIds,
          exclusions: audience.exclusions,
          audienceCalculatedAt: timestamp(),
          generated: false,
          versions: [],
          confirmations: {},
          requester: actor,
          reviewerComment: "",
          approvalHistory: [{ status: "Draft", actor, role: current.role, comment: `Campaign opened from calculated ${opportunity.id}`, at: timestamp() }],
        };
        return {
          ...current,
          campaign: opened,
          campaigns: [opened, ...current.campaigns.filter((item) => item.id !== id)],
          activeCampaignId: id,
          events: [
            createEvent(current, "Campaign created from calculated opportunity", `${id} / ${opportunity.id}`, "Draft"),
            ...current.events,
          ],
        };
      });
      return opened;
    },
    [actorForRole, createEvent, update],
  );

  const setOpportunityStatus = useCallback(
    (
      opportunityId: string,
      status: "Active" | "Monitoring" | "Dismissed",
      reason = "",
    ) => {
      if (!["Administrator", "Marketing Manager"].includes(state.role))
        throw new Error("Marketing Manager or Administrator role is required");
      if (status === "Dismissed" && !reason.trim())
        throw new Error("A dismissal reason is required");
      update((current) => ({
        ...current,
        marketingOpportunities: current.marketingOpportunities.map((item) =>
          item.id === opportunityId
            ? { ...item, status, dismissalReason: reason.trim() || undefined }
            : item,
        ),
        events: [
          createEvent(current, "Marketing opportunity status changed", opportunityId, status, reason),
          ...current.events,
        ],
      }));
    },
    [createEvent, state.role, update],
  );

  const addScheduledPosts = useCallback(
    (posts: ScheduledPostRecord[]) =>
      update((current) => {
        if (!["Administrator", "Marketing Manager"].includes(current.role))
          throw new Error("Marketing Manager or Administrator role is required");
        return ({
        ...current,
        campaign: { ...current.campaign, status: "Scheduled", step: 7 },
        campaigns: current.campaigns.map((item) =>
          item.id === current.campaign.id
            ? { ...current.campaign, status: "Scheduled", step: 7 }
            : item,
        ),
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
        });
      }),
    [createEvent, update],
  );

  const value = useMemo<WorkflowContextValue>(
    () => ({
      state,
      hydrated,
      persistence,
      signOut: async () => {
        const client = getSupabaseBrowserClient();
        if (client) await client.auth.signOut();
        databaseUser.current = null;
        databaseActor.current = "";
        window.location.assign("/login");
      },
      dataset: state.datasets[state.activeWorkspace],
      accessibleCustomers: accessibleCustomers(
        state.datasets[state.activeWorkspace].customers,
        state.role,
        state.activeWorkspace === "imported" && persistence.authenticated
          ? persistence.actor
          : undefined,
      ),
      accessibleActions: accessibleActions(
        state.actions.filter(
          (action) => action.datasetId === state.activeWorkspace,
        ),
        state.datasets[state.activeWorkspace].customers,
        state.role,
        state.activeWorkspace === "imported" && persistence.authenticated
          ? persistence.actor
          : undefined,
      ),
      lookupCustomer: (customerId) =>
        lookupAccessibleCustomer(
          state.datasets[state.activeWorkspace].customers,
          state.role,
          customerId,
          state.activeWorkspace === "imported" && persistence.authenticated
            ? persistence.actor
            : undefined,
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
        update((current) => {
          if (current.activeWorkspace === "imported" && persistence.authenticated)
            throw new Error("Imported Workspace role is controlled by Supabase authentication");
          return {
            ...current,
            role,
            events: [
              createEvent(current, "Demo role switched", role, "Success"),
              ...current.events,
            ],
          };
        }),
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
      createRecommendation,
      recalculate,
      updateCampaign,
      openCampaignFromOpportunity,
      selectCampaign,
      setOpportunityStatus,
      addScheduledPosts,
      reset: () => {
        setState((current) => {
          const fresh = createInitialDemoState(audits);
          return {
            ...fresh,
            campaigns: [fresh.campaign],
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
      persistence,
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
      createRecommendation,
      recalculate,
      updateCampaign,
      openCampaignFromOpportunity,
      selectCampaign,
      setOpportunityStatus,
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
