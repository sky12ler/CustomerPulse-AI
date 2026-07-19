"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  AlertTriangle,
  Archive,
  BarChart3,
  Bell,
  Bot,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Database,
  Download,
  FileText,
  Gauge,
  Import,
  LayoutDashboard,
  Menu,
  MessageCircle,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  Upload,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  audits,
  demoAccounts,
  recommendations,
  trendChart,
} from "@/lib/demo-data";
import type { AVOAnalysis } from "@/lib/avo";
import type { Customer, Role } from "@/lib/types";
import type { ImportResult } from "@/lib/imports";
import {
  DemoWorkflowProvider,
  useDemoWorkflow,
} from "@/components/workflow-context";
import { WorkflowGuide } from "@/components/workflow-guide";
import { CustomersList } from "@/components/customers-list";
import { ActionsV2, RecommendationsV2 } from "@/components/retention-workflow";
import {
  GuidedWalkthrough,
  WalkthroughLauncher,
} from "@/components/guided-walkthrough";
import {
  AnalyticsV2,
  CalendarV2,
  CampaignStudioV2,
  MarketingV2,
} from "@/components/marketing-workflow";

const nav = [
  [
    "Workspace",
    [
      ["overview", "Overview", LayoutDashboard],
      ["alerts", "Alert Centre", Bell],
      ["customers", "Customers", Users],
      ["conversations", "Conversations", MessageCircle],
      ["imports", "Data Imports", Import],
    ],
  ],
  [
    "AVO",
    [
      ["avo", "AVO", Bot],
      ["recommendations", "Recommendations", Sparkles],
      ["actions", "Retention Actions", ClipboardCheck],
    ],
  ],
  [
    "Marketing",
    [
      ["marketing", "Marketing Intelligence", Target],
      ["campaign-studio", "Campaign Studio", Send],
      ["campaign-calendar", "Campaign Calendar", CalendarDays],
      ["analytics", "Analytics", BarChart3],
    ],
  ],
  [
    "Control",
    [
      ["governance", "Data Governance", ShieldCheck],
      ["audit", "Audit Reports", Archive],
      ["settings", "Settings", Settings],
    ],
  ],
] as const;
const titles: Record<string, [string, string]> = {
  overview: [
    "Retention intelligence at a glance",
    "Prioritise customer recovery and governed marketing action.",
  ],
  alerts: [
    "Alert Centre",
    "Evidence-linked churn, complaint and segment alerts.",
  ],
  customers: [
    "Customers",
    "Customer health, value, risk and opportunity in one view.",
  ],
  conversations: [
    "Conversations",
    "Review authorised conversations and analyse evidence with AVO.",
  ],
  imports: [
    "Data Import Centre",
    "Validate, map and confirm customer data and approved source documents.",
  ],
  avo: ["Ask AVO", "Grounded answers and draft actions for authorised staff."],
  recommendations: [
    "AVO Recommendations",
    "Evidence-backed next actions awaiting human judgment.",
  ],
  actions: [
    "Retention Actions",
    "Review, approve and execute governed customer outreach.",
  ],
  marketing: [
    "Marketing Intelligence",
    "Detect segment decline and turn common evidence into interventions.",
  ],
  "campaign-studio": [
    "Campaign Studio",
    "Create grounded, channel-ready campaigns with AVO.",
  ],
  "campaign-calendar": [
    "Campaign Calendar",
    "Review approved and simulated publishing schedules.",
  ],
  analytics: [
    "Analytics",
    "Customer recovery, action effectiveness and AVO governance.",
  ],
  governance: [
    "Data Governance",
    "Privacy-supporting controls, consent, lineage and retention.",
  ],
  audit: [
    "Audit Reports",
    "Immutable histories of access, analysis, approval and execution.",
  ],
  settings: [
    "Settings",
    "Organisation roles, scoring thresholds and integrations.",
  ],
};
const accessByRole: Record<Role, string[]> = {
  Administrator: Object.keys(titles),
  "Sales Manager": [
    "overview",
    "alerts",
    "customers",
    "conversations",
    "imports",
    "avo",
    "recommendations",
    "actions",
    "analytics",
    "governance",
    "audit",
  ],
  "Marketing Manager": [
    "overview",
    "customers",
    "conversations",
    "imports",
    "avo",
    "marketing",
    "campaign-studio",
    "campaign-calendar",
    "analytics",
    "governance",
    "audit",
  ],
  "Account Executive": [
    "overview",
    "alerts",
    "customers",
    "conversations",
    "imports",
    "avo",
    "recommendations",
    "actions",
    "audit",
  ],
  Auditor: [
    "overview",
    "alerts",
    "customers",
    "conversations",
    "recommendations",
    "actions",
    "marketing",
    "campaign-calendar",
    "analytics",
    "governance",
    "audit",
  ],
};
const requiredRoles: Record<string, string> = {
  imports:
    "Administrator, Sales Manager, Marketing Manager, or Account Executive (type-specific)",
  "campaign-studio": "Administrator or Marketing Manager",
  "campaign-calendar": "Administrator, Marketing Manager, or Auditor",
  settings: "Administrator",
};
const money = (n: number) =>
  new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    maximumFractionDigits: 0,
  }).format(n);
const badge = (value: string) => (
  <span className={`badge ${value.toLowerCase().replaceAll(" ", "-")}`}>
    {value}
  </span>
);
const downloadText = (filename: string, text: string, type = "text/plain") => {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};
type Thresholds = {
  high: number;
  critical: number;
  riskSegment: number;
  revenue: number;
  frequency: number;
  engagement: number;
};
type Workflow = {
  actionStatus: string;
  campaignStatus: string;
  recommendationStatuses: Record<string, string>;
  events: typeof audits;
  imports: ImportResult[];
  requests: string[];
  thresholds: Thresholds;
  setAction: (s: string) => void;
  setCampaign: (s: string) => void;
  setRecommendation: (id: string, s: string) => void;
  addImport: (r: ImportResult) => void;
  addRequest: (s: string) => void;
  log: (action: string, entity: string, result: string) => void;
  saveThresholds: (x: Thresholds) => void;
  reset: () => void;
};
const WorkflowContext = createContext<Workflow | null>(null);
const useWorkflow = () => {
  const value = useContext(WorkflowContext);
  if (!value) throw new Error("Workflow context unavailable");
  return value;
};

export function Dashboard({ initialPage }: { initialPage: string }) {
  return (
    <DemoWorkflowProvider>
      <DashboardInner initialPage={initialPage} />
    </DemoWorkflowProvider>
  );
}

