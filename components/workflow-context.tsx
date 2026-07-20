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
import type { AVOActionPlan } from "@/lib/avo";
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
  mergeImportedWorkspace,
  serializeImportedEntities,
  snapshotImportedWorkspace,
  type ImportedWorkspaceSnapshot,
  type PersistedEntityRecord,
} from "@/lib/workspace-persistence";

const STORAGE_KEY = "customerpulse-demo-v2";
const PROJECTS_KEY = "customerpulse-imported-projects-v1";

export interface ImportedProject {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  snapshot: ImportedWorkspaceSnapshot;
}

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
  projects: ImportedProject[];
  activeProjectId: string;
  activeProject?: ImportedProject;
  createProject: (name: string, description?: string) => ImportedProject;
  switchProject: (projectId: string) => void;
  addImport: (result: ImportResult, type: string) => Promise<ImportCommitSummary>;
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
  selectActionPlan: (
    customerId: string,
    plan: AVOActionPlan,
    owner: string,
    dueDate: string,
  ) => RetentionActionRecord;
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
  const [projects, setProjects] = useState<ImportedProject[]>([]);
  const [activeProjectId, setActiveProjectId] = useState("");
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
  const stateRef = useRef(state);
  const activeProjectIdRef = useRef(activeProjectId);
  useEffect(() => {
    stateRef.current = state;
    activeProjectIdRef.current = activeProjectId;
  }, [activeProjectId, state]);
  const actorForRole = useCallback(
    (role: Role) => databaseActor.current || demoActorForRole(role),
    [],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        let restored = createInitialDemoState(audits);
        if (saved) {
          const parsed = JSON.parse(saved) as DemoWorkflowState;
          if (parsed.version === 5) {
            restored = {
              ...parsed,
              campaigns: parsed.campaigns?.length
                ? parsed.campaigns
                : [parsed.campaign],
            };
            setState(restored);
          }
        }
        const savedProjects = localStorage.getItem(PROJECTS_KEY);
        if (savedProjects) {
          const parsedProjects = JSON.parse(savedProjects) as {
            activeProjectId: string;
            projects: ImportedProject[];
          };
          setProjects(parsedProjects.projects ?? []);
          setActiveProjectId(parsedProjects.activeProjectId ?? "");
          const active = parsedProjects.projects?.find(
            (item) => item.id === parsedProjects.activeProjectId,
          );
          if (active) setState((current) => mergeImportedWorkspace(current, active.snapshot));
        } else if (
          restored.datasets.imported.customers.length ||
          restored.datasets.imported.transactions.length ||
          restored.imports.length
        ) {
          const at = timestamp();
          const legacy: ImportedProject = {
            id: globalThis.crypto.randomUUID(),
            name: "Legacy Imported Project",
            description: "Imported data migrated from the previous single-workspace format.",
            createdAt: at,
            updatedAt: at,
            snapshot: snapshotImportedWorkspace(restored),
          };
          setProjects([legacy]);
          setActiveProjectId(legacy.id);
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
    if (activeProjectId && state.activeWorkspace === "imported") {
      const timer = window.setTimeout(() => {
        setProjects((current) =>
          current.map((project) =>
            project.id === activeProjectId
              ? {
                  ...project,
                  updatedAt: timestamp(),
                  snapshot: snapshotImportedWorkspace(state),
                }
              : project,
          ),
        );
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [activeProjectId, hydrated, state]);
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(
      PROJECTS_KEY,
      JSON.stringify({ activeProjectId, projects }),
    );
  }, [activeProjectId, hydrated, projects]);

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
      const [recordsResult, projectsResult] = await Promise.all([
        client
          .from("operational_entity_records")
          .select("project_id,entity_type,entity_key,customer_external_id,data")
          .eq("workspace", "imported")
          .order("created_at", { ascending: true }),
        client
          .from("operational_projects")
          .select("id,name,description,created_at,updated_at")
          .eq("status", "active")
          .order("created_at", { ascending: true }),
      ]);
      if (cancelled) return;
      const stored = recordsResult.data as PersistedEntityRecord[] | null;
      const remoteProjects = projectsResult.data ?? [];
      const baseState = stateRef.current;
      const rememberedProjectId = activeProjectIdRef.current;
      const loadedProjects: ImportedProject[] = remoteProjects.map((project) => {
        const projectRows = (stored ?? []).filter((row) => row.project_id === project.id);
        const merged = projectRows.length
          ? mergeImportedEntityRecords(baseState, projectRows)
          : mergeImportedWorkspace(baseState, snapshotImportedWorkspace({
              ...createInitialDemoState([]),
              activeWorkspace: "imported",
              events: [],
            }));
        return {
          id: project.id,
          name: project.name,
          description: project.description ?? "",
          createdAt: project.created_at,
          updatedAt: project.updated_at,
          snapshot: snapshotImportedWorkspace(merged),
        };
      });
      const selected = loadedProjects.find((project) => project.id === rememberedProjectId) ?? loadedProjects[0];
      setProjects(loadedProjects);
      setActiveProjectId(selected?.id ?? "");
      const merged = selected ? mergeImportedWorkspace(baseState, selected.snapshot) : baseState;
      auditBaseline.current = new Set(merged.events.map((event) => event.id));
      setState({ ...merged, role: databaseRole });
      const loadError = recordsResult.error ?? projectsResult.error;
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
    if (!hydrated || !databaseReady || !client || !identity || persistence.mode !== "supabase" || !activeProjectId) return;
    if (remoteApplying.current) {
      remoteApplying.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      void (async () => {
        setPersistence((current) => ({ ...current, status: "saving", error: "" }));
        const activeProject = projects.find((project) => project.id === activeProjectId);
        if (activeProject && state.role !== "Auditor") {
          const projectResult = await client.from("operational_projects").upsert({
            id: activeProject.id,
            organization_id: identity.organizationId,
            name: activeProject.name,
            description: activeProject.description,
            status: "active",
            created_by: identity.id,
            created_at: activeProject.createdAt,
            updated_at: activeProject.updatedAt,
          }, { onConflict: "id" });
          if (projectResult.error) {
            setPersistence((current) => ({ ...current, status: "error", error: projectResult.error.message }));
            return;
          }
        }
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
          project_id: activeProjectId,
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
            { onConflict: "organization_id,workspace,project_id,entity_type,entity_key" },
          );
          if (result.error) { error = result.error; break; }
        }
        const newEvents = state.events.filter((event) => !auditBaseline.current.has(event.id));
        if (newEvents.length) {
          const { error: auditError } = await client.from("audit_logs").insert(
            newEvents.map((event) => ({
              organization_id: identity.organizationId,
              project_id: activeProjectId,
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
  }, [activeProjectId, databaseReady, hydrated, persistence.mode, projects, state]);

  useEffect(() => {
    const client = getSupabaseBrowserClient();
    if (!client || persistence.mode !== "supabase" || !databaseReady || !activeProjectId) return;
    const channel = client
      .channel(`customerpulse-imported-project-${activeProjectId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "operational_entity_records", filter: `project_id=eq.${activeProjectId}` },
        (payload) => {
          const changed = payload.new as Record<string, unknown>;
          if (changed.updated_by === databaseUser.current?.id) return;
          void client
            .from("operational_entity_records")
            .select("project_id,entity_type,entity_key,customer_external_id,data")
            .eq("workspace", "imported")
            .eq("project_id", activeProjectId)
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
  }, [activeProjectId, databaseReady, persistence.mode]);

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
      if (!activeProjectId)
        return Promise.reject(new Error("Create or select an Imported Workspace project before uploading files"));
      return new Promise<ImportCommitSummary>((resolve, reject) => update((current) => {
        try {
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
        const summary = committed.summary;
        const id = "IMP-" + Date.now();
        const record = {
          id,
          type,
          filename: result.filename,
          validCount: result.validCount,
          invalidCount: result.invalidCount,
          duplicateCount: result.duplicateCount,
          recordsAdded: type === "campaign_results" ? result.validCount : summary.added,
          recordsUpdated: summary.updated,
          recordsRejected: summary.rejected,
          chunksCreated: result.chunks?.length ?? 0,
          uploader: actorForRole(current.role),
          at: timestamp(),
          result,
        };
        const campaignResults: CampaignResultRecord[] =
          type === "campaign_results"
            ? (result.records ?? result.preview).map((row, index) => {
              const customerExternalId = String(row.customer_external_id ?? "").trim();
              const customer = committed.dataset.customers.find(
                (item) => item.id === customerExternalId || item.originalExternalId === customerExternalId,
              );
              const rawSentiment = String(row.response_sentiment ?? "").trim().toLowerCase();
              const responseSentiment = rawSentiment === "positive"
                ? "Positive"
                : rawSentiment === "negative"
                  ? "Negative"
                  : rawSentiment === "neutral"
                    ? "Neutral"
                    : undefined;
              return {
                id: `${String(row.campaign_id)}-${customerExternalId || "aggregate"}-${String(row.channel)}-${String(row.recorded_at)}-${index}`,
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
                customerId: customer?.id,
                customerExternalId: customerExternalId || undefined,
                responseSentiment: responseSentiment as Sentiment | undefined,
                responseText: String(row.response_text ?? "") || undefined,
                outcomeType: String(row.outcome_type ?? "") || undefined,
                outcomeNotes: String(row.outcome_notes ?? "") || undefined,
                customerRevenue: Number(row.customer_revenue ?? 0),
              };
            })
            : [];
        const campaignRiskEvents = type === "campaign_results"
          ? summary.affectedCustomerIds.map((customerId) => {
              const before = current.datasets[workspace].churnCalculations[customerId]?.score ?? 0;
              const after = committed.dataset.churnCalculations[customerId]?.score ?? before;
              return createEvent(
                current,
                "Customer-level campaign evidence imported and risk recalculated",
                `${id} / ${customerId}`,
                "Success",
                `Score ${before} -> ${after}`,
              );
            })
          : [];
        const next = {
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
            ...campaignRiskEvents,
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
        queueMicrotask(() => resolve(summary));
        return next;
        } catch (error) {
          queueMicrotask(() => reject(error));
          return current;
        }
      }));
    },
    [activeProjectId, actorForRole, createEvent, update],
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
      const fallbackAction =
        types.has("Cancellation intent") || types.has("Severe complaint")
          ? "Resolve validated service issues before any promotional outreach"
          : types.has("Price objection")
            ? "Arrange a staff-led value review using approved product information"
            : types.has("Product interest")
              ? "Review the expressed product interest using the approved catalogue"
            : customer.productGap
              ? `Offer a staff-led review of ${customer.productGap} using the approved catalogue`
              : "Complete an evidence-led customer follow-up";
      const action = analysis.customerMessageDraft?.body || fallbackAction;
      const stableSeedId =
        state.activeWorkspace === "demo" && customerId === "CUS-1001"
          ? "REC-001"
          : state.activeWorkspace === "demo" && customerId === "CUS-1002"
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
        explanation: analysis.customerMessageDraft?.rationale || analysis.summary,
        priority:
          calculation?.risk === "Critical"
            ? "Urgent"
            : calculation?.risk === "High"
              ? "High"
              : calculation?.risk === "Medium"
                ? "Medium"
                : "Low",
        status: "Draft",
        channel: analysis.customerMessageDraft?.channel || customer.preferredChannel,
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

  const selectActionPlan = useCallback(
    (customerId: string, plan: AVOActionPlan, owner: string, dueDate: string) => {
      if (state.role !== "Administrator")
        throw new Error("Only an Administrator can select an AVO action plan");
      if (!owner.trim() || !dueDate)
        throw new Error("Action owner and due date are required");
      if (new Date(`${dueDate}T23:59:59`).getTime() < Date.now())
        throw new Error("Due date cannot be in the past");
      const customer = state.datasets[state.activeWorkspace].customers.find(
        (item) => item.id === customerId,
      );
      if (!customer) throw new Error("Customer was not found");
      const analysis = state.datasets[state.activeWorkspace].analyses.find(
        (item) => item.customerId === customerId && item.actionPlans.some((candidate) => candidate.id === plan.id),
      );
      if (!analysis) throw new Error("The selected plan is not part of the stored AVO analysis");
      const existing = state.actions.find(
        (item) => item.sourceType === "AVO Action Plan" && item.customerId === customerId && item.selectedPlanId === plan.id && item.status !== "Cancelled",
      );
      if (existing) return existing;
      const at = timestamp();
      const action: RetentionActionRecord = {
        id: `PLAN-ACT-${Date.now()}`,
        datasetId: state.activeWorkspace,
        sourceType: "AVO Action Plan",
        recommendationId: analysis.id,
        alertId: state.datasets[state.activeWorkspace].alerts.find(
          (item) => item.customerId === customerId && item.status === "Active",
        )?.id ?? "No active alert",
        customerId,
        customerName: customer.name,
        tier: customer.tier,
        risk: customer.risk,
        recommendation: plan.title,
        explanation: `${plan.description} ${plan.rationale}`,
        priority: plan.priority,
        actionType: plan.action_type,
        owner: owner.trim(),
        approver: actorForRole(state.role),
        requester: actorForRole(state.role),
        deadline: dueDate,
        status: "Approved and Ready",
        approvalStatus: "Administrator selected",
        executionStatus: "Not started",
        confidence: `${analysis.confidence}%`,
        uncertainty: "AVO proposed this plan; a human remains responsible for execution and completion.",
        evidence: plan.evidence_ids,
        originalAvoOutput: plan.description,
        humanEditedOutput: plan.description,
        reviewerComment: "Selected by Administrator from three AVO action plans",
        rejectionReason: "",
        outcome: "",
        customerResponse: "",
        selectedPlanId: plan.id,
        completionCriteria: plan.completion_criteria,
        versions: [{ version: 1, content: plan.description, actor: actorForRole(state.role), at }],
        history: [{ status: "Approved and Ready", actor: actorForRole(state.role), role: state.role, comment: `AVO action plan selected and approved by Administrator; owner ${owner.trim()}; due ${dueDate}`, at }],
      };
      update((current) => ({
        ...current,
        actions: [action, ...current.actions],
        events: [
          createEvent(current, "AVO action plan selected", action.id, "Approved and Ready", `${plan.id}; owner ${owner.trim()}; due ${dueDate}; execution and outcome still required`),
          ...current.events,
        ],
      }));
      return action;
    },
    [actorForRole, createEvent, state, update],
  );

  useEffect(() => {
    if (!hydrated) return;
    const markOverdue = () =>
      setState((current) => {
        const today = new Date().toISOString().slice(0, 10);
        const overdue = current.actions.filter(
          (item) =>
            item.sourceType === "AVO Action Plan" &&
            ["Approved and Ready", "In Progress", "Waiting for Customer", "Outcome Required"].includes(item.status) &&
            item.deadline < today,
        );
        if (!overdue.length) return current;
        const at = timestamp();
        return {
          ...current,
          actions: current.actions.map((item) =>
            overdue.some((candidate) => candidate.id === item.id)
              ? {
                  ...item,
                  status: "Not Completed" as const,
                  executionStatus: "Not Completed",
                  history: [
                    ...item.history,
                    {
                      fromStatus: item.status,
                      status: "Not Completed",
                      actor: "CustomerPulse Scheduler",
                      role: "Administrator",
                      comment: `Due date ${item.deadline} passed before a verified outcome was recorded`,
                      at,
                    },
                  ],
                }
              : item,
          ),
          events: [
            ...overdue.map((item) =>
              createEvent(
                current,
                "AVO action plan overdue",
                item.id,
                "Not Completed",
                `${item.status} -> Not Completed; due ${item.deadline}`,
              ),
            ),
            ...current.events,
          ],
        };
      });
    markOverdue();
    const timer = window.setInterval(markOverdue, 60_000);
    return () => window.clearInterval(timer);
  }, [createEvent, hydrated]);

  const submitRecommendation = useCallback(
    (
      recommendationId: string,
      draft: string,
      owner: string,
      deadline: string,
    ) => {
      let existing = state.actions.find(
        (item) =>
          item.datasetId === state.activeWorkspace &&
          item.recommendationId === recommendationId,
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
      if (!item || !["Approved and Ready", "Not Completed"].includes(item.status))
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
                    fromStatus: item.status,
                    status: "In Progress",
                    actor,
                    role: state.role,
                    comment: item.status === "Not Completed" ? "Overdue action resumed" : "Approved action started",
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
            `${item.status} -> In Progress`,
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
        const before = dataset.churnCalculations[item.customerId]?.score ?? 0;
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
        const after = recalculated.churnCalculations[item.customerId]?.score ?? before;
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
              `Waiting for Customer -> Outcome Required; action ${actionId}; Score ${before} -> ${after}`,
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

  const createProject = useCallback(
    (rawName: string, description = "") => {
      const name = rawName.trim();
      if (!name) throw new Error("Project name is required");
      if (projects.some((project) => project.name.toLowerCase() === name.toLowerCase()))
        throw new Error("A project with this name already exists");
      const at = timestamp();
      const blankState = {
        ...createInitialDemoState([]),
        activeWorkspace: "imported" as const,
        role: state.role,
        thresholds: state.thresholds,
        events: [],
      };
      const project: ImportedProject = {
        id: globalThis.crypto.randomUUID(),
        name,
        description: description.trim(),
        createdAt: at,
        updatedAt: at,
        snapshot: snapshotImportedWorkspace(blankState),
      };
      setProjects((current) => [
        project,
        ...current.map((item) =>
          item.id === activeProjectId && state.activeWorkspace === "imported"
            ? { ...item, updatedAt: at, snapshot: snapshotImportedWorkspace(state) }
            : item,
        ),
      ]);
      setActiveProjectId(project.id);
      setState((current) => ({
        ...mergeImportedWorkspace(current, project.snapshot),
        activeWorkspace: "imported",
      }));
      return project;
    },
    [activeProjectId, projects, state],
  );

  const switchProject = useCallback(
    (projectId: string) => {
      const target = projects.find((project) => project.id === projectId);
      if (!target) throw new Error("Project was not found");
      const at = timestamp();
      setProjects((current) =>
        current.map((project) =>
          project.id === activeProjectId && state.activeWorkspace === "imported"
            ? { ...project, updatedAt: at, snapshot: snapshotImportedWorkspace(state) }
            : project,
        ),
      );
      setActiveProjectId(projectId);
      setState((current) => ({
        ...mergeImportedWorkspace(current, target.snapshot),
        activeWorkspace: "imported",
      }));
    },
    [activeProjectId, projects, state],
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
      projects,
      activeProjectId,
      activeProject: projects.find((project) => project.id === activeProjectId),
      createProject,
      switchProject,
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
      selectActionPlan,
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
      selectActionPlan,
      recalculate,
      updateCampaign,
      openCampaignFromOpportunity,
      selectCampaign,
      setOpportunityStatus,
      addScheduledPosts,
      projects,
      activeProjectId,
      createProject,
      switchProject,
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
