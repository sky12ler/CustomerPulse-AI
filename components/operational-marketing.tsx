"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { calculateCampaignAudience } from "@/lib/marketing-operational";
import { useDemoWorkflow } from "./workflow-context";
import { WorkflowGuide } from "./workflow-guide";

const steps = [
  "Segment decline detected",
  "Campaign brief created",
  "Audience selected",
  "Sources selected",
  "Content generated",
  "Campaign reviewed",
  "Campaign approved",
  "Campaign scheduled",
  "Campaign published",
  "Results recorded",
];

export function OperationalMarketing({
  go,
  notify,
}: {
  go: (path: string) => void;
  notify: (message: string) => void;
}) {
  const demo = useDemoWorkflow();
  const [expandedId, setExpandedId] = useState("");
  const [dismissReasons, setDismissReasons] = useState<Record<string, string>>({});
  const [filters, setFilters] = useState({
    region: "All regions",
    industry: "All industries",
    status: "Active",
  });
  const all = demo.state.marketingOpportunities
    .filter((item) => item.datasetId === demo.state.activeWorkspace)
    .sort((a, b) => Number(b.id === "MKT-003") - Number(a.id === "MKT-003") || b.affectedPercentage - a.affectedPercentage);
  const opportunities = all.filter(
    (item) =>
      (filters.region === "All regions" || item.region === filters.region) &&
      (filters.industry === "All industries" || item.industry === filters.industry) &&
      (filters.status === "All statuses" || item.status === filters.status),
  );
  const readOnly = demo.state.role === "Auditor";

  return (
    <div>
      <WorkflowGuide
        title="Marketing intervention"
        steps={steps}
        current={0}
        expected="Calculated operational evidence becomes a consent-filtered, governed campaign."
      />
      <section className="card">
        <div className="card-head">
          <div>
            <span className="eyebrow">Live operational calculation</span>
            <h2>Marketing Intelligence</h2>
          </div>
          <span className="badge medium">{all.length} detected</span>
        </div>
        <p className="subtle">
          Segments are grouped from the active workspace and recalculated after
          imports, AVO analyses, customer responses, and outcomes. No insight is
          displayed when the configured thresholds are not met.
        </p>
        <div className="notice">
          <b>Current trigger criteria:</b> at least four customers in the same
          Region + Industry segment, then any one of: affected customers ≥{" "}
          {demo.state.thresholds.riskSegment}%, revenue decline ≥{" "}
          {demo.state.thresholds.revenue}%, mean purchase-frequency decline ≥{" "}
          {demo.state.thresholds.frequency}%, or engagement decline ≥{" "}
          {demo.state.thresholds.engagement}%. A customer is affected when they
          are High/Critical risk or cross a configured frequency, spending, or
          engagement threshold.
        </div>
        <div className="filter-row">
          <label className="field">
            Region
            <select className="input" aria-label="Marketing region" value={filters.region} onChange={(event) => setFilters({ ...filters, region: event.target.value })}>
              <option>All regions</option>
              {[...new Set(all.map((item) => item.region))].map((value) => <option key={value}>{value}</option>)}
            </select>
          </label>
          <label className="field">
            Industry
            <select className="input" aria-label="Marketing industry" value={filters.industry} onChange={(event) => setFilters({ ...filters, industry: event.target.value })}>
              <option>All industries</option>
              {[...new Set(all.map((item) => item.industry))].map((value) => <option key={value}>{value}</option>)}
            </select>
          </label>
          <label className="field">
            Status
            <select className="input" aria-label="Marketing status" value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
              <option>All statuses</option><option>Active</option><option>Monitoring</option><option>Dismissed</option>
            </select>
          </label>
        </div>
      </section>

      {!opportunities.length && (
        <section className="card empty">
          <h2>No calculated opportunity matches these filters</h2>
          <p>Import sufficient customer and transaction history or review the filters. The system will not manufacture a segment conclusion.</p>
        </section>
      )}

      {opportunities.map((opportunity, opportunityIndex) => {
        const evidenceLabel = (number: number, label: string) =>
          opportunityIndex === 0 ? `${number}. ${label}` : label;
        const affected = demo.dataset.customers.filter((customer) =>
          opportunity.affectedCustomerIds.includes(customer.id),
        );
        const audience = calculateCampaignAudience(
          demo.dataset,
          opportunity,
          ["LinkedIn", "Email"],
        );
        const reason = dismissReasons[opportunity.id] ?? "";
        return (
          <section className="card" key={opportunity.id}>
            <div className="card-head">
              <div>
                <span className="eyebrow">Calculated opportunity · {opportunity.id}</span>
                <h2>{opportunity.title}</h2>
              </div>
              <span className={`badge ${opportunity.confidence.toLowerCase()}`}>{opportunity.confidence} confidence</span>
            </div>
            <div className="insight-grid">
              <article className="evidence"><span className="evidence-id">{evidenceLabel(1, "What changed")}</span><p>{opportunity.affectedPercentage}% ({opportunity.affectedCustomerIds.length}/{opportunity.totalCustomers}) meet a decline or churn-risk threshold.</p></article>
              <article className="evidence"><span className="evidence-id">{evidenceLabel(2, "Who is affected")}</span><p>{opportunity.region} · {opportunity.industry} · {opportunity.affectedCustomerIds.length} affected customers.</p></article>
              <article className="evidence"><span className="evidence-id">{evidenceLabel(3, "Revenue at risk")}</span><p>Eligible 90-day revenue run-rate changed from RM {opportunity.baselineRevenue.toLocaleString()} to RM {opportunity.currentRevenue.toLocaleString()}.</p></article>
              <article className="evidence"><span className="evidence-id">{evidenceLabel(4, "Likely drivers")}</span><p>Revenue decline {opportunity.revenueDecline}%; frequency decline {opportunity.frequencyDecline}%; engagement decline {opportunity.engagementDecline}%.</p></article>
              <article className="evidence"><span className="evidence-id">{evidenceLabel(5, "Supporting evidence")}</span><p>{opportunity.evidence.join(" · ")}</p></article>
              <article className="evidence"><span className="evidence-id">{evidenceLabel(6, "Recommended intervention")}</span><p>Create an editable, approved value-education campaign for the consented audience.</p></article>
              <article className="evidence"><span className="evidence-id">{evidenceLabel(7, "Consent-safe audience preview")}</span><p>{audience.includedCustomerIds.length} included; {audience.exclusions.length} excluded from {audience.total}. The final audience recalculates for campaign channels.</p></article>
              <article className="evidence"><span className="evidence-id">{evidenceLabel(8, "Confidence")}</span><p>{opportunity.confidence} · {opportunity.calculationVersion}</p></article>
              <article className="evidence"><span className="evidence-id">{evidenceLabel(9, "Provenance")}</span><p>{opportunity.baselinePeriod} vs {opportunity.currentPeriod} · calculated {new Date(opportunity.calculatedAt).toLocaleString()}</p></article>
              <article className="evidence"><span className="evidence-id">{evidenceLabel(10, "Uncertainty")}</span><p>{opportunity.uncertainty} {opportunityIndex === 0 ? "Correlation is not causation." : "Causality is not established."}</p></article>
            </div>
            <div className="top-actions">
              <button className="btn btn-outline" onClick={() => setExpandedId(expandedId === opportunity.id ? "" : opportunity.id)}>{opportunityIndex === 0 ? "View affected customers" : `View customers for ${opportunity.id}`}</button>
              <button className="btn btn-primary" disabled={readOnly || opportunity.status === "Dismissed"} title={readOnly ? "Auditor access is read-only" : opportunity.status === "Dismissed" ? "Dismissed opportunities cannot start campaigns" : ""} onClick={() => {
                try {
                  demo.openCampaignFromOpportunity(opportunity.id);
                  go(`campaign-studio?triggerId=${opportunity.id}&step=1`);
                } catch (error) {
                  notify(error instanceof Error ? error.message : "Campaign creation failed");
                }
              }}><Sparkles size={14} /> {opportunityIndex === 0 ? "Create campaign with AVO" : `Create campaign for ${opportunity.id}`}</button>
              <button className="btn btn-outline" disabled={readOnly} title={readOnly ? "Auditor access is read-only" : "Re-evaluate this insight after future operational changes"} onClick={() => { demo.setOpportunityStatus(opportunity.id, "Monitoring"); notify(`${opportunity.id} is now monitored`); }}>Monitor insight</button>
              <input aria-label={`Dismissal reason ${opportunity.id}`} className="input compact" placeholder="Reason required to dismiss" value={reason} onChange={(event) => setDismissReasons({ ...dismissReasons, [opportunity.id]: event.target.value })} />
              <button className="btn btn-outline" disabled={readOnly || !reason.trim()} title={!reason.trim() ? "Dismissal reason is required" : readOnly ? "Auditor access is read-only" : ""} onClick={() => { demo.setOpportunityStatus(opportunity.id, "Dismissed", reason); notify(`${opportunity.id} dismissed and audited`); }}>Dismiss trigger</button>
            </div>
            {expandedId === opportunity.id && (
              <div className="table-wrap">
                <table className="table"><thead><tr><th>Customer</th><th>Tier</th><th>Risk</th><th>Revenue at risk</th><th>Consent</th></tr></thead><tbody>
                  {affected.map((customer) => <tr key={customer.id}><td><a href={`/customers/${customer.id}`}>{customer.id} · {customer.name}</a></td><td>{customer.tier}</td><td>{customer.risk}</td><td>RM {customer.revenueAtRisk.toLocaleString()}</td><td>{customer.consent ? "Granted" : "Excluded"}</td></tr>)}
                </tbody></table>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
