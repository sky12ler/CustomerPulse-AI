"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Download, Search, X } from "lucide-react";
import type { Customer, Risk, Tier } from "@/lib/types";
import {
  emptyCustomerFilters,
  filterCustomerRows,
  operationalCustomerRows,
  sortCustomerRows,
  type CustomerFilters,
  type CustomerSortKey,
  type SortDirection,
} from "@/lib/customer-selectors";
import { isReadOnlyRole } from "@/lib/customer-access";
import { useDemoWorkflow } from "./workflow-context";

const money = (value: number) => "RM " + Math.round(value).toLocaleString();
const riskClass = (value: string) => value.toLowerCase().replaceAll(" ", "-");
const badge = (value: string) => (
  <span className={"badge " + riskClass(value)}>{value}</span>
);
const arrayParam = (params: URLSearchParams, key: string) =>
  (params.get(key)?.split(",").filter(Boolean) ?? []) as string[];
const first = (params: URLSearchParams, key: string) => params.get(key) ?? "";
function readState() {
  const params = new URLSearchParams(
    typeof window === "undefined" ? "" : window.location.search,
  );
  const filters: CustomerFilters = {
    ...emptyCustomerFilters(),
    query: first(params, "q"),
    tiers: arrayParam(params, "tier") as Tier[],
    risks: arrayParam(params, "risk") as Risk[],
    owner: first(params, "owner"),
    region: first(params, "region"),
    industry: first(params, "industry"),
    consent: (first(params, "consent") || "All") as CustomerFilters["consent"],
    activeAlert: (first(params, "alert") ||
      "All") as CustomerFilters["activeAlert"],
    pendingAction: (first(params, "pending") ||
      "All") as CustomerFilters["pendingAction"],
    overdueAction: (first(params, "overdue") ||
      "All") as CustomerFilters["overdueAction"],
    sentiment: (first(params, "sentiment") ||
      "All") as CustomerFilters["sentiment"],
    status: first(params, "status"),
  };
  return {
    filters,
    sort: (first(params, "sort") || "default") as CustomerSortKey,
    direction: (first(params, "dir") || "asc") as SortDirection,
    page: Math.max(1, Number(first(params, "page") || 1)),
    pageSize: [10, 25, 50].includes(Number(first(params, "size")))
      ? Number(first(params, "size"))
      : 10,
  };
}
function setListUrl(
  filters: CustomerFilters,
  sort: CustomerSortKey,
  direction: SortDirection,
  page: number,
  pageSize: number,
) {
  const params = new URLSearchParams();
  const set = (key: string, value: string) => {
    if (value && value !== "All") params.set(key, value);
  };
  set("q", filters.query);
  set("tier", filters.tiers.join(","));
  set("risk", filters.risks.join(","));
  set("owner", filters.owner);
  set("region", filters.region);
  set("industry", filters.industry);
  set("consent", filters.consent);
  set("alert", filters.activeAlert);
  set("pending", filters.pendingAction);
  set("overdue", filters.overdueAction);
  set("sentiment", filters.sentiment);
  set("status", filters.status);
  set("sort", sort === "default" ? "" : sort);
  set("dir", sort === "default" ? "" : direction);
  if (page > 1) set("page", String(page));
  if (pageSize !== 10) set("size", String(pageSize));
  const url = "/customers" + (params.size ? "?" + params.toString() : "");
  window.history.replaceState({}, "", url);
  return url;
}
const unique = (values: string[]) => [...new Set(values)].sort();
const actionLabel = (status?: string) => status ?? "No active action";
const activeChipLabels = (filters: CustomerFilters) =>
  [
    filters.query && "Search: " + filters.query,
    filters.tiers.length && "Tier: " + filters.tiers.join(", "),
    filters.risks.length && "Risk: " + filters.risks.join(", "),
    filters.owner && "Owner: " + filters.owner,
    filters.region && "Region: " + filters.region,
    filters.industry && "Industry: " + filters.industry,
    filters.consent !== "All" && "Consent: " + filters.consent,
    filters.activeAlert !== "All" && "Alert: " + filters.activeAlert,
    filters.pendingAction !== "All" && "Pending: " + filters.pendingAction,
    filters.overdueAction !== "All" && "Overdue: " + filters.overdueAction,
    filters.sentiment !== "All" && "Sentiment: " + filters.sentiment,
    filters.status && "Status: " + filters.status,
  ].filter(Boolean) as string[];

