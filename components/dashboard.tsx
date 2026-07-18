"use client";

import { createContext, useContext, useState } from "react";
import Link from "next/link";
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
  Mail,
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
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  audits,
  customers,
  demoAccounts,
  recommendations,
  riskChart,
  tiersChart,
  trendChart,
} from "@/lib/demo-data";
import type { AVOAnalysis } from "@/lib/avo";
import type { Customer, Role } from "@/lib/types";
import { canOutreach, detectSegmentDecline, whatsappLink } from "@/lib/engines";
import { templates as importTemplates, type ImportResult } from "@/lib/imports";

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
  const [page, setPage] = useState(
    titles[initialPage] ? initialPage : "overview",
  );
  const [role, setRole] = useState<Role>("Sales Manager");
  const [toast, setToast] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [actionStatus, setActionStatus] = useState("Pending Approval"),
    [campaignStatus, setCampaignStatus] = useState("Draft"),
    [recommendationStatuses, setRecommendationStatuses] = useState<
      Record<string, string>
    >({ "REC-001": "Draft", "REC-002": "Draft" });
  const [events, setEvents] = useState(audits),
    [imports, setImports] = useState<ImportResult[]>([]),
    [requests, setRequests] = useState<string[]>([]),
    [thresholds, setThresholds] = useState({
      high: 60,
      critical: 80,
      riskSegment: 20,
      revenue: 15,
      frequency: 20,
      engagement: 25,
    });
  const go = (p: string) => {
    setPage(p);
    window.history.pushState({}, "", `/${p}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const notify = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(""), 3200);
  };
  const log = (action: string, entity: string, result: string) =>
    setEvents((old) => [
      {
        id: `AUD-${9300 + old.length}`,
        actor:
          role === "Administrator"
            ? "Demo Administrator"
            : role === "Marketing Manager"
              ? "Mina Lee"
              : role === "Sales Manager"
                ? "Farah Chen"
                : role === "Account Executive"
                  ? "Aisha Rahman"
                  : "Demo Auditor",
        role,
        action,
        entity,
        result,
        at: new Date().toISOString().replace("T", " ").slice(0, 16),
        correlationId: `COR-DEMO-${Date.now()}`,
      },
      ...old,
    ]);
  const reset = () => {
    setActionStatus("Pending Approval");
    setCampaignStatus("Draft");
    setRecommendationStatuses({ "REC-001": "Draft", "REC-002": "Draft" });
    setImports([]);
    setRequests([]);
    setThresholds({
      high: 60,
      critical: 80,
      riskSegment: 20,
      revenue: 15,
      frequency: 20,
      engagement: 25,
    });
    log("Seeded demo reset", "CustomerPulse Demo", "Success");
  };
  const workflow: Workflow = {
    actionStatus,
    campaignStatus,
    recommendationStatuses,
    events,
    imports,
    requests,
    thresholds,
    setAction: (s) => {
      setActionStatus(s);
      log(`Retention action ${s.toLowerCase()}`, "ACT-021", s);
    },
    setCampaign: (s) => {
      setCampaignStatus(s);
      log(`Campaign ${s.toLowerCase()}`, "CAM-003", s);
    },
    setRecommendation: (id, s) => {
      setRecommendationStatuses((x) => ({ ...x, [id]: s }));
      log(`Recommendation ${s.toLowerCase()}`, id, s);
    },
    addImport: (r) => {
      setImports((x) => [r, ...x]);
      log("Data import confirmed", r.filename, `${r.validCount} valid`);
    },
    addRequest: (s) => {
      setRequests((x) => [s, ...x]);
      log("Governance request created", s, "Pending review");
    },
    log,
    saveThresholds: (x) => {
      setThresholds(x);
      log("Governance setting change", "Scoring thresholds", "Success");
    },
    reset,
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
              {items.map(([key, label, Icon]) => (
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
                <Database size={12} /> Synthetic Demo Data
              </span>
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
                  setRole(e.target.value as Role);
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
            <Page page={page} go={go} notify={notify} role={role} />
          </div>
        </main>
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
}: {
  page: string;
  go: (p: string) => void;
  notify: (m: string) => void;
  role: Role;
}) {
  const access: Record<Role, string[]> = {
    Administrator: Object.keys(titles),
    "Sales Manager": [
      "overview",
      "alerts",
      "customers",
      "conversations",
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
      "customers",
      "conversations",
      "avo",
      "recommendations",
      "actions",
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
  if (!access[role].includes(page))
    return (
      <div className="card empty">
        <ShieldCheck size={34} />
        <h2>Access restricted</h2>
        <p>
          {role} does not have permission to open {titles[page][0]}.
        </p>
      </div>
    );
  switch (page) {
    case "overview":
      return <Overview go={go} />;
    case "alerts":
      return <Alerts go={go} notify={notify} />;
    case "customers":
      return <Customers notify={notify} />;
    case "conversations":
      return <Conversations notify={notify} />;
    case "imports":
      return <Imports notify={notify} />;
    case "avo":
      return <AVOChat notify={notify} />;
    case "recommendations":
      return <Recommendations notify={notify} />;
    case "actions":
      return <Actions notify={notify} role={role} />;
    case "marketing":
      return <Marketing go={go} />;
    case "campaign-studio":
      return <CampaignStudio notify={notify} role={role} />;
    case "campaign-calendar":
      return <Calendar />;
    case "analytics":
      return <Analytics />;
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
  const atRisk = customers.filter(
    (c) => c.risk === "High" || c.risk === "Critical",
  );
  return (
    <>
      <div className="grid stats">
        {[
          ["Customers monitored", "30", "All synthetic records", Users],
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
          <CustomerTable rows={customers.filter((c) => c.alerts).slice(0, 5)} />
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
  onSelect,
}: {
  rows: Customer[];
  onSelect?: (c: Customer) => void;
}) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Customer</th>
            <th>Tier</th>
            <th>Risk</th>
            <th>Score</th>
            <th>Revenue at risk</th>
            <th>Owner</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr
              key={c.id}
              onClick={() => onSelect?.(c)}
              style={{ cursor: onSelect ? "pointer" : "default" }}
            >
              <td>
                <div className="customer">
                  <div className="customer-dot">
                    {c.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <strong>{c.name}</strong>
                    <div className="subtle" style={{ fontSize: 9 }}>
                      {c.company}
                    </div>
                  </div>
                </div>
              </td>
              <td>{badge(c.tier)}</td>
              <td>{badge(c.risk)}</td>
              <td>
                <strong>{c.riskScore}</strong>
              </td>
              <td>{money(c.revenueAtRisk)}</td>
              <td>{c.staff}</td>
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
            <option>Aisha Rahman</option>
            <option>Daniel Wong</option>
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
                  <strong>{c.name}</strong>
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
                    onClick={() => go("conversations")}
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

function Customers({ notify }: { notify: (s: string) => void }) {
  const [selected, setSelected] = useState<Customer | null>(null);
  const [query, setQuery] = useState("");
  const filtered = customers.filter((c) =>
    (c.name + c.company).toLowerCase().includes(query.toLowerCase()),
  );
  const exportRows = () => {
    const header =
        "customer_id,customer_name,company,tier,risk,risk_score,revenue_at_risk,owner\n",
      rows = filtered
        .map((c) =>
          [
            c.id,
            c.name,
            c.company,
            c.tier,
            c.risk,
            c.riskScore,
            c.revenueAtRisk,
            c.staff,
          ]
            .map((v) => `\"${String(v).replaceAll('"', '""')}\"`)
            .join(","),
        )
        .join("\n");
    downloadText("customerpulse-customers.csv", header + rows, "text/csv");
    notify(`Exported ${filtered.length} customer records`);
  };
  if (selected)
    return (
      <Customer360
        customer={selected}
        back={() => setSelected(null)}
        notify={notify}
      />
    );
  return (
    <div className="card">
      <div className="card-head">
        <div className="field" style={{ width: 320 }}>
          <label>Search customer or company</label>
          <div style={{ position: "relative" }}>
            <Search
              size={14}
              style={{ position: "absolute", left: 10, top: 11 }}
            />
            <input
              className="input"
              style={{ paddingLeft: 32 }}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search 30 synthetic customers"
            />
          </div>
        </div>
        <button className="btn btn-outline" onClick={exportRows}>
          Export view <Download size={14} />
        </button>
      </div>
      <CustomerTable rows={filtered} onSelect={setSelected} />
    </div>
  );
}