function DashboardInner({ initialPage }: { initialPage: string }) {
  const demo = useDemoWorkflow();
  const { state } = demo;
  const role = state.role;
  const [page, setPage] = useState(
    titles[initialPage] ? initialPage : "overview",
  );
  const [toast, setToast] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [locationVersion, setLocationVersion] = useState(0);

  useEffect(() => {
    const syncRoute = () => {
      const route = window.location.pathname.split("/").filter(Boolean)[0];
      setPage(titles[route] ? route : "overview");
      setLocationVersion((value) => value + 1);
    };
    window.addEventListener("popstate", syncRoute);
    return () => window.removeEventListener("popstate", syncRoute);
  }, []);

  const go = (destination: string) => {
    const route = destination.replace(/^\//, "").split(/[/?]/)[0];
    setPage(titles[route] ? route : "overview");
    window.history.pushState(
      {},
      "",
      destination.startsWith("/") ? destination : `/${destination}`,
    );
    setLocationVersion((value) => value + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const notify = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(""), 4200);
  };
  const legacyAction = state.actions.find((item) => item.id === "ACT-021");
  const authorizedCustomerIds = new Set(
    demo.accessibleCustomers.map((customer) => customer.id),
  );
  const authorizedEntityIds = new Set([
    ...authorizedCustomerIds,
    ...demo.accessibleActions.map((action) => action.id),
    ...recommendations
      .filter((recommendation) =>
        authorizedCustomerIds.has(recommendation.customerId),
      )
      .map((recommendation) => recommendation.id),
  ]);
  const scopedEvents =
    role === "Account Executive"
      ? state.events.filter((event) =>
          [...authorizedEntityIds].some((id) => event.entity.includes(id)),
        )
      : state.events;
  const workflow: Workflow = {
    actionStatus: legacyAction?.status ?? "Draft",
    campaignStatus: state.campaign.status,
    recommendationStatuses: state.recommendationStatuses,
    events: scopedEvents,
    imports: state.imports.map((item) => item.result),
    requests: state.requests,
    thresholds: state.thresholds,
    setAction: (status) =>
      demo.update((current) => ({
        ...current,
        actions: current.actions.map((item) =>
          item.id === "ACT-021" ? { ...item, status: status as never } : item,
        ),
      })),
    setCampaign: (status) => demo.updateCampaign({ status: status as never }),
    setRecommendation: (id, status) =>
      demo.update((current) => ({
        ...current,
        recommendationStatuses: {
          ...current.recommendationStatuses,
          [id]: status,
        },
      })),
    addImport: (result) => void demo.addImport(result, result.kind),
    addRequest: (request) =>
      demo.update((current) => ({
        ...current,
        requests: [request, ...current.requests],
      })),
    log: demo.log,
    saveThresholds: (thresholds) =>
      demo.update((current) => ({ ...current, thresholds })),
    reset: demo.reset,
  };
  const [title, sub] = titles[page];
  return (
    <WorkflowContext.Provider value={workflow}>
      <div className="shell">
        <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>
          <div className="brand">
            <span className="brandmark">A</span>
            <span>
              CustomerPulse <small style={{ color: "#69d2bd" }}>AI</small>
            </span>
          </div>
          {nav.map(([group, items]) => (
            <div key={group}>
              <div className="nav-group">{group}</div>
              {items
                .filter(([key]) => accessByRole[role].includes(key))
                .map(([key, label, Icon]) => (
                  <a
                    key={key}
                    href={`/${key}`}
                    onClick={(e) => {
                      e.preventDefault();
                      go(key);
                      setMobileOpen(false);
                    }}
                    className={`nav-link ${page === key ? "active" : ""}`}
                  >
                    <Icon />
                    {label}
                  </a>
                ))}
            </div>
          ))}
        </aside>
        <main className="main">
          <header className="topbar">
            <div className="top-actions">
              <button
                aria-label="Toggle navigation"
                className="btn btn-outline mobile-menu"
                onClick={() => setMobileOpen((x) => !x)}
              >
                <Menu size={16} />
              </button>
              <span className="demo-label">
                <Database size={12} />{" "}
                {state.activeWorkspace === "demo"
                  ? "Synthetic Demo Workspace"
                  : "Imported Workspace"}
              </span>
              <select
                aria-label="Active workspace"
                className="input"
                value={state.activeWorkspace}
                onChange={(e) =>
                  demo.switchWorkspace(e.target.value as "demo" | "imported")
                }
              >
                <option value="demo">Demo Workspace</option>
                <option value="imported">Imported Workspace</option>
              </select>
              <button
                className="btn btn-outline"
                onClick={() => {
                  if (
                    window.confirm(
                      "Reset Demo Workspace? Imported Workspace data will be preserved.",
                    )
                  ) {
                    demo.reset();
                    notify(
                      "Demo Workspace restored; Imported Workspace preserved.",
                    );
                  }
                }}
              >
                Reset Demo Data
              </button>
            </div>
            <div className="top-actions">
              <button className="btn btn-outline" onClick={() => go("avo")}>
                <Bot size={14} /> Ask AVO
              </button>
              <select
                aria-label="Demo account"
                className="input"
                value={role}
                onChange={(e) => {
                  demo.setRole(e.target.value as Role);
                  notify(`Signed in as ${e.target.value} demo account`);
                }}
              >
                <option>Administrator</option>
                <option>Sales Manager</option>
                <option>Marketing Manager</option>
                <option>Account Executive</option>
                <option>Auditor</option>
              </select>
              <div className="avatar">
                {role
                  .split(" ")
                  .map((x) => x[0])
                  .join("")
                  .slice(0, 2)}
              </div>
            </div>
          </header>
          <div className="content">
            <div className="title-row">
              <div>
                <div className="eyebrow">
                  CustomerPulse AI / {page.replaceAll("-", " ")}
                </div>
                <h1>{title}</h1>
                <div className="subtle">{sub}</div>
              </div>
              <div className="top-actions">
                <span className="demo-label">AVO Demo Analysis available</span>
              </div>
            </div>
            <Page
              page={page}
              go={go}
              notify={notify}
              role={role}
              locationVersion={locationVersion}
            />
          </div>
        </main>
        <GuidedWalkthrough page={page} go={go} />
        {toast && (
          <div role="status" className="toast">
            <CheckCircle2
              size={14}
              style={{ verticalAlign: "middle", marginRight: 8 }}
            />
            {toast}
          </div>
        )}
      </div>
    </WorkflowContext.Provider>
  );
}

function Page({
  page,
  go,
  notify,
  role,
  locationVersion,
}: {
  page: string;
  go: (p: string) => void;
  notify: (m: string) => void;
  role: Role;
  locationVersion: number;
}) {
  if (!accessByRole[role].includes(page))
    return (
      <div className="card empty">
        <ShieldCheck size={34} />
        <h2>Access restricted</h2>
        <p>
          {role} does not have permission to open {titles[page][0]}.
        </p>
        <p>
          <strong>Required role:</strong>{" "}
          {requiredRoles[page] ?? "An authorised operational role"}
        </p>
        <button className="btn btn-primary" onClick={() => go("overview")}>
          Open permitted Overview
        </button>
      </div>
    );
  switch (page) {
    case "overview":
      return <Overview go={go} />;
    case "alerts":
      return <Alerts go={go} notify={notify} />;
    case "customers":
      return <Customers key={locationVersion} notify={notify} go={go} />;
    case "conversations":
      return <Conversations notify={notify} go={go} />;
    case "imports":
      return <Imports notify={notify} />;
    case "avo":
      return <AVOChat notify={notify} />;
    case "recommendations":
      return <RecommendationsV2 notify={notify} go={go} />;
    case "actions":
      return <ActionsV2 notify={notify} role={role} go={go} />;
    case "marketing":
      return <MarketingV2 go={go} notify={notify} />;
    case "campaign-studio":
      return <CampaignStudioV2 notify={notify} role={role} go={go} />;
    case "campaign-calendar":
      return <CalendarV2 go={go} notify={notify} />;
    case "analytics":
      return <AnalyticsV2 go={go} />;
    case "governance":
      return <Governance notify={notify} />;
    case "audit":
      return <Audit notify={notify} />;
    case "settings":
      return <SettingsPage notify={notify} />;
    default:
      return null;
  }
}

function Overview({ go }: { go: (p: string) => void }) {
  const demo = useDemoWorkflow();
  const customers = demo.accessibleCustomers;
  const atRisk = customers.filter(
    (c) => c.risk === "High" || c.risk === "Critical",
  );

  const attentionCustomers = [...customers]
    .sort(
      (a, b) =>
        Number(b.scenario === "A") - Number(a.scenario === "A") ||
        b.riskScore - a.riskScore,
    )
    .slice(0, 5);
  return (
    <>
      <WalkthroughLauncher go={go} />
      <div className="grid stats">
        {[
          [
            "Customers monitored",
            String(customers.length),
            demo.state.role === "Account Executive"
              ? "Assigned records"
              : "Accessible records",
            Users,
          ],
          [
            "High / Critical risk",
            `${atRisk.length}`,
            "2 require action today",
            AlertTriangle,
          ],
          [
            "Revenue at risk",
            money(atRisk.reduce((s, c) => s + c.revenueAtRisk, 0)),
            "↓ 6.8% after recoveries",
            Gauge,
          ],
          [
            "Pending approvals",
            "4",
            "2 retention · 2 marketing",
            ClipboardCheck,
          ],
        ].map(([l, v, t, I]) => (
          <div className="card" key={String(l)}>
            <div className="split">
              <span className="subtle">{String(l)}</span>
              {typeof I !== "string" && <I size={18} color="#19766e" />}
            </div>
            <div className="stat-value">{String(v)}</div>
            <div className="trend">{String(t)}</div>
          </div>
        ))}
      </div>
      <div className="grid two">
        <div className="card">
          <div className="card-head">
            <h2>Risk and revenue trend</h2>
            <button className="btn btn-outline" onClick={() => go("analytics")}>
              View analytics <ChevronRight size={13} />
            </button>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={trendChart}>
              <defs>
                <linearGradient id="risk" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#dd684d" stopOpacity={0.35} />
                  <stop offset="1" stopColor="#dd684d" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#edf0ed" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="risk"
                stroke="#dd684d"
                fill="url(#risk)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <div className="card-head">
            <h2>Today’s priorities</h2>
            <span className="badge high">4 open</span>
          </div>
          <Priority
            customer={customers[0]}
            text="Critical risk · service recovery due"
          />
          <Priority
            customer={customers[2]}
            text="Segment price objection pattern"
          />
          <Priority
            customer={customers[1]}
            text="Grounded cross-sell opportunity"
          />
          <div className="notice warning" style={{ marginTop: 10 }}>
            AVO supports staff decisions. Final decisions and actions remain the
            responsibility of authorised employees.
          </div>
        </div>
      </div>
      <div className="grid two" style={{ marginTop: 16 }}>
        <div className="card">
          <div className="card-head">
            <h2>Customers needing attention</h2>
            <button className="btn btn-outline" onClick={() => go("customers")}>
              All customers
            </button>
          </div>
          <CustomerTable rows={attentionCustomers} go={go} />
        </div>
        <div className="card">
          <div className="card-head">
            <h2>AVO governance pulse</h2>
            <span className="demo-label">Synthetic metrics</span>
          </div>
          <div className="kpis">
            <div className="kpi">
              <strong>82%</strong>
              <span>approved after review</span>
            </div>
            <div className="kpi">
              <strong>31%</strong>
              <span>human-edited</span>
            </div>
            <div className="kpi">
              <strong>4</strong>
              <span>AVO abstentions</span>
            </div>
          </div>
          <div className="divider" />
          <div className="subtle">
            Every material output includes evidence, confidence and an approval
            requirement.
          </div>
        </div>
      </div>
    </>
  );
}
function Priority({ customer, text }: { customer: Customer; text: string }) {
  return (
    <div
      className="split"
      style={{ padding: "10px 0", borderBottom: "1px solid #eef0ed" }}
    >
      <div className="customer">
        <div className="customer-dot">
          {customer.name
            .split(" ")
            .map((x) => x[0])
            .join("")}
        </div>
        <div>
          <strong style={{ fontSize: 12 }}>{customer.name}</strong>
          <div className="subtle" style={{ fontSize: 10 }}>
            {text}
          </div>
        </div>
      </div>
      {badge(customer.risk)}
    </div>
  );
}
function CustomerTable({
  rows,
  go,
}: {
  rows: Customer[];
  go: (path: string) => void;
}) {
  const open = (customer: Customer) =>
    go(
      "/customers/" +
        customer.id +
        "?tab=overview&from=" +
        encodeURIComponent("/overview"),
    );
  return (
    <div className="table-wrap">
      <table className="table overview-customer-table">
        <thead>
          <tr>
            <th>Customer</th>
            <th>Tier</th>
            <th>Risk</th>
            <th>Score</th>
            <th>Estimated revenue at risk</th>
            <th>Owner</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((customer) => (
            <tr
              key={customer.id}
              role="link"
              tabIndex={0}
              aria-label={"Open customer " + customer.name}
              onClick={(event) => {
                if (!(event.target as HTMLElement).closest("a,button"))
                  open(customer);
              }}
              onKeyDown={(event) => {
                if (
                  (event.key === "Enter" || event.key === " ") &&
                  !(event.target as HTMLElement).closest("a,button")
                ) {
                  event.preventDefault();
                  open(customer);
                }
              }}
            >
              <td>
                <div className="customer">
                  <div className="customer-dot">
                    {customer.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <a
                      className="customer-name-link"
                      href={
                        "/customers/" +
                        customer.id +
                        "?tab=overview&from=" +
                        encodeURIComponent("/overview")
                      }
                      onClick={(event) => {
                        event.preventDefault();
                        open(customer);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === " ") {
                          event.preventDefault();
                          open(customer);
                        }
                      }}
                    >
                      {customer.name}
                    </a>
                    <div className="subtle">{customer.company}</div>
                  </div>
                </div>
              </td>
              <td>{badge(customer.tier)}</td>
              <td>{badge(customer.risk)}</td>
              <td>
                <strong>{customer.riskScore}</strong>
              </td>
              <td>{money(customer.revenueAtRisk)}</td>
              <td>{customer.staff}</td>
              <td>
                <a
                  className="btn btn-outline"
                  href={
                    "/customers/" +
                    customer.id +
                    "?tab=overview&from=" +
                    encodeURIComponent("/overview")
                  }
                  onClick={(event) => {
                    event.preventDefault();
                    open(customer);
                  }}
                >
                  View Customer
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Alerts({
  go,
}: {
  go: (p: string) => void;
  notify: (s: string) => void;
}) {
  const customers = useDemoWorkflow().accessibleCustomers;
  const [risk, setRisk] = useState("All"),
    [owner, setOwner] = useState("All");
  const rows = customers.filter(
    (c) =>
      c.alerts &&
      (risk === "All" || c.risk === risk) &&
      (owner === "All" || c.staff === owner),
  );
  return (
    <div className="card">
      <div className="card-head">
        <div>
          <h2>Open alerts</h2>
          <div className="subtle">
            Generated from deterministic thresholds and traceable evidence.
          </div>
        </div>
        <div className="top-actions">
          <select
            aria-label="Alert risk filter"
            className="input"
            value={risk}
            onChange={(e) => setRisk(e.target.value)}
          >
            <option>All</option>
            <option>Critical</option>
            <option>High</option>
          </select>
          <select
            aria-label="Alert owner filter"
            className="input"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
          >
            <option>All</option>
            {[...new Set(customers.map((customer) => customer.staff))].map(
              (staff) => (
                <option key={staff}>{staff}</option>
              ),
            )}
          </select>
        </div>
      </div>
      <div className="subtle" style={{ marginBottom: 8 }}>
        {rows.length} matching alerts
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Trigger</th>
              <th>Risk</th>
              <th>Confidence</th>
              <th>Deadline</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c, i) => (
              <tr key={c.id}>
                <td>
                  <a
                    className="customer-name-link"
                    href={`/customers/${c.id}?tab=alerts&from=${encodeURIComponent("/alerts")}`}
                    onClick={(event) => {
                      event.preventDefault();
                      go(
                        `/customers/${c.id}?tab=alerts&from=${encodeURIComponent("/alerts")}`,
                      );
                    }}
                  >
                    {c.name}
                  </a>
                  <div className="subtle">
                    {c.id} · {c.tier}
                  </div>
                </td>
                <td>
                  {c.scenario === "A"
                    ? "Cancellation + missed follow-up"
                    : "Elevated risk threshold"}
                </td>
                <td>
                  {badge(c.risk)} <strong>{c.riskScore}</strong>
                </td>
                <td>{c.confidence}%</td>
                <td>{c.risk === "Critical" ? "Within 24h" : "Within 48h"}</td>
                <td>{badge(i ? "Assigned" : "New")}</td>
                <td>
                  <button
                    className="btn btn-outline"
                    onClick={() =>
                      go(
                        `/customers/${c.id}?tab=alerts&from=${encodeURIComponent("/alerts")}`,
                      )
                    }
                  >
                    Review evidence
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && (
          <div className="empty">No alerts match the selected filters.</div>
        )}
      </div>
    </div>
  );
}

function Customers({
  notify,
  go,
}: {
  notify: (s: string) => void;
  go: (path: string) => void;
}) {
  const demo = useDemoWorkflow();
  const path =
    typeof window === "undefined" ? "/customers" : window.location.pathname;
  const customerId = path.split("/").filter(Boolean)[1];
  if (!customerId) return <CustomersList notify={notify} go={go} />;
  const access = demo.lookupCustomer(decodeURIComponent(customerId));
  if (access.status === "not-found")
    return (
      <section className="card empty" role="status">
        <Search size={34} />
        <h2>Customer Not Found</h2>
        <p>
          No customer exists for the supplied customer ID in this workspace.
        </p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => go("/customers")}
        >
          Back to Customers
        </button>
      </section>
    );
  if (access.status === "denied")
    return (
      <section className="card empty" role="alert">
        <ShieldCheck size={34} />
        <h2>Access Denied</h2>
        <p>
          This customer is outside your assigned customer scope. No customer
          information has been disclosed.
        </p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => go("/customers")}
        >
          Back to assigned Customers
        </button>
      </section>
    );
  const params = new URLSearchParams(window.location.search);
  const from = params.get("from") || "/customers";
  const list = demo.accessibleCustomers;
  const index = list.findIndex(
    (customer) => customer.id === access.customer.id,
  );
  return (
    <Customer360
      customer={access.customer}
      back={() => go(from)}
      go={go}
      returnTo={from}
      previous={index > 0 ? list[index - 1] : undefined}
      next={index >= 0 && index < list.length - 1 ? list[index + 1] : undefined}
      notify={notify}
    />
  );
}

function Customer360({
  customer: initialCustomer,
  back,
  go,
  returnTo,
  previous,
  next,
  notify,
}: {
  customer: Customer;
  back: () => void;
  go: (path: string) => void;
  returnTo: string;
  previous?: Customer;
  next?: Customer;
  notify: (s: string) => void;
}) {
  const tabSlugs: Record<string, string> = {
    Overview: "overview",
    Transactions: "transactions",
    Conversations: "conversations",
    "AVO Insights": "avo-insights",
    Alerts: "alerts",
    Actions: "actions",
    "Campaign History": "campaigns",
    "Audit History": "audit",
  };
  const slugTabs = Object.fromEntries(
    Object.entries(tabSlugs).map(([label, slug]) => [slug, label]),
  );
  const requestedTab =
    new URLSearchParams(
      typeof window === "undefined" ? "" : window.location.search,
    ).get("tab") ?? "overview";
  const [tab, setTab] = useState(slugTabs[requestedTab] ?? "Overview"),
    [analysis, setAnalysis] = useState<AVOAnalysis | null>(null),
    [loading, setLoading] = useState(false);
  const demo = useDemoWorkflow();
  const openTab = (label: string) => {
    setTab(label);
    window.history.pushState(
      {},
      "",
      `/customers/${initialCustomer.id}?tab=${tabSlugs[label]}&from=${encodeURIComponent(returnTo)}`,
    );
  };
  const customerLink = (customer: Customer) =>
    `/customers/${customer.id}?tab=overview&from=${encodeURIComponent(returnTo)}`;
  const c =
    demo.dataset.customers.find((item) => item.id === initialCustomer.id) ??
    initialCustomer;
  const churnCalculation = demo.dataset.churnCalculations[c.id];
  const workflow = useWorkflow();
  const run = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/avo/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerId: c.id,
            customer: c,
            role: demo.state.role,
          }),
        }),
        data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setAnalysis(data.analysis);
      const rejected = demo.storeAnalysis(c.id, data.analysis);
      if (rejected.length)
        throw new Error(`Invalid evidence IDs: ${rejected.join(", ")}`);
      openTab("AVO Insights");
      workflow.log(
        "Conversation analysis",
        c.id,
        data.demo ? "AVO Demo Analysis" : "OpenAI analysis",
      );
      notify(
        data.demo
          ? "AVO Demo Analysis completed"
          : "Live AVO analysis completed",
      );
    } catch (e) {
      notify(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  };
  const tabs = [
    "Overview",
    "Transactions",
    "Conversations",
    "AVO Insights",
    "Alerts",
    "Actions",
    "Campaign History",
    "Audit History",
  ];
  let body: React.ReactNode;
  if (tab === "Overview")
    body = (
      <div className="grid two">
        <div>
          <h3>Customer health</h3>
          <div className="evidence">
            <div className="split">
              <span>Tier score</span>
              <strong>{c.tierScore}/100</strong>
            </div>
            <div className="bar">
              <span
                style={{ width: `${c.tierScore}%`, background: "#19766e" }}
              />
            </div>
            <div className="subtle" style={{ marginTop: 6 }}>
              Deterministic: recency, frequency, monetary, lifetime value,
              diversity and relationship · tier-v1.0
            </div>
          </div>
          <div className="evidence revenue-breakdown">
            <strong>Estimated revenue at risk</strong>
            <dl>
              <div>
                <dt>Eligible revenue base</dt>
                <dd>{money(churnCalculation?.eligibleRevenueBase ?? 0)}</dd>
              </div>
              <div>
                <dt>Churn probability</dt>
                <dd>
                  {Math.round(
                    (churnCalculation?.churnProbability ?? c.riskScore / 100) *
                      100,
                  )}
                  %
                </dd>
              </div>
              <div>
                <dt>Estimated revenue at risk</dt>
                <dd>{money(c.revenueAtRisk)}</dd>
              </div>
              <div>
                <dt>Period</dt>
                <dd>{churnCalculation?.revenuePeriod ?? "Next 90 days"}</dd>
              </div>
              <div>
                <dt>Calculation</dt>
                <dd>
                  {churnCalculation?.revenueCalculationVersion ?? "ERAR-v1"}
                </dd>
              </div>
              <div>
                <dt>Calculated</dt>
                <dd>
                  {churnCalculation?.calculatedAt
                    ? new Date(churnCalculation.calculatedAt).toLocaleString()
                    : "Not calculated"}
                </dd>
              </div>
              <div>
                <dt>Data source</dt>
                <dd>{churnCalculation?.revenueDataSource ?? "Unavailable"}</dd>
              </div>
            </dl>
            <p className="subtle">
              Estimated revenue at risk is the eligible forecast revenue for the
              selected period multiplied by the customer&apos;s normalized churn
              probability. It is an estimate, not a guaranteed loss.
            </p>
            {churnCalculation?.revenueOverride && (
              <div className="notice warning">
                Override: {money(churnCalculation.revenueOverride.value)} ·{" "}
                {churnCalculation.revenueOverride.reason} ·{" "}
                {churnCalculation.revenueOverride.user}
              </div>
            )}
          </div>
          <div className="evidence">
            <strong>Product history</strong>
            <div className="subtle">{c.products.join(" · ")}</div>
            {c.productGap && (
              <div>
                Product gap: <strong>{c.productGap}</strong>
              </div>
            )}
          </div>
          <div className="evidence">
            <strong>Consent and channel</strong>
            <div>
              {c.consent ? "Granted" : "Not granted"} · {c.preferredChannel}
            </div>
          </div>
        </div>
        <RiskFactors c={c} />
      </div>
    );
  else if (tab === "Transactions")
    body = (
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Transaction</th>
              <th>Date</th>
              <th>Product</th>
              <th>Amount</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {demo.dataset.transactions
              .filter((transaction) => transaction.customerId === c.id)
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((transaction) => (
                <tr key={transaction.id}>
                  <td>{transaction.id}</td>
                  <td>{transaction.date}</td>
                  <td>{transaction.productName}</td>
                  <td>{money(transaction.amount)}</td>
                  <td>{transaction.sourceType}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    );
  else if (tab === "Conversations")
    body = (
      <div>
        {c.messages.map((m) => (
          <div className="evidence" key={m.id}>
            <span className="evidence-id">
              {m.id} · {m.channel} · {m.sentAt.slice(0, 10)}
            </span>
            <div>{m.text}</div>
          </div>
        ))}
      </div>
    );
  else if (tab === "AVO Insights") {
    const storedAnalysis = demo.dataset.analyses.find(
      (item) => item.customerId === c.id,
    );
    body = analysis ? (
      <AnalysisPanel analysis={analysis} notify={notify} />
    ) : storedAnalysis ? (
      <div>
        <div className="notice">Stored validated AVO analysis</div>
        <div className="evidence">
          <span className="evidence-id">
            {storedAnalysis.id} - {storedAnalysis.confidence}% confidence
          </span>
          <p>{storedAnalysis.summary}</p>
          <div>
            Evidence:{" "}
            {storedAnalysis.evidenceIds.join(", ") ||
              "No eligible evidence IDs"}
          </div>
        </div>
        <button
          className="btn btn-primary"
          onClick={run}
          disabled={demo.state.role === "Auditor"}
        >
          Run AVO Analysis Again
        </button>
      </div>
    ) : (
      <div className="empty">
        <Bot size={30} />
        <p>No analysis has been recorded for this customer.</p>
        <button
          className="btn btn-primary"
          onClick={run}
          disabled={demo.state.role === "Auditor"}
        >
          Run AVO Analysis
        </button>
      </div>
    );
  } else if (tab === "Alerts") {
    const alerts = demo.dataset.alerts.filter(
      (alert) => alert.customerId === c.id,
    );
    body = alerts.length ? (
      <div>
        {alerts.map((alert) => (
          <div className="evidence" key={alert.id}>
            <span className="evidence-id">
              {alert.id} - {alert.status}
            </span>
            <div>
              {alert.trigger} - {alert.currentRisk} - updated{" "}
              {new Date(alert.updatedAt).toLocaleString()}
            </div>
            <div>
              Evidence: {alert.evidence.join(", ") || "No evidence references"}
            </div>
          </div>
        ))}
      </div>
    ) : (
      <div className="empty">No customer alerts are recorded.</div>
    );
  } else if (tab === "Actions") {
    const actions = demo.accessibleActions.filter(
      (action) => action.customerId === c.id,
    );
    body = actions.length ? (
      <div>
        {actions.map((action) => (
          <div className="evidence" key={action.id}>
            <span className="evidence-id">
              {action.id} - {action.status}
            </span>
            <div>{action.recommendation}</div>
            <button
              className="btn btn-outline"
              onClick={() => go("/actions?actionId=" + action.id)}
            >
              View Retention Action
            </button>
          </div>
        ))}
      </div>
    ) : (
      <div className="empty">No active retention action.</div>
    );
  } else if (tab === "Campaign History")
    body = (
      <div className="evidence">
        <span className="evidence-id">CAM-DEMO</span>
        <div>
          {c.consent
            ? "Eligible for approved synthetic campaigns"
            : "Excluded by consent guardrail"}
        </div>
      </div>
    );
  else
    body = (
      <div>
        {workflow.events
          .filter(
            (e) =>
              e.entity.includes(c.id) ||
              e.correlationId.includes(c.scenario || "NONE"),
          )
          .map((e) => (
            <div className="evidence" key={e.id}>
              <span className="evidence-id">
                {e.id} · {e.at}
              </span>
              <div>
                {e.action} · {e.result}
              </div>
            </div>
          ))}
        {!workflow.events.some((e) => e.entity.includes(c.id)) && (
          <div className="subtle">No session events for this customer yet.</div>
        )}
      </div>
    );
  return (
    <>
      <nav className="customer-breadcrumbs" aria-label="Breadcrumb">
        <button type="button" className="text-button" onClick={back}>
          Customers
        </button>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{c.name}</span>
      </nav>
      <div className="customer-detail-navigation">
        <button className="btn btn-outline" onClick={back}>
          Back to Customers
        </button>
        {previous && (
          <button
            className="btn btn-outline"
            onClick={() => go(customerLink(previous))}
          >
            Previous Customer
          </button>
        )}
        {next && (
          <button
            className="btn btn-outline"
            onClick={() => go(customerLink(next))}
          >
            Next Customer
          </button>
        )}
      </div>
      <div className="card" style={{ marginTop: 12 }}>
        <div className="split">
          <div className="customer">
            <div
              className="customer-dot"
              style={{ width: 48, height: 48, fontSize: 16 }}
            >
              {c.name.slice(0, 2)}
            </div>
            <div>
              <h2 style={{ margin: 0 }}>{c.name}</h2>
              <div className="subtle">
                {c.company} · {c.id} · Assigned to {c.staff}
              </div>
            </div>
          </div>
          <div className="top-actions">
            {badge(c.tier)}
            {badge(c.risk)}
            <span className="demo-label">
              {c.alerts ? "Active Alert" : "Monitored"}
            </span>
            <button
              className="btn btn-outline"
              onClick={() => {
                demo.recalculate(c.id);
                notify("Authoritative tier, churn, and alerts recalculated.");
              }}
            >
              Manual Recalculate
            </button>
            <button
              className="btn btn-primary"
              onClick={run}
              disabled={loading || demo.state.role === "Auditor"}
              title={
                demo.state.role === "Auditor" ? "Auditor is read-only" : ""
              }
            >
              <Bot size={14} />
              {loading ? "Analysing…" : "Run AVO Analysis"}
            </button>
          </div>
        </div>
        <div className="divider" />
        <div className="kpis">
          <div className="kpi">
            <strong>{c.riskScore}/100</strong>
            <span>hybrid churn risk</span>
          </div>
          <div className="kpi">
            <strong>{c.confidence}%</strong>
            <span>confidence</span>
          </div>
          <div className="kpi">
            <strong>{money(c.ltv)}</strong>
            <span>lifetime value</span>
          </div>
          <div className="kpi">
            <strong>{money(c.revenueAtRisk)}</strong>
            <span>estimated revenue at risk</span>
          </div>
          <div className="kpi">
            <strong>
              {demo.dataset.churnCalculations[c.id]?.calculatedAt.slice(
                0,
                10,
              ) ?? "Not evaluated"}
            </strong>
            <span>
              last evaluated · next: import, AVO, response, outcome, or manual
              trigger
            </span>
          </div>
          <div className="kpi">
            <strong>{c.frequencyTrend}%</strong>
            <span>frequency trend</span>
          </div>
        </div>
      </div>
      <div className="card" style={{ marginTop: 14 }}>
        <div className="tabs" role="tablist" aria-label="Customer sections">
          {tabs.map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              aria-controls="customer-tab-panel"
              onClick={() => openTab(t)}
              className={`tab ${tab === t ? "active" : ""}`}
            >
              {t}
            </button>
          ))}
        </div>
        <div id="customer-tab-panel" role="tabpanel">
          {body}
        </div>
      </div>
    </>
  );
}
function RiskFactors({ c }: { c: Customer }) {
  return (
    <div>
      <h3>Top risk factors</h3>
      {[
        [
          "Purchase frequency deterioration",
          Math.abs(Math.min(c.frequencyTrend, 0)) * 1.3,
        ],
        ["Spending deterioration", Math.abs(Math.min(c.spendTrend, 0)) * 1.2],
        ["Conversation signals", c.sentiment === "Negative" ? 20 : 4],
        ["Unresolved complaints", c.scenario === "A" ? 24 : 0],
      ].map(([n, v]) => (
        <div key={String(n)} style={{ margin: "12px 0" }}>
          <div className="split">
            <span className="subtle">{n}</span>
            <strong>{Math.round(Number(v))} pts</strong>
          </div>
          <div className="bar">
            <span
              style={{
                width: `${Math.min(100, Number(v) * 3)}%`,
                background: "#dd684d",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function Conversations({
  notify,
  go,
}: {
  notify: (s: string) => void;
  go: (path: string) => void;
}) {
  const demo = useDemoWorkflow();
  const customers = demo.accessibleCustomers;
  const eligible = customers.filter((c) => c.messages.length);
  const [selected, setSelected] = useState(eligible[0]),
    [query, setQuery] = useState(""),
    [channel, setChannel] = useState("All"),
    [sentiment, setSentiment] = useState("All"),
    [risk, setRisk] = useState("All"),
    [owner, setOwner] = useState("All");
  const [analysis, setAnalysis] = useState<AVOAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const workflow = useWorkflow();
  const filtered = eligible.filter(
    (c) =>
      (c.name + c.company + c.messages.at(-1)?.text)
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (channel === "All" || c.messages.some((m) => m.channel === channel)) &&
      (sentiment === "All" || c.sentiment === sentiment) &&
      (risk === "All" || c.risk === risk) &&
      (owner === "All" || c.staff === owner),
  );
  const run = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/avo/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: selected.id,
          customer: selected,
          role: demo.state.role,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setAnalysis(data.analysis);
      const rejected = demo.storeAnalysis(selected.id, data.analysis);
      if (rejected.length)
        throw new Error(`Invalid evidence IDs: ${rejected.join(", ")}`);
      workflow.log(
        "Conversation analysis",
        selected.id,
        data.demo ? "AVO Demo Analysis" : "OpenAI analysis",
      );
      notify(
        data.demo
          ? "AVO Demo Analysis completed — fallback clearly labelled"
          : "AVO analysis completed with configured model",
      );
    } catch (e) {
      notify(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="conversation-grid">
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: 12, display: "grid", gap: 7 }}>
          <input
            aria-label="Conversation search"
            className="input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search conversations"
          />
          <select
            aria-label="Channel filter"
            className="input"
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
          >
            <option>All</option>
            <option>WhatsApp</option>
            <option>Email</option>
            <option>Support chat</option>
          </select>
          <div className="grid two">
            <select
              aria-label="Sentiment filter"
              className="input"
              value={sentiment}
              onChange={(e) => setSentiment(e.target.value)}
            >
              <option>All</option>
              <option>Positive</option>
              <option>Neutral</option>
              <option>Negative</option>
            </select>
            <select
              aria-label="Risk filter"
              className="input"
              value={risk}
              onChange={(e) => setRisk(e.target.value)}
            >
              <option>All</option>
              <option>Critical</option>
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
          </div>
          <select
            aria-label="Assigned employee filter"
            className="input"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
          >
            <option>All</option>
            {[...new Set(customers.map((customer) => customer.staff))].map(
              (staff) => (
                <option key={staff}>{staff}</option>
              ),
            )}
          </select>
        </div>
        <div className="conversation-list">
          {filtered.slice(0, 15).map((c) => (
            <div
              key={c.id}
              className={`conversation-item ${selected.id === c.id ? "active" : ""}`}
              onClick={() => {
                setSelected(c);
                setAnalysis(null);
              }}
            >
              <div className="split">
                <strong style={{ fontSize: 12 }}>{c.name}</strong>
                {badge(c.risk)}
              </div>
              <div className="subtle" style={{ fontSize: 10, margin: "5px 0" }}>
                {c.messages.at(-1)?.text.slice(0, 65)}…
              </div>
              <div className="split">
                {badge(c.sentiment)}
                <span className="subtle" style={{ fontSize: 9 }}>
                  {c.messages.at(-1)?.channel}
                </span>
              </div>
            </div>
          ))}
          {!filtered.length && (
            <div className="empty">No conversations match.</div>
          )}
        </div>
      </div>
      <div className="card">
        <div className="card-head">
          <div>
            <h2>{selected.name}</h2>
            <div className="subtle">
              {selected.company} · {selected.preferredChannel}
            </div>
          </div>
          <div className="top-actions">
            <a
              className="btn btn-outline"
              href={`/customers/${selected.id}?tab=conversations&from=${encodeURIComponent("/conversations")}`}
              onClick={(event) => {
                event.preventDefault();
                go(
                  `/customers/${selected.id}?tab=conversations&from=${encodeURIComponent("/conversations")}`,
                );
              }}
            >
              View Customer
            </a>
            <button
              className="btn btn-primary"
              onClick={run}
              disabled={loading || demo.state.role === "Auditor"}
              title={
                demo.state.role === "Auditor" ? "Auditor is read-only" : ""
              }
            >
              <Bot size={14} />
              {loading ? "Analysing…" : "Run AVO Analysis"}
            </button>
          </div>
        </div>
        <div className="messages">
          {selected.messages.map((m) => (
            <div
              key={m.id}
              className={`message ${m.sender === "customer" ? "customer-msg" : "staff-msg"}`}
            >
              <div>
                {m.evidence ? (
                  <mark className="source-highlight">{m.text}</mark>
                ) : (
                  m.text
                )}
              </div>
              <div className="message-meta">
                {m.id} · {m.senderName} · {m.channel} ·{" "}
                {new Date(m.sentAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="card">
        <div className="card-head">
          <h2>AVO Analysis</h2>
          {analysis && <span className="demo-label">AVO Demo Analysis</span>}
        </div>
        {!analysis ? (
          <div className="empty">
            <Bot size={34} />
            <p>
              Run AVO to extract grounded signals. Customer messages are treated
              as untrusted content.
            </p>
          </div>
        ) : (
          <AnalysisPanel analysis={analysis} notify={notify} />
        )}
      </div>
    </div>
  );
}
function AnalysisPanel({
  analysis: a,
  notify,
}: {
  analysis: AVOAnalysis;
  notify: (s: string) => void;
}) {
  const workflow = useWorkflow();
  const generate = () => {
    const id = a.primary_intent === "Product discovery" ? "REC-002" : "REC-001";
    workflow.setRecommendation(id, "Draft");
    notify(`Draft ${id} created and recorded; manager approval required`);
  };
  return (
    <div>
      <div className="notice warning">
        AVO-generated analysis. Verify evidence before approval.
      </div>
      <p style={{ fontSize: 12, lineHeight: 1.55 }}>{a.concise_summary}</p>
      <div className="split">
        {badge(a.sentiment_label)}
        {badge(a.urgency)}
        <strong>{Math.round(a.analysis_confidence * 100)}% confidence</strong>
      </div>
      <div className="divider" />
      <h3>Signals</h3>
      {[
        ["Intent", [a.primary_intent]],
        ["Complaints", a.complaints],
        ["Unresolved", a.unresolved_issues],
        ["Cancellation", a.cancellation_signals],
        ["Missed follow-ups", a.missed_follow_ups],
      ].map(([k, v]) => (
        <div className="split" style={{ margin: "8px 0" }} key={String(k)}>
          <span className="subtle">{k}</span>
          <strong style={{ fontSize: 11, textAlign: "right" }}>
            {(v as string[]).join(", ") || "None found"}
          </strong>
        </div>
      ))}
      <div className="divider" />
      <h3>Source evidence</h3>
      {a.evidence.map((e) => (
        <div className="evidence" key={e.message_id}>
          <span className="evidence-id">
            {e.message_id} · {e.evidence_type}
          </span>
          <div>{e.short_explanation}</div>
        </div>
      ))}
      <div className="notice" style={{ marginTop: 10 }}>
        <strong>Uncertainty</strong>
        <div>{a.uncertainty_reason}</div>
      </div>
      <button
        className="btn btn-primary"
        style={{ width: "100%", marginTop: 12 }}
        onClick={generate}
      >
        Generate AVO Recommendation
      </button>
    </div>
  );
}

function Imports({ notify }: { notify: (s: string) => void }) {
  const demo = useDemoWorkflow();
  const role = demo.state.role;
  const [step, setStep] = useState(0);
  const [kind, setKind] = useState<keyof typeof importOptions>("customers");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successId, setSuccessId] = useState("");
  const [quickSummary, setQuickSummary] = useState("");
  const allowed = canImport(role, kind);
  const option = importOptions[kind];

  async function quickImport(files: FileList | null) {
    if (!files?.length) return;
    setLoading(true);
    setError("");
    try {
      const validated: ImportResult[] = [];
      for (const selected of Array.from(files)) {
        const form = new FormData();
        form.set("file", selected);
        const response = await fetch("/api/imports/validate", {
          method: "POST",
          body: form,
        });
        const result = (await response.json()) as ImportResult & {
          error?: string;
        };
        if (!response.ok || result.error || !result.valid)
          throw new Error(
            `${selected.name}: ${result.error ?? result.errors?.[0]?.message ?? "validation failed"}`,
          );
        validated.push(result);
      }
      const order = ["customers", "products", "transactions", "conversations"];
      validated.sort(
        (a, b) =>
          (order.indexOf(a.kind) < 0 ? 99 : order.indexOf(a.kind)) -
          (order.indexOf(b.kind) < 0 ? 99 : order.indexOf(b.kind)),
      );
      const detected = validated
        .map((item) => `${item.filename}: ${item.kind}`)
        .join("\n");
      if (
        !window.confirm(
          `Confirm detected import types and dependency order:\n${detected}`,
        )
      )
        return;
      let added = 0,
        updated = 0,
        rejected = 0,
        affected = 0;
      validated.forEach((item) => {
        const summary = demo.addImport(item, item.kind);
        added += summary.added;
        updated += summary.updated;
        rejected += summary.rejected;
        affected += summary.affectedCustomerIds.length;
      });
      setQuickSummary(
        `${validated.length} files · ${added} added · ${updated} updated · ${rejected} rejected · ${affected} affected customer references`,
      );
      notify("Multi-file Quick Import completed in dependency order.");
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "Quick import failed";
      setError(message);
      notify(message);
    } finally {
      setLoading(false);
    }
  }
  async function validate(selected: File) {
    setLoading(true);
    setError("");
    setFile(selected);
    const form = new FormData();
    form.set("file", selected);
    try {
      const response = await fetch("/api/imports/validate", {
        method: "POST",
        body: form,
      });
      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        throw new Error(
          `Upload service returned ${response.status} instead of JSON. Try again or contact the administrator.`,
        );
      }
      const data = (await response.json()) as ImportResult & { error?: string };
      if (data.error)
        throw new Error(data.error || `Validation failed (${response.status})`);
      setResult(data);
      setMapping(
        Object.fromEntries(data.headers.map((header) => [header, header])),
      );
      setStep(2);
      notify(
        data.valid
          ? `${selected.name} validated successfully`
          : `${selected.name} has validation errors`,
      );
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "Import validation failed";
      setError(message);
      notify(message);
    } finally {
      setLoading(false);
    }
  }

  const pick = (selected?: File) => {
    if (!selected) return;
    if (!allowed)
      return setError(
        `${role} cannot upload ${option.label}. ${option.roles} required.`,
      );
    void validate(selected);
  };
  const downloadTemplate = (populated: boolean) => {
    if (populated) {
      window.location.href = `/api/demo-files/${option.example}`;
      return;
    }
    downloadText(
      `${kind}-blank.${option.blankExt}`,
      option.blank,
      option.blankExt === "csv" ? "text/csv" : "text/plain",
    );
  };
  const errorReport = () => {
    if (!result) return;
    downloadText(
      `${file?.name ?? "import"}-errors.csv`,
      `row,field,code,message\n${result.errors.map((item) => `${item.row},${item.field},${item.code},"${item.message.replaceAll('"', '""')}"`).join("\n")}`,
      "text/csv",
    );
  };
  const confirm = () => {
    if (!result?.valid)
      return setError("Resolve validation errors before confirmation.");
    const summary = demo.addImport(result, kind);
    setSuccessId(
      `${summary.added} added · ${summary.updated} updated · ${summary.affectedCustomerIds.length} affected customers`,
    );
    notify("Import completed successfully.");
  };
  const clearFile = () => {
    setFile(null);
    setResult(null);
    setError("");
    setStep(1);
  };
  const nextLinks: Record<string, [string, string]> = {
    customers: ["View Customers", "/customers"],
    transactions: ["Recalculate Tiers and Churn", "/analytics"],
    conversations: ["Analyse with AVO", "/conversations"],
    products: ["Open Campaign Sources", "/campaign-studio?step=3"],
    marketing_guidelines: ["Open Campaign Studio", "/campaign-studio?step=3"],
    product_catalogue: ["Open Campaign Studio", "/campaign-studio?step=3"],
  };
  if (successId && result) {
    const next = nextLinks[kind] ?? [
      "View Import History",
      "/imports?view=history",
    ];
    return (
      <div className="grid two">
        <div className="card success-panel" role="status">
          <CheckCircle2 size={36} />
          <h2>Import completed successfully.</h2>
          <p>
            {result.validCount} {option.label.toLowerCase()} records were added.
          </p>
          <div className="grid three">
            <Metric label="Import ID" value={successId} />
            <Metric label="Records added" value={String(result.validCount)} />
            <Metric
              label="Records rejected"
              value={String(result.invalidCount)}
            />
          </div>
          <div className="notice">
            Affected customers:{" "}
            {result.kind === "customers" ? result.validCount : "linked records"}{" "}
            · Calculations triggered: tier/churn refresh · Audit event created.
          </div>
          <a className="btn btn-primary" href={next[1]}>
            {next[0]}
          </a>{" "}
          <button
            className="btn btn-outline"
            onClick={() => {
              setSuccessId("");
              clearFile();
              setStep(0);
            }}
          >
            Start another import
          </button>
        </div>
        <ImportHistory />
      </div>
    );
  }
  return (
    <div>
      <WorkflowGuide
        title="Import workflow"
        steps={[
          "Select Import Type",
          "Choose File",
          "Preview and Validate",
          "Confirm Import",
        ]}
        current={step}
        missing={
          error ||
          (step === 0
            ? "Select an authorised import type."
            : step === 1 && !file
              ? "Choose a file to continue."
              : "")
        }
        expected="Validated records enter the active operational workspace, recalculate affected customers, evaluate alerts, and create audit events."
      />
      <section className="card" style={{ marginBottom: 16 }}>
        <div className="card-head">
          <div>
            <h2>Operational data readiness</h2>
            <p className="subtle">
              Workspace: <b>{demo.state.activeWorkspace}</b>. Customer and
              transaction data support behavioural scoring; conversations and
              documents are optional enrichments.
            </p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => {
              demo.switchWorkspace("demo");
              notify(
                "Complete synthetic Demo Workspace loaded. No uploads required.",
              );
            }}
          >
            Load Demo Data
          </button>
        </div>
        <div className="grid four">
          <Metric
            label="Customers"
            value={demo.dataset.customers.length ? "Ready" : "Missing"}
          />
          <Metric
            label="Transactions"
            value={demo.dataset.transactions.length ? "Ready" : "Missing"}
          />
          <Metric
            label="Conversations"
            value={
              demo.dataset.customers.some((c) => c.messages.length)
                ? "Ready"
                : "Partial"
            }
          />
          <Metric
            label="Policies / products"
            value={
              demo.dataset.documents.length || demo.dataset.products.length
                ? "Ready"
                : "Partial"
            }
          />
        </div>
        <p className="validation-help">
          Missing conversations lower confidence and show conversation evidence
          unavailable. Missing policies limits AVO to general, non-binding
          suggestions. Basic churn calculation remains available.
        </p>
      </section>
      <section className="card">
        <div className="card-head">
          <div>
            <h2>Multi-file Quick Import</h2>
            <p className="subtle">
              Select multiple authorised files. Types are detected, confirmed,
              and committed in customer → product → transaction → conversation →
              document order.
            </p>
          </div>
          <label className="btn btn-outline">
            {loading ? "Processing…" : "Select multiple files"}
            <input
              type="file"
              multiple
              hidden
              disabled={loading}
              onChange={(e) => quickImport(e.target.files)}
            />
          </label>
        </div>
        {quickSummary && (
          <div className="notice success" role="status">
            {quickSummary}
          </div>
        )}
      </section>
      <div className="grid two">
        <div className="card">
          <div className="card-head">
            <h2>
              {step + 1}.{" "}
              {
                [
                  "Select Import Type",
                  "Choose File",
                  "Preview and Validate",
                  "Confirm Import",
                ][step]
              }
            </h2>
            {badge(role)}
          </div>
          {error && (
            <div className="notice danger" role="alert">
              {error}
            </div>
          )}
          {step === 0 && (
            <div>
              <label className="field-label" htmlFor="import-kind">
                Import type
              </label>
              <select
                id="import-kind"
                className="input"
                value={kind}
                onChange={(event) => {
                  setKind(event.target.value as keyof typeof importOptions);
                  setError("");
                }}
              >
                {Object.entries(importOptions).map(([value, meta]) => (
                  <option key={value} value={value}>
                    {meta.label}
                  </option>
                ))}
              </select>
              <div className="evidence">
                <strong>{option.label}</strong>
                <p>Accepted: {option.formats} · Maximum: 10 MB</p>
                <p>
                  <b>Required fields:</b> {option.required}
                </p>
                <p>
                  <b>Use:</b> {option.use}
                </p>
                <p>
                  <b>Access:</b> {option.roles}
                </p>
              </div>
              {!allowed && (
                <div className="notice warning">
                  {role} is not authorised for this type. Switch to{" "}
                  {option.roles}.
                </div>
              )}
              <button
                className="btn btn-outline"
                onClick={() => downloadTemplate(false)}
              >
                <Download size={13} /> Download blank template
              </button>{" "}
              <button
                className="btn btn-outline"
                onClick={() => downloadTemplate(true)}
              >
                <Download size={13} /> Download populated mock example
              </button>
              <div className="divider" />
              <button
                className="btn btn-primary"
                disabled={!allowed}
                title={!allowed ? `${option.roles} required` : ""}
                onClick={() => setStep(1)}
              >
                Continue
              </button>
              {!allowed && (
                <p className="validation-help">
                  Continue is unavailable because this role cannot upload{" "}
                  {option.label}.
                </p>
              )}
            </div>
          )}
          {step === 1 && (
            <div>
              <label
                className="upload-zone"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ")
                    (
                      event.currentTarget.querySelector(
                        "input",
                      ) as HTMLInputElement
                    )?.click();
                }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  pick(event.dataTransfer.files[0]);
                }}
              >
                <Upload size={30} />
                <h3>
                  {loading
                    ? "Uploading and validating…"
                    : "Drop file here or browse"}
                </h3>
                <p>{option.formats} · max 10 MB</p>
                <input
                  aria-label="Import file"
                  type="file"
                  onChange={(event) => pick(event.target.files?.[0])}
                />
                <span className="btn btn-primary">Browse Files</span>
              </label>
              {file && (
                <div className="notice">
                  <b>{file.name}</b> · {(file.size / 1024).toFixed(1)} KB ·{" "}
                  {file.type || file.name.split(".").pop()?.toUpperCase()}
                  <br />
                  <progress max={100} value={loading ? 65 : 100} />
                  <div>
                    <button
                      className="btn btn-outline"
                      onClick={() =>
                        document
                          .querySelector<HTMLInputElement>(
                            'input[aria-label="Import file"]',
                          )
                          ?.click()
                      }
                    >
                      Replace file
                    </button>{" "}
                    <button className="btn btn-outline" onClick={clearFile}>
                      Remove file
                    </button>
                  </div>
                </div>
              )}
              <button className="btn btn-outline" onClick={() => setStep(0)}>
                Back
              </button>
            </div>
          )}
          {step === 2 && result && (
            <div>
              <div className={`notice ${result.valid ? "" : "danger"}`}>
                <b>{file?.name}</b> · {result.validCount} valid ·{" "}
                {result.invalidCount} invalid · {result.duplicateCount}{" "}
                duplicates
              </div>
              {result.headers.length > 0 ? (
                <>
                  <h3>Column mapping</h3>
                  {result.headers.map((header) => (
                    <div className="split evidence" key={header}>
                      <span>{header}</span>
                      <select
                        aria-label={`Map ${header}`}
                        className="input"
                        value={mapping[header]}
                        onChange={(e) =>
                          setMapping({ ...mapping, [header]: e.target.value })
                        }
                      >
                        <option>{header}</option>
                        <option value="__ignore__">Ignore column</option>
                      </select>
                    </div>
                  ))}
                  <PreviewRows result={result} />
                </>
              ) : (
                <>
                  <h3>Document metadata</h3>
                  <div className="grid three">
                    <Metric label="Document type" value={result.fileType} />
                    <Metric
                      label="Pages"
                      value={String(result.pages ?? "Preview unavailable")}
                    />
                    <Metric
                      label="Chunks"
                      value={String(result.chunks?.length ?? 0)}
                    />
                  </div>
                  <div className="evidence">
                    <b>Classification:</b> Internal · <b>Retention:</b> approved
                    source<p>{result.extractedText?.slice(0, 600)}</p>
                  </div>
                </>
              )}
              {result.errors.map((item) => (
                <div className="evidence" key={`${item.row}-${item.code}`}>
                  <b>
                    Row {item.row} · {item.field}
                  </b>
                  <div>{item.message}</div>
                </div>
              ))}
              <button className="btn btn-outline" onClick={errorReport}>
                Download error report
              </button>{" "}
              <button className="btn btn-outline" onClick={() => setStep(1)}>
                Back
              </button>{" "}
              <button
                className="btn btn-primary"
                disabled={!result.valid}
                title={!result.valid ? "Resolve validation errors first" : ""}
                onClick={() => setStep(3)}
              >
                Continue
              </button>
              {!result.valid && (
                <p className="validation-help">
                  Continue is unavailable because the file contains validation
                  errors.
                </p>
              )}
            </div>
          )}
          {step === 3 && result && (
            <div>
              <div className="grid two">
                <Metric label="Import type" value={option.label} />
                <Metric label="File" value={file?.name ?? ""} />
                <Metric
                  label="Records to add"
                  value={String(result.validCount)}
                />
                <Metric label="Records to update" value="0" />
                <Metric
                  label="Records to reject"
                  value={String(result.invalidCount)}
                />
                <Metric
                  label="Documents / chunks"
                  value={String(
                    result.chunks?.length ?? (result.pages ? 1 : 0),
                  )}
                />
                <Metric label="Uploader" value={actorForDemoRole(role)} />
                <Metric label="Timestamp" value={new Date().toLocaleString()} />
              </div>
              <label className="check">
                <input type="checkbox" required id="confirm-import" /> I confirm
                this authorised file may be imported.
              </label>
              <button className="btn btn-outline" onClick={() => setStep(2)}>
                Back
              </button>{" "}
              <button
                className="btn btn-primary"
                onClick={() => {
                  const box =
                    document.querySelector<HTMLInputElement>("#confirm-import");
                  if (!box?.checked)
                    setError("Confirmation is required before import.");
                  else confirm();
                }}
              >
                Confirm Import
              </button>
            </div>
          )}
        </div>
        <ImportHistory />
      </div>
    </div>
  );
}

const importOptions = {
  customers: {
    label: "Customers",
    formats: "CSV, XLSX, JSON",
    required: "customer_external_id, customer_name, region, consent_status",
    use: "Customer 360, tiering and churn scoring",
    roles: "Administrator or Sales Manager",
    example: "customers.csv",
    blankExt: "csv",
    blank:
      "customer_external_id,customer_name,company_name,industry,region,consent_status\n",
  },
  transactions: {
    label: "Transactions",
    formats: "CSV, XLSX, JSON",
    required:
      "transaction_id, customer_external_id, transaction_date, total_amount",
    use: "Revenue, frequency, tier and churn calculation",
    roles: "Administrator or Sales Manager",
    example: "transactions.csv",
    blankExt: "csv",
    blank:
      "transaction_id,customer_external_id,transaction_date,total_amount\n",
  },
  conversations: {
    label: "Conversations",
    formats: "CSV, JSON",
    required:
      "conversation_id, message_id, customer_external_id, message_text, sent_at",
    use: "Evidence-grounded AVO analysis",
    roles: "Administrator, Sales Manager or assigned Account Executive",
    example: "conversations.csv",
    blankExt: "csv",
    blank:
      "conversation_id,message_id,customer_external_id,channel,message_text,sent_at\n",
  },
  products: {
    label: "Products",
    formats: "CSV, XLSX, JSON",
    required: "product_sku, product_name, category, standard_price",
    use: "Approved campaign facts and product records",
    roles: "Administrator or Marketing Manager",
    example: "products.csv",
    blankExt: "csv",
    blank: "product_sku,product_name,category,standard_price\n",
  },
  campaign_results: {
    label: "Campaign results",
    formats: "CSV, XLSX",
    required: "campaign_id, channel, impressions, clicks",
    use: "Campaign analytics",
    roles: "Administrator or Marketing Manager",
    example: "campaign-results.csv",
    blankExt: "csv",
    blank: "campaign_id,channel,impressions,clicks\n",
  },
  retention_playbook: {
    label: "Retention playbook",
    formats: "PDF, DOCX, TXT",
    required: "Extractable approved guidance",
    use: "Ground retention recommendations",
    roles: "Administrator or Sales Manager",
    example: "retention-playbook.pdf",
    blankExt: "txt",
    blank: "Approved retention guidance\n",
  },
  customer_service_policy: {
    label: "Customer-service policy",
    formats: "PDF, DOCX, TXT",
    required: "Extractable policy text",
    use: "Validate service-recovery actions",
    roles: "Administrator or Sales Manager",
    example: "customer-service-policy.pdf",
    blankExt: "txt",
    blank: "Approved customer-service policy\n",
  },
  product_catalogue: {
    label: "Product catalogue",
    formats: "PDF, DOCX",
    required: "Extractable product facts",
    use: "Ground campaign content",
    roles: "Administrator or Marketing Manager",
    example: "product-catalogue.pdf",
    blankExt: "txt",
    blank: "Approved product catalogue content\n",
  },
  marketing_guidelines: {
    label: "Marketing guidelines",
    formats: "PDF, DOCX, TXT",
    required: "Extractable brand and claims guidance",
    use: "Campaign policy validation",
    roles: "Administrator or Marketing Manager",
    example: "marketing-guidelines.pdf",
    blankExt: "txt",
    blank: "Approved marketing guidance\n",
  },
  campaign_asset: {
    label: "Campaign asset",
    formats: "PNG, JPG, PDF",
    required: "Approved visual or document",
    use: "Campaign creative source",
    roles: "Administrator or Marketing Manager",
    example: "existing-campaign.png",
    blankExt: "txt",
    blank: "Upload an approved campaign asset.\n",
  },
} as const;

function canImport(role: Role, kind: keyof typeof importOptions) {
  if (role === "Administrator") return true;
  if (role === "Sales Manager")
    return [
      "customers",
      "transactions",
      "conversations",
      "retention_playbook",
      "customer_service_policy",
    ].includes(kind);
  if (role === "Marketing Manager")
    return [
      "products",
      "product_catalogue",
      "marketing_guidelines",
      "campaign_asset",
      "campaign_results",
    ].includes(kind);
  return role === "Account Executive" && kind === "conversations";
}
function actorForDemoRole(role: Role) {
  return role === "Administrator"
    ? "Demo Administrator"
    : role === "Sales Manager"
      ? "Farah Chen"
      : role === "Marketing Manager"
        ? "Mina Lee"
        : role === "Account Executive"
          ? "Aisha Rahman"
          : "Demo Auditor";
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-mini">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
function PreviewRows({ result }: { result: ImportResult }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <tbody>
          {result.preview.slice(0, 5).map((row, index) => (
            <tr key={index}>
              {Object.entries(row)
                .slice(0, 6)
                .map(([key, value]) => (
                  <td key={key}>
                    <span className="evidence-id">{key}</span>
                    <div>{String(value ?? "")}</div>
                  </td>
                ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function ImportHistory() {
  const { state } = useDemoWorkflow();
  return (
    <div className="card">
      <h2>Import History</h2>
      {state.imports.length === 0 ? (
        <div className="empty">
          <p>No confirmed imports in this demo session.</p>
        </div>
      ) : (
        state.imports.map((item) => (
          <div className="evidence" key={item.id}>
            <div className="split">
              <b>{item.id}</b>
              {badge("Success")}
            </div>
            <div>
              {item.filename} · {item.type}
            </div>
            <small>
              {item.recordsAdded} added · {item.recordsRejected} rejected ·{" "}
              {item.uploader}
            </small>
          </div>
        ))
      )}
    </div>
  );
}

function AVOChat({ notify }: { notify: (s: string) => void }) {
  const suggestions = [
    "Which Strategic customers are at risk?",
    "Why is Maya Tan Critical Risk?",
    "Which segment has the greatest decline?",
    "What actions await my approval?",
  ];
  const [chat, setChat] = useState<{ from: string; text: string }[]>([
    {
      from: "avo",
      text: "Hello, I’m AVO. I can explain customer evidence and create drafts, but I cannot approve or execute actions.",
    },
  ]);
  const [input, setInput] = useState("");
  const send = (q = input) => {
    if (!q.trim()) return;
    const answer = q.includes("Maya")
      ? "Maya Tan (CUS-1001) has a deterministic risk score of 86. The strongest sources are MSG-A-101 (unresolved delivery), MSG-A-103 (missed follow-up and competitor mention), and MSG-A-104 (cancellation language). This suggests elevated risk; it does not confirm future churn."
      : q.includes("segment")
        ? "Food & beverage / North shows a 24% frequency decline, 18% revenue decline and repeated price objections across 33% of the segment. Review Marketing Trigger MKT-003."
        : q.includes("approval")
          ? "Four items await review: two retention actions and two campaigns. I can open or summarize them, but only an authorised manager can decide."
          : "I found relevant synthetic records, but there is insufficient evidence for a firm conclusion—staff review required.";
    setChat((x) => [
      ...x,
      { from: "user", text: q },
      { from: "avo", text: answer },
    ]);
    setInput("");
    notify("AVO answer grounded to authorised demo records");
  };
  return (
    <div className="grid two">
      <div className="card">
        <div className="card-head">
          <h2>AVO Chat</h2>
          <span className="demo-label">Organisation-scoped</span>
        </div>
        <div style={{ minHeight: 360, maxHeight: 480, overflow: "auto" }}>
          {chat.map((m, i) => (
            <div
              className={`message ${m.from === "user" ? "staff-msg" : "customer-msg"}`}
              key={i}
            >
              <strong style={{ fontSize: 10 }}>
                {m.from === "avo" ? "AVO Demo Analysis" : "You"}
              </strong>
              <div>{m.text}</div>
              {m.from === "avo" && i > 0 && (
                <div className="message-meta">
                  Evidence links included · uncertainty stated
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="top-actions">
          <input
            className="input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Ask AVO about accessible customers, evidence or approvals"
          />
          <button className="btn btn-primary" onClick={() => send()}>
            <Send size={14} />
          </button>
        </div>
      </div>
      <div className="card">
        <h2>Suggested questions</h2>
        <div className="divider" />
        {suggestions.map((s) => (
          <button
            key={s}
            className="btn btn-outline"
            style={{
              display: "flex",
              width: "100%",
              justifyContent: "space-between",
              marginBottom: 8,
            }}
            onClick={() => send(s)}
          >
            {s}
            <ChevronRight size={13} />
          </button>
        ))}
        <div className="notice warning" style={{ marginTop: 18 }}>
          AVO can create draft recommendations only. It cannot approve, change
          scores, send private messages or publish content.
        </div>
        <div className="notice" style={{ marginTop: 10 }}>
          Data minimisation is active: unnecessary contact details are masked
          before external AI processing.
        </div>
      </div>
    </div>
  );
}

function Governance({ notify }: { notify: (s: string) => void }) {
  const workflow = useWorkflow();
  const controls = [
    [
      "Purpose limitation",
      "Retention, service and consented marketing purposes only.",
      CheckCircle2,
    ],
    [
      "Data minimisation",
      "Contact details and unrelated identifiers masked before AVO processing.",
      ShieldCheck,
    ],
    [
      "Organisation isolation",
      "Supabase RLS policies scope records by organisation and role.",
      Users,
    ],
    [
      "AI processing disclosure",
      "Demo provider active; external model data categories shown before use.",
      Bot,
    ],
    [
      "Retention controls",
      "Expiry flags require administrator confirmation; no automatic deletion.",
      Archive,
    ],
    [
      "Sensitive exports",
      "Approval and audit event required before an export is prepared.",
      Download,
    ],
  ];
  const start = (x: string) => {
    workflow.addRequest(x);
    notify(`${x} request recorded for authorised review`);
  };
  return (
    <>
      <div className="notice">
        AVO supports staff decisions. Final decisions and actions remain the
        responsibility of authorised employees.
      </div>
      <div className="grid three" style={{ marginTop: 14 }}>
        {controls.map(([a, b, I]) => (
          <div className="card" key={String(a)}>
            {typeof I !== "string" && <I size={20} color="#19766e" />}
            <h3 style={{ marginTop: 10 }}>{String(a)}</h3>
            <p className="subtle" style={{ lineHeight: 1.5 }}>
              {String(b)}
            </p>
            <span className="badge low">Control active</span>
          </div>
        ))}
      </div>
      <div className="grid two" style={{ marginTop: 14 }}>
        <div className="card">
          <h2>Customer rights workflow</h2>
          <div className="divider" />
          {[
            "View and correct customer data",
            "Withdraw marketing consent",
            "Request approved data export",
            "Mark data for deletion review",
          ].map((x) => (
            <div className="split evidence" key={x}>
              <span>{x}</span>
              <button className="btn btn-outline" onClick={() => start(x)}>
                Start request
              </button>
            </div>
          ))}
          {workflow.requests.map((x, i) => (
            <div className="notice" style={{ marginTop: 8 }} key={`${x}-${i}`}>
              {x} · Pending authorised review
            </div>
          ))}
        </div>
        <div className="card">
          <h2>Data lineage · CUS-1001</h2>
          <div className="divider" />
          <div className="timeline">
            {[
              "customers.csv · original upload",
              "IMP-001 · confirmed import",
              "CUS-1001 · customer record",
              "ANL-021 · AVO analysis",
              "ALT-001 · Critical alert",
              "REC-001 · recommendation",
              "APR-021 · pending approval",
            ].map((x) => (
              <div className="timeline-item" key={x}>
                <span className="timeline-dot" />
                <strong>{x}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function Audit({ notify }: { notify: (s: string) => void }) {
  const workflow = useWorkflow();
  const [query, setQuery] = useState(""),
    [role, setRole] = useState("All"),
    [result, setResult] = useState("All");
  const rows = workflow.events.filter(
    (a) =>
      JSON.stringify(a).toLowerCase().includes(query.toLowerCase()) &&
      (role === "All" || a.role === role) &&
      (result === "All" || a.result === result),
  );
  const exportCsv = () => {
    const header =
        "event_id,timestamp,actor,role,action,entity,result,correlation_id\n",
      body = rows
        .map((a) =>
          [
            a.id,
            a.at,
            a.actor,
            a.role,
            a.action,
            a.entity,
            a.result,
            a.correlationId,
          ]
            .map((v) => `\"${String(v).replaceAll('"', '""')}\"`)
            .join(","),
        )
        .join("\n");
    downloadText("customerpulse-audit.csv", header + body, "text/csv");
    workflow.log("Data export", "audit_logs", `${rows.length} rows`);
    notify(`Exported ${rows.length} audit events and logged the export`);
  };
  return (
    <div className="card">
      <div className="card-head">
        <div className="field" style={{ width: 320 }}>
          <label>Search immutable events</label>
          <input
            className="input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Action, actor, entity or correlation ID"
          />
        </div>
        <div className="top-actions">
          <select
            aria-label="Audit role filter"
            className="input"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option>All</option>
            <option>Administrator</option>
            <option>Sales Manager</option>
            <option>Marketing Manager</option>
            <option>Account Executive</option>
            <option>Auditor</option>
          </select>
          <select
            aria-label="Audit result filter"
            className="input"
            value={result}
            onChange={(e) => setResult(e.target.value)}
          >
            <option>All</option>
            {[...new Set(workflow.events.map((e) => e.result))].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
          <button className="btn btn-outline" onClick={exportCsv}>
            <Download size={13} /> CSV
          </button>
          <button className="btn btn-outline" onClick={() => window.print()}>
            <FileText size={13} /> Printable report / PDF
          </button>
        </div>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Event</th>
              <th>Time</th>
              <th>Actor / role</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Result</th>
              <th>Correlation</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id}>
                <td>
                  <strong>{a.id}</strong>
                </td>
                <td>{a.at}</td>
                <td>
                  {a.actor}
                  <div className="subtle">{a.role}</div>
                </td>
                <td>{a.action}</td>
                <td>{a.entity}</td>
                <td>{badge(a.result)}</td>
                <td>{a.correlationId}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="notice" style={{ marginTop: 14 }}>
        Normal users cannot modify or delete audit records. Export actions
        create their own audit events.
      </div>
    </div>
  );
}

function SettingsPage({ notify }: { notify: (s: string) => void }) {
  const workflow = useWorkflow();
  const [values, setValues] = useState(workflow.thresholds);
  const fields: [string, keyof typeof values][] = [
    ["High risk starts at", "high"],
    ["Critical risk starts at", "critical"],
    ["Segment customers at risk (%)", "riskSegment"],
    ["Segment revenue decline (%)", "revenue"],
    ["Purchase frequency decline (%)", "frequency"],
    ["Engagement decline (%)", "engagement"],
  ];
  const save = () => {
    if (
      values.high < 0 ||
      values.critical <= values.high ||
      values.critical > 100
    )
      return notify("Risk thresholds must be ordered between 0 and 100");
    workflow.saveThresholds(values);
    notify("Governance setting change saved and audited");
  };
  return (
    <div className="grid two">
      <div className="card">
        <h2>Scoring and trigger thresholds</h2>
        <div className="divider" />
        {fields.map(([label, key]) => (
          <div className="field" style={{ marginBottom: 10 }} key={key}>
            <label>{label}</label>
            <input
              className="input"
              type="number"
              value={values[key]}
              onChange={(e) =>
                setValues((v) => ({ ...v, [key]: Number(e.target.value) }))
              }
            />
          </div>
        ))}
        <button className="btn btn-primary" onClick={save}>
          Save thresholds
        </button>
      </div>
      <div>
        <div className="card">
          <div className="card-head">
            <h2>Integration status</h2>
            <span className="badge medium">Demo default</span>
          </div>
          <div className="split evidence">
            <span>AVO provider</span>
            <strong>Demo fallback / OpenAI when configured</strong>
          </div>
          <div className="split evidence">
            <span>Social publisher</span>
            <strong>Demo fallback / Buffer when configured</strong>
          </div>
          <a className="btn btn-outline" href="/api/health" target="_blank">
            Open live health status
          </a>
          <div className="notice" style={{ marginTop: 10 }}>
            Add server-side credentials to activate external providers. Secrets
            are never exposed to browser code.
          </div>
        </div>
        <div className="card" style={{ marginTop: 14 }}>
          <h2>Demo accounts</h2>
          <div className="divider" />
          {demoAccounts.map(([email, role]) => (
            <div className="split evidence" key={email}>
              <span>{email}</span>
              <strong>{role}</strong>
            </div>
          ))}
          <div className="subtle">
            Password: <strong>PulseDemo!2026</strong> · synthetic local demo
            only
          </div>
        </div>
        <div className="card" style={{ marginTop: 14 }}>
          <h2>Demo controls</h2>
          <p className="subtle">
            Reset and reload the session-scoped synthetic workflow state.
          </p>
          <button
            className="btn btn-danger"
            onClick={() => {
              if (
                window.confirm("Reset the session workflow to the seeded demo?")
              ) {
                workflow.reset();
                setValues(workflow.thresholds);
                notify("Seeded demo session reloaded and audited");
              }
            }}
          >
            Reset seeded demo
          </button>
        </div>
      </div>
    </div>
  );
}