export function CustomersList({
  go,
  notify,
}: {
  go: (path: string) => void;
  notify: (message: string) => void;
}) {
  const demo = useDemoWorkflow();
  const initial = useMemo(() => readState(), []);
  const [filters, setFilters] = useState(initial.filters);
  const [sort, setSort] = useState(initial.sort);
  const [direction, setDirection] = useState(initial.direction);
  const [page, setPage] = useState(initial.page);
  const [pageSize, setPageSize] = useState(initial.pageSize);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const actions = demo.accessibleActions;
  const sourceRows = useMemo(
    () =>
      operationalCustomerRows(demo.dataset, actions, demo.accessibleCustomers),
    [demo.dataset, actions, demo.accessibleCustomers],
  );
  const matching = useMemo(
    () =>
      sortCustomerRows(
        filterCustomerRows(sourceRows, filters),
        sort,
        direction,
      ),
    [sourceRows, filters, sort, direction],
  );
  const pages = Math.max(1, Math.ceil(matching.length / pageSize));
  const validPage = Math.min(page, pages);
  const paged = matching.slice(
    (validPage - 1) * pageSize,
    validPage * pageSize,
  );
  useEffect(() => {
    setListUrl(filters, sort, direction, validPage, pageSize);
  }, [filters, sort, direction, validPage, pageSize]);
  useEffect(() => {
    const saved = sessionStorage.getItem("customerpulse-customers-scroll");
    if (saved) {
      setTimeout(
        () => window.scrollTo({ top: Number(saved), behavior: "instant" }),
        0,
      );
      sessionStorage.removeItem("customerpulse-customers-scroll");
    }
  }, []);
  const updateFilters = (patch: Partial<CustomerFilters>) => {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(1);
  };
  const clear = () => {
    setFilters(emptyCustomerFilters());
    setPage(1);
  };
  const open = (customer: Customer, tab = "overview") => {
    const from = window.location.pathname + window.location.search;
    sessionStorage.setItem(
      "customerpulse-customers-scroll",
      String(window.scrollY),
    );
    go(
      "/customers/" +
        encodeURIComponent(customer.id) +
        "?tab=" +
        tab +
        "&from=" +
        encodeURIComponent(from),
    );
  };
  const sortBy = (key: CustomerSortKey) => {
    if (sort === key)
      setDirection((value) => (value === "asc" ? "desc" : "asc"));
    else {
      setSort(key);
      setDirection(key === "name" || key === "owner" ? "asc" : "desc");
    }
    setPage(1);
  };
  const ariaSort = (
    key: CustomerSortKey,
  ): "ascending" | "descending" | "none" =>
    sort === key ? (direction === "asc" ? "ascending" : "descending") : "none";
  const summary = {
    high: matching.filter((row) =>
      ["High", "Critical"].includes(row.customer.risk),
    ).length,
    strategic: matching.filter(
      (row) => row.customer.tier === "Strategic" && row.customer.risk !== "Low",
    ).length,
    revenue: matching.reduce((sum, row) => sum + row.customer.revenueAtRisk, 0),
    pending: matching.filter((row) => row.action?.status === "Pending Approval")
      .length,
    overdue: matching.filter((row) => row.overdue).length,
  };
  const exportRows = () => {
    const timestamp = new Date().toISOString();
    const header = [
      "customer_id",
      "customer_name",
      "company",
      "tier",
      "risk",
      "risk_score",
      "eligible_revenue_base",
      "revenue_period",
      "churn_probability",
      "estimated_revenue_at_risk",
      "calculation_version",
      "calculated_at",
      "owner",
      "active_alert",
      "next_action",
      "deadline",
    ];
    const rows = matching.map(
      ({ customer, calculation, alert, action, deadline }) =>
        [
          customer.id,
          customer.name,
          customer.company,
          customer.tier,
          customer.risk,
          customer.riskScore,
          calculation?.eligibleRevenueBase ?? 0,
          calculation?.revenuePeriod ?? "Next 90 days",
          calculation?.churnProbability ?? customer.riskScore / 100,
          customer.revenueAtRisk,
          calculation?.revenueCalculationVersion ?? "ERAR-v1",
          calculation?.calculatedAt ?? "",
          customer.staff,
          alert?.status ?? "None",
          action?.status ?? "No active action",
          deadline,
        ]
          .map((value) => '"' + String(value).replaceAll('"', '""') + '"')
          .join(","),
    );
    const csv =
      "# Exported: " +
      timestamp +
      "\n# Dataset: " +
      demo.state.activeWorkspace +
      "; synthetic=" +
      (demo.state.activeWorkspace === "demo") +
      "\n" +
      header.join(",") +
      "\n" +
      rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download =
      "customerpulse-customers-" + timestamp.slice(0, 10) + ".csv";
    anchor.click();
    URL.revokeObjectURL(url);
    demo.log(
      "Scoped customer export",
      "customers",
      "Success",
      matching.length +
        " authorized filtered records; " +
        demo.state.activeWorkspace,
    );
    notify(
      "Exported " + matching.length + " authorized filtered customer records.",
    );
  };
  const chips = activeChipLabels(filters);
  const start = matching.length ? (validPage - 1) * pageSize + 1 : 0,
    end = Math.min(validPage * pageSize, matching.length);
  return (
    <div className="customers-workspace">
      <section
        className="customer-summary"
        aria-label="Filtered customer summary"
      >
        <button onClick={() => clear()}>
          <span>Visible customers</span>
          <strong>{matching.length}</strong>
          <small>filtered accessible records</small>
        </button>
        <button onClick={() => updateFilters({ risks: ["High", "Critical"] })}>
          <span>High/Critical Risk</span>
          <strong>{summary.high}</strong>
          <small>quick filter</small>
        </button>
        <button
          onClick={() =>
            updateFilters({
              tiers: ["Strategic"],
              risks: ["Medium", "High", "Critical"],
            })
          }
        >
          <span>Strategic at risk</span>
          <strong>{summary.strategic}</strong>
          <small>Medium or higher</small>
        </button>
        <div className="customer-summary-metric">
          <span>Estimated revenue at risk</span>
          <strong>{money(summary.revenue)}</strong>
          <small>filtered 90-day estimate</small>
        </div>
        <button onClick={() => updateFilters({ pendingAction: "Yes" })}>
          <span>Pending actions</span>
          <strong>{summary.pending}</strong>
          <small>quick filter</small>
        </button>
        <button onClick={() => updateFilters({ overdueAction: "Yes" })}>
          <span>Overdue follow-ups</span>
          <strong>{summary.overdue}</strong>
          <small>quick filter</small>
        </button>
      </section>
      <section className="card customer-controls">
        <div className="customer-control-head">
          <div className="field customer-search">
            <label htmlFor="customer-search">Search customer or company</label>
            <div className="search-control">
              <Search size={15} />
              <input
                id="customer-search"
                className="input"
                value={filters.query}
                onChange={(event) =>
                  updateFilters({ query: event.target.value })
                }
                onKeyDown={(event) => {
                  if (event.key === "Escape") updateFilters({ query: "" });
                }}
                placeholder={
                  demo.state.role === "Account Executive"
                    ? "Search " +
                      demo.accessibleCustomers.length +
                      " assigned customers"
                    : "Search " + demo.accessibleCustomers.length + " customers"
                }
              />
              {filters.query && (
                <button
                  aria-label="Clear customer search"
                  onClick={() => updateFilters({ query: "" })}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
          <div>
            <div className="result-count" aria-live="polite">
              Showing {matching.length} of {demo.accessibleCustomers.length}{" "}
              {demo.state.role === "Account Executive" ? "assigned " : ""}
              customers
            </div>
            <button className="btn btn-outline" onClick={exportRows}>
              <Download size={14} /> Export View
            </button>
          </div>
        </div>
        <div className="customer-filters">
          <Filter
            label="Tier"
            value={filters.tiers.join(",")}
            onChange={(value) =>
              updateFilters({ tiers: value ? [value as Tier] : [] })
            }
            options={unique(sourceRows.map((row) => row.customer.tier))}
          />
          <Filter
            label="Risk"
            value={filters.risks.join(",")}
            onChange={(value) =>
              updateFilters({
                risks:
                  value === "High,Critical"
                    ? ["High", "Critical"]
                    : value
                      ? [value as Risk]
                      : [],
              })
            }
            options={[
              "High,Critical",
              ...unique(sourceRows.map((row) => row.customer.risk)),
            ]}
          />
          <Filter
            label="Owner"
            value={filters.owner}
            onChange={(owner) => updateFilters({ owner })}
            options={unique(sourceRows.map((row) => row.customer.staff))}
          />
          <Filter
            label="Region"
            value={filters.region}
            onChange={(region) => updateFilters({ region })}
            options={unique(sourceRows.map((row) => row.customer.region))}
          />
          <Filter
            label="Industry"
            value={filters.industry}
            onChange={(industry) => updateFilters({ industry })}
            options={unique(sourceRows.map((row) => row.customer.industry))}
          />
          <Filter
            label="Consent"
            value={filters.consent}
            onChange={(consent) =>
              updateFilters({ consent: consent as CustomerFilters["consent"] })
            }
            options={["Granted", "Withdrawn"]}
          />
          <Filter
            label="Active alert"
            value={filters.activeAlert}
            onChange={(activeAlert) =>
              updateFilters({
                activeAlert: activeAlert as CustomerFilters["activeAlert"],
              })
            }
            options={["Yes", "No"]}
          />
          <Filter
            label="Pending action"
            value={filters.pendingAction}
            onChange={(pendingAction) =>
              updateFilters({
                pendingAction:
                  pendingAction as CustomerFilters["pendingAction"],
              })
            }
            options={["Yes", "No"]}
          />
          <Filter
            label="Overdue action"
            value={filters.overdueAction}
            onChange={(overdueAction) =>
              updateFilters({
                overdueAction:
                  overdueAction as CustomerFilters["overdueAction"],
              })
            }
            options={["Yes", "No"]}
          />
          <Filter
            label="Sentiment"
            value={filters.sentiment}
            onChange={(sentiment) =>
              updateFilters({
                sentiment: sentiment as CustomerFilters["sentiment"],
              })
            }
            options={["Positive", "Neutral", "Negative"]}
          />
          <Filter
            label="Customer status"
            value={filters.status}
            onChange={(status) => updateFilters({ status })}
            options={unique(sourceRows.map((row) => row.customer.status))}
          />
        </div>
        <div className="filter-chips" aria-label="Active filters">
          {chips.map((chip) => (
            <span className="filter-chip" key={chip}>
              {chip}
            </span>
          ))}
          {chips.length > 0 && (
            <button className="btn btn-outline" onClick={clear}>
              Clear All
            </button>
          )}
        </div>
      </section>
      {matching.length === 0 ? (
        <section className="card empty">
          <h2>No customers match the current search and filters.</h2>
          <button
            className="btn btn-outline"
            onClick={() => updateFilters({ query: "" })}
          >
            Clear Search
          </button>{" "}
          <button className="btn btn-primary" onClick={clear}>
            Clear All Filters
          </button>
        </section>
      ) : (
        <>
          <section className="card customer-table-card">
            <div className="table-wrap">
              <table className="table operational-customer-table">
                <thead>
                  <tr>
                    <SortHeader
                      label="Customer"
                      sortKey="name"
                      active={sort}
                      ariaSort={ariaSort("name")}
                      onSort={sortBy}
                    />
                    <SortHeader
                      label="Tier"
                      sortKey="tier"
                      active={sort}
                      ariaSort={ariaSort("tier")}
                      onSort={sortBy}
                    />
                    <SortHeader
                      label="Risk / score"
                      sortKey="risk"
                      active={sort}
                      ariaSort={ariaSort("risk")}
                      onSort={sortBy}
                    />
                    <SortHeader
                      label="Estimated revenue at risk"
                      sortKey="revenue"
                      active={sort}
                      ariaSort={ariaSort("revenue")}
                      onSort={sortBy}
                    />
                    <th>Active alert</th>
                    <th>Next action</th>
                    <SortHeader
                      label="Deadline"
                      sortKey="deadline"
                      active={sort}
                      ariaSort={ariaSort("deadline")}
                      onSort={sortBy}
                    />
                    <SortHeader
                      label="Owner"
                      sortKey="owner"
                      active={sort}
                      ariaSort={ariaSort("owner")}
                      onSort={sortBy}
                    />
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((row) => (
                    <CustomerRow
                      key={row.customer.id}
                      row={row}
                      expanded={expanded.has(row.customer.id)}
                      onToggle={() =>
                        setExpanded((current) => {
                          const next = new Set(current);
                          if (next.has(row.customer.id)) {
                            next.delete(row.customer.id);
                          } else {
                            next.add(row.customer.id);
                          }
                          return next;
                        })
                      }
                      open={open}
                      go={go}
                      readOnly={isReadOnlyRole(demo.state.role)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className="customer-mobile-list" aria-label="Customer cards">
            {paged.map((row) => (
              <CustomerCard key={row.customer.id} row={row} open={open} />
            ))}
          </section>
          <nav className="card pagination" aria-label="Customer pagination">
            <span>
              Showing {start}-{end} of {matching.length} customers
            </span>
            <label>
              Rows per page{" "}
              <select
                className="input"
                aria-label="Rows per page"
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPage(1);
                }}
              >
                <option>10</option>
                <option>25</option>
                <option>50</option>
              </select>
            </label>
            <button
              className="btn btn-outline"
              aria-label="Previous customer page"
              disabled={validPage <= 1}
              onClick={() => setPage(validPage - 1)}
            >
              Previous
            </button>
            <strong>
              Page {validPage} of {pages}
            </strong>
            <button
              className="btn btn-outline"
              aria-label="Next customer page"
              disabled={validPage >= pages}
              onClick={() => setPage(validPage + 1)}
            >
              Next
            </button>
          </nav>
        </>
      )}
    </div>
  );
}
function Filter({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <select
        className="input"
        aria-label={label + " filter"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">All</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
function SortHeader({
  label,
  sortKey,
  active,
  ariaSort,
  onSort,
}: {
  label: string;
  sortKey: CustomerSortKey;
  active: CustomerSortKey;
  ariaSort: "ascending" | "descending" | "none";
  onSort: (key: CustomerSortKey) => void;
}) {
  return (
    <th aria-sort={ariaSort}>
      <button className="sort-button" onClick={() => onSort(sortKey)}>
        {label}
        {active === sortKey &&
          (ariaSort === "ascending" ? " ascending" : " descending")}
      </button>
    </th>
  );
}
function customerHref(customer: Customer, tab = "overview") {
  const from =
    typeof window === "undefined"
      ? "/customers"
      : window.location.pathname + window.location.search;
  return (
    "/customers/" +
    encodeURIComponent(customer.id) +
    "?tab=" +
    tab +
    "&from=" +
    encodeURIComponent(from)
  );
}
function CustomerRow({
  row,
  expanded,
  onToggle,
  open,
  go,
  readOnly,
}: {
  row: ReturnType<typeof operationalCustomerRows>[number];
  expanded: boolean;
  onToggle: () => void;
  open: (customer: Customer, tab?: string) => void;
  go: (path: string) => void;
  readOnly: boolean;
}) {
  const { customer, alert, action, deadline } = row;
  const follow = (
    event: React.MouseEvent<HTMLAnchorElement>,
    tab = "overview",
  ) => {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    event.preventDefault();
    open(customer, tab);
  };
  return (
    <>
      <tr
        className="customer-operational-row"
        role="link"
        tabIndex={0}
        aria-label={"Open customer " + customer.name}
        onClick={(event) => {
          if (!(event.target as HTMLElement).closest("a,button,input,select"))
            open(customer);
        }}
        onKeyDown={(event) => {
          if (
            (event.key === "Enter" || event.key === " ") &&
            !(event.target as HTMLElement).closest("a,button,input,select")
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
                href={customerHref(customer)}
                onClick={follow}
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
        <td>
          {badge(customer.risk)} <strong>{customer.riskScore}</strong>
        </td>
        <td>
          <span
            className="revenue-tooltip"
            tabIndex={0}
            aria-label="Estimated revenue at risk explanation"
          >
            {money(customer.revenueAtRisk)}
            <span role="tooltip">
              Estimated revenue at risk is the eligible forecast revenue for the
              selected period multiplied by the customer&apos;s normalized churn
              probability. It is an estimate, not a guaranteed loss.
            </span>
          </span>
        </td>
        <td>{alert ? badge(customer.risk + " alert") : <span>None</span>}</td>
        <td>{badge(actionLabel(action?.status))}</td>
        <td className={row.overdue ? "overdue-text" : ""}>
          {deadline || "No deadline"}
          {row.overdue && <small> Overdue</small>}
        </td>
        <td>{customer.staff}</td>
        <td>
          <div className="row-actions">
            <a
              className="btn btn-primary"
              href={customerHref(customer)}
              onClick={follow}
            >
              View Customer
            </a>
            <button
              className="btn btn-outline"
              aria-expanded={expanded}
              aria-label={
                (expanded ? "Hide" : "Show") + " details for " + customer.name
              }
              onClick={onToggle}
            >
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="customer-secondary-row">
          <td colSpan={9}>
            <div>
              <span>
                <b>Last conversation:</b>{" "}
                {row.lastConversation
                  ? new Date(row.lastConversation).toLocaleDateString()
                  : "Unavailable"}
              </span>
              <span>
                <b>Sentiment:</b> {customer.sentiment}
              </span>
              <span>
                <b>Consent:</b> {customer.consent ? "Granted" : "Withdrawn"}
              </span>
              <span>
                <b>Preferred channel:</b> {customer.preferredChannel}
              </span>
              <span>
                <b>Status:</b> {customer.status}
              </span>
              <a
                href={customerHref(customer, "conversations")}
                onClick={(event) => follow(event, "conversations")}
              >
                View Conversation
              </a>
              {alert && (
                <a
                  href={customerHref(customer, "alerts")}
                  onClick={(event) => follow(event, "alerts")}
                >
                  Open Alert
                </a>
              )}
              {action && (
                <button onClick={() => go("/actions?actionId=" + action.id)}>
                  View Retention Action
                </button>
              )}
              {!readOnly && (
                <a
                  href={customerHref(customer, "avo-insights")}
                  onClick={(event) => follow(event, "avo-insights")}
                >
                  Ask AVO
                </a>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
function CustomerCard({
  row,
  open,
}: {
  row: ReturnType<typeof operationalCustomerRows>[number];
  open: (customer: Customer, tab?: string) => void;
}) {
  const { customer, alert, action, deadline } = row;
  return (
    <article className="card customer-mobile-card">
      <div className="split">
        <div>
          <h2>{customer.name}</h2>
          <p>{customer.company}</p>
        </div>
        {badge(customer.risk)}
      </div>
      <div className="mobile-customer-facts">
        <span>
          Tier <b>{customer.tier}</b>
        </span>
        <span>
          Estimated revenue at risk <b>{money(customer.revenueAtRisk)}</b>
        </span>
        <span>
          Active alert <b>{alert ? customer.risk : "None"}</b>
        </span>
        <span>
          Next action <b>{actionLabel(action?.status)}</b>
        </span>
        <span>
          Deadline <b>{deadline || "No deadline"}</b>
        </span>
      </div>
      <a
        className="btn btn-primary"
        href={customerHref(customer)}
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
        aria-label={"View Customer " + customer.name}
      >
        View Customer
      </a>
    </article>
  );
}