function Customer360({
  customer: c,
  back,
  notify,
}: {
  customer: Customer;
  back: () => void;
  notify: (s: string) => void;
}) {
  const [tab, setTab] = useState("Overview"),
    [analysis, setAnalysis] = useState<AVOAnalysis | null>(null),
    [loading, setLoading] = useState(false);
  const workflow = useWorkflow();
  const run = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/avo/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customerId: c.id }),
        }),
        data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setAnalysis(data.analysis);
      setTab("AVO Insights");
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
              <th>Source</th>
              <th>Date</th>
              <th>Product</th>
              <th>Amount</th>
              <th>Trend</th>
            </tr>
          </thead>
          <tbody>
            {c.products.map((p, i) => (
              <tr key={p}>
                <td>
                  TXN-{c.id.slice(-2)}
                  {i + 1}
                </td>
                <td>{c.lastPurchase}</td>
                <td>{p}</td>
                <td>{money(Math.round(c.ltv / (i + 3)))}</td>
                <td>{c.spendTrend}%</td>
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
  else if (tab === "AVO Insights")
    body = analysis ? (
      <AnalysisPanel analysis={analysis} notify={notify} />
    ) : (
      <div className="empty">
        <Bot size={30} />
        <p>No analysis recorded in this session.</p>
        <button className="btn btn-primary" onClick={run}>
          Run AVO Analysis
        </button>
      </div>
    );
  else if (tab === "Alerts")
    body = (
      <div className="evidence">
        <span className="evidence-id">ALT-{c.id.slice(-4)}</span>
        <div>
          {c.alerts
            ? `${c.risk} risk · ${c.riskScore}/100 · ${c.scenario === "A" ? "Cancellation language and missed follow-up" : "Threshold alert"}`
            : "No open alerts"}
        </div>
      </div>
    );
  else if (tab === "Actions")
    body = (
      <div className="evidence">
        <span className="evidence-id">ACT-{c.id.slice(-3)}</span>
        <div>
          {c.scenario === "A"
            ? `Service recovery · ${workflow.actionStatus}`
            : c.scenario === "D"
              ? "Recovery completed · positive response recorded"
              : "No active retention action"}
        </div>
      </div>
    );
  else if (tab === "Campaign History")
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
      <button className="btn btn-outline" onClick={back}>
        ← Back to customers
      </button>
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
            <button
              className="btn btn-primary"
              onClick={run}
              disabled={loading}
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
            <span>revenue at risk</span>
          </div>
          <div className="kpi">
            <strong>{c.frequencyTrend}%</strong>
            <span>frequency trend</span>
          </div>
        </div>
      </div>
      <div className="card" style={{ marginTop: 14 }}>
        <div className="tabs">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`tab ${tab === t ? "active" : ""}`}
            >
              {t}
            </button>
          ))}
        </div>
        {body}
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

function Conversations({ notify }: { notify: (s: string) => void }) {
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
        body: JSON.stringify({ customerId: selected.id }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setAnalysis(data.analysis);
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
            <option>Aisha Rahman</option>
            <option>Daniel Wong</option>
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
          <button className="btn btn-primary" onClick={run} disabled={loading}>
            <Bot size={14} />
            {loading ? "Analysing…" : "Run AVO Analysis"}
          </button>
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
        {a.uncertainty_reason}
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
  const [step, setStep] = useState(0),
    [filename, setFilename] = useState(""),
    [result, setResult] = useState<ImportResult | null>(null),
    [sourceFile, setSourceFile] = useState<File | null>(null),
    [mapping, setMapping] = useState<Record<string, string>>({}),
    [loading, setLoading] = useState(false),
    [blankKind, setBlankKind] = useState("customers");
  const workflow = useWorkflow();
  const demoFiles = [
    "customers.csv",
    "transactions.csv",
    "conversations.csv",
    "conversations.json",
    "products.csv",
    "campaign-results.csv",
    "retention-playbook.pdf",
    "customer-service-policy.pdf",
    "product-catalogue.pdf",
    "marketing-guidelines.pdf",
    "existing-campaign.png",
  ];
  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setLoading(true);
    setFilename(f.name);
    setSourceFile(f);
    const form = new FormData();
    form.set("file", f);
    try {
      const r = await fetch("/api/imports/validate", {
          method: "POST",
          body: form,
        }),
        data = await r.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
      setMapping(
        Object.fromEntries(
          (data.headers as string[]).map((header) => [header, header]),
        ),
      );
      setStep(1);
      notify(
        data.valid
          ? `${f.name} parsed and validated`
          : `${f.name} contains validation errors`,
      );
    } catch (err) {
      notify(err instanceof Error ? err.message : "Import validation failed");
      setStep(0);
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  };
  const errorReport = () => {
    if (!result) return;
    const text =
      "row,field,code,message,value\n" +
      result.errors
        .map((e) =>
          [e.row, e.field, e.code, e.message, String(e.value ?? "")]
            .map((v) => `\"${String(v).replaceAll('"', '""')}\"`)
            .join(","),
        )
        .join("\n");
    downloadText(`${filename}-errors.csv`, text, "text/csv");
    notify(`Downloaded ${result.errors.length} validation errors`);
  };
  const applyMapping = async () => {
    if (!sourceFile || !result?.headers.length) return setStep(2);
    setLoading(true);
    const form = new FormData();
    form.set("file", sourceFile);
    form.set("mapping", JSON.stringify(mapping));
    try {
      const response = await fetch("/api/imports/validate", {
        method: "POST",
        body: form,
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
      setStep(2);
      notify(
        data.valid
          ? "Column mapping applied and rows revalidated"
          : "Mapped columns contain validation errors",
      );
    } catch (error) {
      notify(error instanceof Error ? error.message : "Mapping failed");
    } finally {
      setLoading(false);
    }
  };
  const confirm = () => {
    if (!result?.valid)
      return notify("Resolve validation errors before confirmation");
    workflow.addImport(result);
    notify(
      `Import confirmed and audited — ${result.validCount} records accepted`,
    );
    setStep(0);
    setResult(null);
    setFilename("");
    setSourceFile(null);
    setMapping({});
  };
  const blankHeaders: Record<string, string> = {
    customers:
      "customer_external_id,customer_name,company_name,industry,region,assigned_staff_email,email,phone,preferred_channel,consent_status,customer_since\n",
    transactions:
      "transaction_id,customer_external_id,transaction_date,product_sku,product_name,category,quantity,unit_price,total_amount\n",
    conversations:
      "conversation_id,message_id,customer_external_id,channel,sender_type,sender_name,message_text,sent_at\n",
    products:
      "product_sku,product_name,category,description,standard_price,promotion_price,promotion_start,promotion_end,inventory_status,product_url\n",
  };
  return (
    <div className="grid two">
      <div className="card">
        <div className="card-head">
          <h2>New import</h2>
          <span className="badge medium">Administrator</span>
        </div>
        <div className="tabs">
          {["1 Upload", "2 Preview & map", "3 Validate", "4 Confirm"].map(
            (x, i) => (
              <span className={`tab ${step === i ? "active" : ""}`} key={x}>
                {x}
              </span>
            ),
          )}
        </div>
        {step === 0 ? (
          <label
            className="upload-zone"
            style={{ display: "block", cursor: loading ? "wait" : "pointer" }}
          >
            <Upload size={30} color="#19766e" />
            <h3 style={{ marginTop: 10 }}>
              {loading
                ? "Scanning and parsing…"
                : "Upload an authorised data file"}
            </h3>
            <p className="subtle">
              CSV, XLSX, JSON, TXT, PDF, DOCX, PNG or JPG · max 10 MB
            </p>
            <input
              aria-label="Import file"
              type="file"
              hidden
              disabled={loading}
              onChange={upload}
            />
            <span className="btn btn-primary">Choose file</span>
          </label>
        ) : step === 1 && result ? (
          <div>
            <div className={`notice ${result.valid ? "" : "danger"}`}>
              <strong>{filename}</strong> · {result.kind.replaceAll("_", " ")} ·{" "}
              {(result.size / 1024).toFixed(1)} KB ·{" "}
              {result.valid
                ? "signature and validation passed"
                : "review errors"}
            </div>
            <div className="divider" />
            <h3>
              {result.headers.length
                ? "Column mapping and preview"
                : "Extracted document metadata"}
            </h3>
            {result.headers.map((h) => (
              <div className="split evidence" key={h}>
                <span>{h}</span>
                <select
                  aria-label={`Map ${h}`}
                  className="input"
                  style={{ width: 190 }}
                  value={mapping[h] ?? h}
                  onChange={(event) =>
                    setMapping((current) => ({
                      ...current,
                      [h]: event.target.value,
                    }))
                  }
                >
                  {result.kind in importTemplates ? (
                    importTemplates[
                      result.kind as keyof typeof importTemplates
                    ].map((field) => <option key={field}>{field}</option>)
                  ) : (
                    <option>{h}</option>
                  )}
                  <option value="__ignore__">Ignore column</option>
                </select>
              </div>
            ))}
            <div className="table-wrap">
              <table className="table">
                <tbody>
                  {result.preview.map((row, i) => (
                    <tr key={i}>
                      {Object.entries(row)
                        .slice(0, 5)
                        .map(([k, v]) => (
                          <td key={k}>
                            <span className="evidence-id">{k}</span>
                            <div>{String(v ?? "")}</div>
                          </td>
                        ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {result.extractedText && (
              <div className="evidence">
                <span className="evidence-id">EXTRACTED TEXT PREVIEW</span>
                <div>{result.extractedText.slice(0, 500)}</div>
              </div>
            )}
            <button
              className="btn btn-primary"
              disabled={loading}
              onClick={applyMapping}
            >
              {loading ? "Revalidating…" : "Review validation result"}
            </button>
          </div>
        ) : step === 2 && result ? (
          <div>
            <div className={`notice ${result.valid ? "" : "danger"}`}>
              {result.validCount} valid · {result.duplicateCount} duplicates ·{" "}
              {result.invalidCount} invalid
            </div>
            <div className="grid three" style={{ margin: "18px 0" }}>
              <div className="card">
                <strong>{result.validCount}</strong>
                <div className="subtle">Ready</div>
              </div>
              <div className="card">
                <strong>{result.duplicateCount}</strong>
                <div className="subtle">Duplicates</div>
              </div>
              <div className="card">
                <strong>{result.invalidCount}</strong>
                <div className="subtle">Invalid</div>
              </div>
            </div>
            {result.errors.slice(0, 5).map((e) => (
              <div className="evidence" key={`${e.row}-${e.field}-${e.code}`}>
                <span className="evidence-id">
                  ROW {e.row} · {e.field} · {e.code}
                </span>
                <div>{e.message}</div>
              </div>
            ))}
            <button
              className="btn btn-primary"
              disabled={!result.valid}
              onClick={() => setStep(3)}
            >
              Continue to confirmation
            </button>{" "}
            <button className="btn btn-outline" onClick={errorReport}>
              Download error report
            </button>{" "}
            <button
              className="btn btn-outline"
              onClick={() => {
                setStep(0);
                setResult(null);
                setSourceFile(null);
                setMapping({});
              }}
            >
              Cancel
            </button>
          </div>
        ) : result ? (
          <div>
            <div className="notice warning">
              Confirmation records uploader, confirmer, mapping, source metadata
              and validation result in the session audit log.
            </div>
            <p>
              <strong>Uploader / confirmer:</strong> Demo Administrator
            </p>
            <p>
              <strong>File:</strong> {filename}
            </p>
            <p>
              <strong>Result:</strong> {result.validCount} accepted ·{" "}
              {result.pages
                ? `${result.pages} pages · ${result.chunks?.length || 0} chunks`
                : result.kind}
            </p>
            <button className="btn btn-primary" onClick={confirm}>
              Confirm import
            </button>{" "}
            <button className="btn btn-outline" onClick={() => setStep(2)}>
              Back
            </button>
          </div>
        ) : null}
      </div>
      <div>
        <div className="card">
          <div className="card-head">
            <div>
              <h2>Demo Data and Templates</h2>
              <div className="subtle">
                Permanent synthetic files for manual import.
              </div>
            </div>
            <span className="demo-label">Synthetic Demo Data</span>
          </div>
          {demoFiles.map((f) => (
            <div
              className="split"
              style={{ padding: "9px 0", borderBottom: "1px solid #eef0ed" }}
              key={f}
            >
              <div>
                <strong style={{ fontSize: 12 }}>{f}</strong>
                <div className="subtle" style={{ fontSize: 9 }}>
                  {f.endsWith(".pdf")
                    ? "Approved demo source document"
                    : "Populated mock template"}
                </div>
              </div>
              <a
                className="btn btn-outline"
                href={`/api/demo-files/${f}`}
                download
              >
                <Download size={13} /> Download
              </a>
            </div>
          ))}
          <div className="divider" />
          <div className="top-actions">
            <select
              aria-label="Blank template type"
              className="input"
              value={blankKind}
              onChange={(e) => setBlankKind(e.target.value)}
            >
              <option>customers</option>
              <option>transactions</option>
              <option>conversations</option>
              <option>products</option>
            </select>
            <button
              className="btn btn-outline"
              onClick={() => {
                downloadText(
                  `${blankKind}-blank.csv`,
                  blankHeaders[blankKind],
                  "text/csv",
                );
                notify(`Downloaded blank ${blankKind} template`);
              }}
            >
              Blank template
            </button>
            <button
              className="btn btn-danger"
              onClick={() => {
                if (
                  window.confirm(
                    "Reset all session workflow changes and reload the seeded demo?",
                  )
                ) {
                  workflow.reset();
                  notify("Seeded demo session reloaded");
                }
              }}
            >
              Reset demo
            </button>
          </div>
        </div>
        {workflow.imports.length > 0 && (
          <div className="card" style={{ marginTop: 14 }}>
            <h2>Confirmed session imports</h2>
            {workflow.imports.map((x, i) => (
              <div className="evidence" key={`${x.filename}-${i}`}>
                <span className="evidence-id">
                  IMP-{String(i + 1).padStart(3, "0")} · {x.audit.at}
                </span>
                <div>
                  {x.filename} · {x.kind} · {x.validCount} accepted
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
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

function Recommendations({ notify }: { notify: (s: string) => void }) {
  const [expanded, setExpanded] = useState("REC-001");
  const workflow = useWorkflow();
  return (
    <div className="grid two">
      <div className="card">
        <div className="card-head">
          <h2>Recommendation queue</h2>
          <span className="badge medium">Human review required</span>
        </div>
        {recommendations.map((r) => {
          const c = customers.find((x) => x.id === r.customerId)!;
          const status = workflow.recommendationStatuses[r.id] ?? r.status;
          return (
            <div
              key={r.id}
              className="evidence"
              onClick={() => setExpanded(r.id)}
              style={{
                cursor: "pointer",
                borderColor: expanded === r.id ? "#69a99e" : undefined,
              }}
            >
              <div className="split">
                <span className="evidence-id">
                  {r.id} · {c.name}
                </span>
                {badge(status)}
              </div>
              <strong>{r.action}</strong>
              <div className="subtle">
                {r.priority} · {r.channel} · {r.confidence} confidence
              </div>
            </div>
          );
        })}
      </div>
      <RecommendationDetail
        key={expanded}
        rec={recommendations.find((r) => r.id === expanded)!}
        notify={notify}
      />
    </div>
  );
}
function RecommendationDetail({
  rec: r,
  notify,
}: {
  rec: (typeof recommendations)[number];
  notify: (s: string) => void;
}) {
  const c = customers.find((x) => x.id === r.customerId)!;
  const workflow = useWorkflow(),
    status = workflow.recommendationStatuses[r.id] ?? r.status;
  const [draft, setDraft] = useState(
      c.scenario === "A"
        ? "Hi Maya, I’m sorry our promised update was missed. I’m reviewing the replacement status under our service policy and will confirm the next step after manager approval."
        : "Hi Ethan, based on your question about campaign performance, I can share the approved Analytics Suite overview if helpful.",
    ),
    [feedback, setFeedback] = useState("");
  const submit = () => {
    workflow.setRecommendation(r.id, "Pending Approval");
    notify(
      "Original AVO output and edited draft saved; submitted for manager approval",
    );
  };
  const rate = (value: string) => {
    if (value === "Incorrect") {
      const note = window.prompt("Correction note (required)");
      if (!note?.trim())
        return notify(
          "Incorrect feedback was not saved because a correction note is required",
        );
      workflow.log("Recommendation feedback", r.id, `Incorrect: ${note}`);
    } else workflow.log("Recommendation feedback", r.id, value);
    setFeedback(value);
    notify(`Recommendation marked ${value}`);
  };
  return (
    <div className="card">
      <div className="card-head">
        <h2>AVO Recommendation</h2>
        {badge(r.confidence)}
      </div>
      <div className="notice warning">
        AVO-generated recommendation. Verify evidence before approval.
      </div>
      <h3 style={{ marginTop: 16 }}>{r.action}</h3>
      <p className="subtle" style={{ lineHeight: 1.6 }}>
        {r.explanation}
      </p>
      <div className="grid two">
        <div className="field">
          <label>Owner</label>
          <input className="input" defaultValue={r.owner} />
        </div>
        <div className="field">
          <label>Deadline</label>
          <input className="input" defaultValue={r.deadline} />
        </div>
      </div>
      <div className="field" style={{ marginTop: 12 }}>
        <label>Editable customer draft</label>
        <textarea
          className="input"
          rows={5}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
      </div>
      <h3 style={{ marginTop: 16 }}>Evidence and policy sources</h3>
      {c.messages
        .filter((m) => m.evidence)
        .slice(0, 3)
        .map((m) => (
          <div className="evidence" key={m.id}>
            <span className="evidence-id">{m.id} · Source evidence</span>
            <div>{m.text}</div>
          </div>
        ))}
      <div className="evidence">
        <span className="evidence-id">
          customer-service-policy.pdf · page 1
        </span>
        <div>
          Service recovery must precede promotional outreach for unresolved
          complaints.
        </div>
      </div>
      <div className="notice">
        Uncertainty: the customer’s future behaviour cannot be confirmed. Staff
        must validate current delivery status.
      </div>
      <div className="top-actions" style={{ marginTop: 13 }}>
        <button
          className="btn btn-primary"
          disabled={!draft.trim() || status === "Pending Approval"}
          onClick={submit}
        >
          {status === "Pending Approval" ? "Submitted" : "Submit for approval"}
        </button>
        <button className="btn btn-outline" onClick={() => rate("Useful")}>
          Useful
        </button>
        <button
          className="btn btn-outline"
          onClick={() => rate("Partially useful")}
        >
          Partially useful
        </button>
        <button className="btn btn-outline" onClick={() => rate("Not useful")}>
          Not useful
        </button>
        <button className="btn btn-outline" onClick={() => rate("Incorrect")}>
          Incorrect
        </button>
      </div>
      {feedback && <p className="subtle">Feedback recorded: {feedback}</p>}
    </div>
  );
}

function Actions({
  notify,
  role,
}: {
  notify: (s: string) => void;
  role: Role;
}) {
  const workflow = useWorkflow();
  const c = customers[0],
    status = workflow.actionStatus,
    manager = role === "Sales Manager" || role === "Administrator",
    approved = status === "Approved" || status === "Executed";
  const [message, setMessage] = useState(
      "Hi Maya, I’m sorry our promised update was missed. I’m reviewing the replacement under our approved service policy and will confirm the next step.",
    ),
    [comment, setComment] = useState("");
  const decide = (next: string) => {
    if (!manager) return notify("Sales Manager or Administrator role required");
    if (!comment.trim()) return notify("A reviewer comment is required");
    if (next === "Rejected") {
      const reason = window.prompt("Rejection reason (required)");
      if (!reason?.trim())
        return notify("Rejection cancelled because a reason is required");
      workflow.log("Approval rejection reason", "ACT-021", reason);
    }
    workflow.setAction(next);
    notify(`Action ${next.toLowerCase()} and audit event recorded`);
  };
  const execute = (channel: string) => {
    if (!approved) return notify("Approval is required before execution");
    if (!canOutreach(c, channel))
      return notify(`Consent guardrail blocked ${channel} outreach`);
    workflow.setAction("Executed");
    notify(`Approved ${channel} action opened; no message was auto-sent`);
  };
  return (
    <div className="grid two">
      <div className="card">
        <div className="card-head">
          <h2>ACT-021 · Service recovery</h2>
          {badge(status)}
        </div>
        <div className="customer">
          <div className="customer-dot">MT</div>
          <div>
            <strong>{c.name}</strong>
            <div className="subtle">{c.company} · consent verified</div>
          </div>
        </div>
        <div className="divider" />
        <div className="timeline">
          {[
            ["Draft created", "Aisha Rahman · original AVO output retained"],
            ["Submitted for approval", "Aisha Rahman · human edit retained"],
            [
              status === "Rejected"
                ? "Rejected"
                : status === "Changes Requested"
                  ? "Changes requested"
                  : approved
                    ? "Approved"
                    : "Awaiting Sales Manager",
              approved
                ? "Farah Chen · reviewer comment recorded"
                : "Decision pending",
            ],
            [
              status === "Executed" ? "Outreach opened" : "Execution pending",
              status === "Executed"
                ? "Executor and timestamp audited"
                : "Requires approval",
            ],
          ].map(([a, b], i) => (
            <div className="timeline-item" key={String(a)}>
              <span
                className="timeline-dot"
                style={{
                  borderColor: i < 2 || approved ? "#19766e" : "#c8ceca",
                }}
              />
              <strong>{a}</strong>
              <div className="subtle">{b}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="card">
        <div className="card-head">
          <h2>Approval review</h2>
          <span className="badge strategic">Sales Manager</span>
        </div>
        <div className="notice warning">
          AVO cannot approve its own recommendation. Original and human-edited
          versions are retained.
        </div>
        <div className="field" style={{ marginTop: 14 }}>
          <label>Customer message draft</label>
          <textarea
            className="input"
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>
        <div className="field" style={{ marginTop: 10 }}>
          <label>Reviewer comment (required)</label>
          <input
            className="input"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Record the basis for the decision"
          />
        </div>
        {!approved ? (
          <div className="top-actions" style={{ marginTop: 12 }}>
            <button
              className="btn btn-primary"
              disabled={!manager || !message.trim()}
              onClick={() => decide("Approved")}
            >
              Approve
            </button>
            <button
              className="btn btn-danger"
              disabled={!manager}
              onClick={() => decide("Rejected")}
            >
              Reject
            </button>
            <button
              className="btn btn-outline"
              disabled={!manager}
              onClick={() => decide("Changes Requested")}
            >
              Request changes
            </button>
          </div>
        ) : (
          <div className="top-actions" style={{ marginTop: 12 }}>
            <a
              className="btn btn-primary"
              href={whatsappLink(c.phone, message)}
              target="_blank"
              rel="noreferrer"
              onClick={() => execute("WhatsApp")}
            >
              <MessageCircle size={14} /> Open approved WhatsApp
            </a>
            <a
              className="btn btn-outline"
              href={`mailto:${c.email}?subject=${encodeURIComponent("Service recovery follow-up")}&body=${encodeURIComponent(message)}`}
              onClick={() => execute("Email")}
            >
              <Mail size={14} /> Compose email
            </a>
            <button
              className="btn btn-outline"
              onClick={() => {
                workflow.log(
                  "Internal follow-up task created",
                  "TASK-021",
                  "Open",
                );
                notify("Internal follow-up task created");
              }}
            >
              Create internal task
            </button>
            <Link
              className="btn btn-outline"
              href="/r/demo-recovery-cus1001"
              onClick={() =>
                workflow.log("Trackable link opened", "LINK-021", "Click")
              }
            >
              Trackable recovery page
            </Link>
          </div>
        )}
        {!manager && !approved && (
          <p className="subtle">
            This demo account has read-only access to approval controls.
          </p>
        )}
      </div>
    </div>
  );
}

function Marketing({ go }: { go: (p: string) => void }) {
  const detection = detectSegmentDecline(4, 12, 18, 24, 29),
    affected = customers.filter((c) => c.region === "North").slice(0, 6);
  return (
    <>
      <div className="grid stats">
        {[
          ["Active triggers", "3"],
          ["Customers affected", "12"],
          ["Revenue decline", "18%"],
          ["Shared themes", "3"],
        ].map(([a, b]) => (
          <div className="card" key={a}>
            <div className="subtle">{a}</div>
            <div className="stat-value">{b}</div>
            <span className="demo-label">Synthetic metric</span>
          </div>
        ))}
      </div>
      <div className="card">
        <div className="card-head">
          <div>
            <h2>MKT-003 · North food & beverage decline</h2>
            <div className="subtle">System-detected · 18 July 2026</div>
          </div>
          <span className="badge high">Intervention recommended</span>
        </div>
        <div className="grid three">
          <div className="evidence">
            <span className="evidence-id">DETERMINISTIC CALCULATION</span>
            <strong style={{ display: "block", fontSize: 20 }}>
              {detection.affectedPercentage}%
            </strong>
            <span className="subtle">
              4 of 12 at High/Critical risk · threshold 20%
            </span>
          </div>
          <div className="evidence">
            <span className="evidence-id">TRANSACTION EVIDENCE</span>
            <strong style={{ display: "block", fontSize: 20 }}>-18%</strong>
            <span className="subtle">
              Segment revenue vs prior period · threshold -15%
            </span>
          </div>
          <div className="evidence">
            <span className="evidence-id">ENGAGEMENT EVIDENCE</span>
            <strong style={{ display: "block", fontSize: 20 }}>-29%</strong>
            <span className="subtle">
              Reply and campaign engagement · threshold -25%
            </span>
          </div>
        </div>
        <div className="grid two" style={{ marginTop: 14 }}>
          <div>
            <h3>Common evidence and themes</h3>
            {[
              "Package price difficult to justify — 5 customers",
              "Purchase frequency down 24%",
              "Lower engagement across email campaigns",
            ].map((x, i) => (
              <div className="evidence" key={x}>
                <span className="evidence-id">
                  {i
                    ? "Transaction aggregate"
                    : "Conversation sources · 5 valid message IDs"}
                </span>
                <div>{x}</div>
              </div>
            ))}
            <h3>Affected customers</h3>
            {affected.map((c) => (
              <div className="split evidence" key={c.id}>
                <span>
                  {c.id} · {c.name}
                </span>
                {badge(c.risk)}
              </div>
            ))}
          </div>
          <div>
            <h3>AVO campaign recommendation</h3>
            <div className="notice">
              Create a value-education campaign grounded in the approved product
              catalogue and marketing guidelines. Do not invent a discount or
              imply guaranteed savings.
            </div>
            <p className="subtle">
              Confidence: Medium · Pricing sensitivity is observed, but causal
              attribution remains uncertain.
            </p>
            <button
              className="btn btn-primary"
              onClick={() => go("campaign-studio")}
            >
              <Sparkles size={14} /> Create campaign with AVO
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function CampaignStudio({
  notify,
  role,
}: {
  notify: (s: string) => void;
  role: Role;
}) {
  const workflow = useWorkflow(),
    status = workflow.campaignStatus;
  const [stage, setStage] = useState(1),
    [generated, setGenerated] = useState(false),
    [comment, setComment] = useState(""),
    [sources, setSources] = useState([true, true, true]);
  const manager = role === "Marketing Manager" || role === "Administrator",
    approved = status === "Approved" || status === "Scheduled";
  const schedule = async () => {
    if (!approved)
      return notify("Marketing Manager approval is required before scheduling");
    const r = await fetch("/api/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaignId: "CAM-003",
        channelId: "demo-linkedin",
        text: "Make every order work harder with clearer inventory insight. Explore the approved Inventory Optimizer guide.",
        dueAt: "2026-07-24T02:00:00.000Z",
        approved: true,
        idempotencyKey: "CAM-003-demo-linkedin-20260724",
      }),
    });
    const d = await r.json();
    if (!r.ok || d.error) return notify(d.error || "Scheduling failed");
    workflow.setCampaign("Scheduled");
    notify(
      d.simulated
        ? "Scheduled with Demo Publisher — simulated, not sent"
        : "Campaign scheduled through Buffer",
    );
  };
  const submit = () => {
    if (!generated || !sources.some(Boolean))
      return notify(
        "Generate content and select at least one approved source first",
      );
    workflow.setCampaign("Pending Approval");
    setStage(4);
    notify(
      "Campaign submitted; original AVO output and current version preserved",
    );
  };
  const approve = () => {
    if (!manager)
      return notify("Marketing Manager or Administrator role required");
    if (status !== "Pending Approval")
      return notify("Campaign must be submitted before approval");
    if (!comment.trim()) return notify("Reviewer comment is required");
    workflow.setCampaign("Approved");
    setStage(5);
    notify("Marketing Manager approved campaign and factual review");
  };
  return (
    <div className="grid two">
      <div className="card">
        <div className="card-head">
          <h2>CAM-003 · Value clarity</h2>
          {badge(status)}
        </div>
        <div className="tabs">
          {["1 Brief", "2 Content", "3 Review", "4 Approval", "5 Schedule"].map(
            (x, i) => (
              <button
                key={x}
                className={`tab ${stage === i + 1 ? "active" : ""}`}
                onClick={() => setStage(i + 1)}
              >
                {x}
              </button>
            ),
          )}
        </div>
        <div className="field">
          <label>Objective</label>
          <input
            className="input"
            defaultValue="Re-engage North food & beverage customers with approved product value education"
          />
        </div>
        <div className="field" style={{ marginTop: 10 }}>
          <label>Consented audience</label>
          <input
            className="input"
            defaultValue="8 of 12 customers · 4 excluded by consent guardrail"
            readOnly
          />
        </div>
        <h3 style={{ marginTop: 16 }}>Approved source materials</h3>
        {[
          "product-catalogue.pdf · page 1",
          "marketing-guidelines.pdf · page 1",
          "MKT-003 aggregate evidence",
        ].map((x, i) => (
          <label className="evidence" key={x} style={{ display: "block" }}>
            <input
              type="checkbox"
              checked={sources[i]}
              onChange={(e) =>
                setSources((s) =>
                  s.map((v, j) => (j === i ? e.target.checked : v)),
                )
              }
            />{" "}
            {x}
          </label>
        ))}
        <div className="notice">
          Consent guardrail excluded 4 customers before audience selection.
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            if (!sources.some(Boolean))
              return notify("Select an approved source");
            setGenerated(true);
            setStage(2);
            workflow.log(
              "AVO campaign content generated",
              "CAM-003",
              "AVO Demo Analysis",
            );
            notify("AVO Demo Analysis generated grounded campaign variants");
          }}
        >
          <Bot size={14} /> Generate with AVO
        </button>
        <div className="evidence" style={{ marginTop: 12 }}>
          <span className="evidence-id">CAMPAIGN VISUAL</span>
          <div>
            existing-campaign.png · 1200×628 · synthetic asset · crop
            suggestion: centred safe area
          </div>
          <a
            className="btn btn-outline"
            href="/api/demo-files/existing-campaign.png"
            target="_blank"
          >
            Preview visual
          </a>
        </div>
      </div>
      <div className="card">
        <div className="card-head">
          <h2>Channel content</h2>
          {generated && <span className="demo-label">AVO Demo Analysis</span>}
        </div>
        <div className="notice warning">
          Factual review: no discount, unverified price, inventory guarantee or
          outcome claim is present.
        </div>
        {[
          [
            "LinkedIn caption",
            "Make every order work harder with clearer inventory insight. Explore the approved Inventory Optimizer guide.",
          ],
          [
            "Instagram caption",
            "Plan with a clearer view. Explore the Inventory Optimizer overview and ask our team whether it fits your workflow. #InventoryPlanning #CustomerSuccess",
          ],
          [
            "Facebook caption",
            "Looking for a clearer view of inventory movement? Read the approved Inventory Optimizer overview and speak with our team about fit.",
          ],
          ["Email subject", "A clearer view of your inventory planning"],
          [
            "Email message",
            "Explore the approved Inventory Optimizer overview. Reply if you would like a staff-led walkthrough.",
          ],
          [
            "WhatsApp campaign message",
            "See the approved Inventory Optimizer overview. Reply if you would like a staff-led walkthrough.",
          ],
          ["Hashtags", "#InventoryPlanning #CustomerSuccess #FoodOperations"],
          ["Call to action", "Review the approved product overview"],
          [
            "Landing-page text",
            "Understand the documented planning views and decide with your team whether the product fits.",
          ],
        ].map(([label, value]) => (
          <div className="field" style={{ marginTop: 10 }} key={label}>
            <label>{label}</label>
            {value.length > 80 ? (
              <textarea className="input" rows={3} defaultValue={value} />
            ) : (
              <input className="input" defaultValue={value} />
            )}
          </div>
        ))}
        <div className="evidence">
          <span className="evidence-id">CLAIM SOURCE</span>
          <div>
            product-catalogue.pdf · page 1 · Inventory Optimizer description
          </div>
        </div>
        <div className="field">
          <label>Reviewer comment (required for approval)</label>
          <input
            className="input"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Record factual and audience review"
          />
        </div>
        <div className="top-actions" style={{ marginTop: 12 }}>
          {status === "Draft" && (
            <button
              className="btn btn-primary"
              disabled={!generated}
              onClick={submit}
            >
              Submit for approval
            </button>
          )}
          {status === "Pending Approval" && (
            <>
              <button
                className="btn btn-primary"
                disabled={!manager}
                onClick={approve}
              >
                Approve as manager
              </button>
              <button
                className="btn btn-danger"
                disabled={!manager}
                onClick={() => {
                  if (!comment.trim())
                    return notify("Reviewer comment is required");
                  workflow.setCampaign("Rejected");
                  notify("Campaign rejected and audited");
                }}
              >
                Reject
              </button>
            </>
          )}
          {approved && (
            <button
              className="btn btn-primary"
              onClick={schedule}
              disabled={status === "Scheduled"}
            >
              <CalendarDays size={14} />
              {status === "Scheduled"
                ? "Scheduled (simulated)"
                : "Schedule approved campaign"}
            </button>
          )}
        </div>
        {!manager && status === "Pending Approval" && (
          <p className="subtle">This account cannot approve campaigns.</p>
        )}
      </div>
    </div>
  );
}

function Calendar() {
  const workflow = useWorkflow();
  return (
    <div className="grid three">
      {[
        [
          "24 Jul",
          "Value clarity",
          "LinkedIn · 10:00",
          workflow.campaignStatus,
        ],
        ["26 Jul", "Product planning guide", "Instagram · 12:30", "Approved"],
        ["30 Jul", "Recovery stories", "Facebook · 09:00", "Draft"],
      ].map(([d, n, t, s]) => (
        <div className="card" key={n}>
          <div className="eyebrow">{d} · 2026</div>
          <h2 style={{ margin: "9px 0" }}>{n}</h2>
          <div className="subtle">{t}</div>
          <div className="divider" />
          {badge(s)}
        </div>
      ))}
    </div>
  );
}

function Analytics() {
  return (
    <>
      <div className="grid stats">
        {[
          ["Recovered customers", "6", "+2 this quarter"],
          ["Estimated recovered revenue", money(128400), "Synthetic estimate"],
          ["Actions completed", "18", "78% approval rate"],
          ["Campaign conversions", "7", "Demo outcomes"],
        ].map(([a, b, c]) => (
          <div className="card" key={a}>
            <div className="subtle">{a}</div>
            <div className="stat-value">{b}</div>
            <div className="trend">{c}</div>
          </div>
        ))}
      </div>
      <div className="grid two">
        <div className="card">
          <div className="card-head">
            <h2>Customers by tier</h2>
            <span className="demo-label">Synthetic</span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={tiersChart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#19766e" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <div className="card-head">
            <h2>Customers by risk</h2>
            <span className="demo-label">Synthetic</span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={riskChart}
                dataKey="value"
                nameKey="name"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
              >
                {["#58a884", "#dec453", "#e89b45", "#dd684d"].map((x) => (
                  <Cell key={x} fill={x} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="grid two" style={{ marginTop: 14 }}>
        <div className="card">
          <h2>Successful recovery · Omar Aziz</h2>
          <div className="divider" />
          <div className="timeline">
            <div className="timeline-item">
              <span className="timeline-dot" />
              <strong>High risk · 68</strong>
              <div className="subtle">Unresolved replacement issue</div>
            </div>
            <div className="timeline-item">
              <span className="timeline-dot" />
              <strong>Approved service recovery</strong>
              <div className="subtle">Human-reviewed WhatsApp action</div>
            </div>
            <div className="timeline-item">
              <span className="timeline-dot" />
              <strong>Positive response and new purchase</strong>
              <div className="subtle">Risk recalculated to Medium · 42</div>
            </div>
          </div>
          <div className="notice">
            Estimated recovered revenue: {money(22100)} · based on observed
            subsequent purchase, labelled estimate.
          </div>
        </div>
        <div className="card">
          <h2>AVO governance</h2>
          <div className="divider" />
          {[
            ["Generated", 42],
            ["Approved unchanged", 19],
            ["Edited before approval", 13],
            ["Rejected", 6],
            ["Marked incorrect", 1],
            ["Low confidence / abstained", 4],
          ].map(([a, b]) => (
            <div className="split evidence" key={String(a)}>
              <span>{a}</span>
              <strong>{b}</strong>
            </div>
          ))}
        </div>
      </div>
    </>
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
