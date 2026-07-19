"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { customers } from "@/lib/demo-data";
import type { CampaignDraft, ScheduledPostRecord } from "@/lib/demo-workflow";
import type { Role } from "@/lib/types";
import { useDemoWorkflow } from "./workflow-context";
import { WorkflowGuide } from "./workflow-guide";

const badge = (value: string) => (
  <span className={`badge ${value.toLowerCase().replaceAll(" ", "-")}`}>
    {value}
  </span>
);
const marketingSteps = [
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
const wizardSteps = [
  "Brief",
  "Audience",
  "Sources",
  "Content",
  "Review",
  "Approval",
  "Schedule",
];

export function MarketingV2({
  go,
  notify,
}: {
  go: (path: string) => void;
  notify: (message: string) => void;
}) {
  const demo = useDemoWorkflow();
  const [showCustomers, setShowCustomers] = useState(false);
  const [dismissReason, setDismissReason] = useState("");
  const [filters, setFilters] = useState({
    date: "Last 30 days",
    comparison: "Previous 30 days",
    tier: "All tiers",
    region: "North",
    industry: "Food & Beverage",
    product: "All products",
    risk: "High and Critical",
  });
  const affected = customers
    .filter(
      (customer) =>
        filters.region === "All regions" || customer.region === filters.region,
    )
    .slice(0, 4);
  const launch = () => {
    demo.updateCampaign({
      triggerId: "MKT-003",
      step: 1,
      name: "North value clarity",
      objective:
        "Re-engage North food and beverage customers with approved product value education",
      segment: "North · Food & Beverage",
      totalAudience: 12,
      consentedAudience: 8,
      excludedAudience: 4,
      sources: [
        "product-catalogue.pdf · page 1",
        "marketing-guidelines.pdf · page 1",
        "MKT-003 aggregate evidence",
      ],
    });
    demo.log(
      "Marketing trigger opened in Campaign Studio",
      "MKT-003",
      "Draft created",
    );
    go("campaign-studio?triggerId=MKT-003&step=1");
  };
  const dismiss = () => {
    if (!dismissReason.trim()) return notify("Dismissal reason is required");
    demo.update((current) => ({
      ...current,
      dismissedTriggers: [...current.dismissedTriggers, "MKT-003"],
    }));
    demo.log(
      "Marketing trigger dismissed",
      "MKT-003",
      "Dismissed",
      dismissReason,
    );
    notify("Trigger dismissed with reason and audit event created");
  };
  return (
    <div>
      <WorkflowGuide
        title="Marketing intervention"
        steps={marketingSteps}
        current={0}
        expected="A consent-filtered, evidence-grounded campaign is reviewed, approved and scheduled."
      />
      <section className="card">
        <div className="filter-row">
          {Object.entries(filters).map(([key, value]) => (
            <label className="field" key={key}>
              {key.replaceAll("_", " ")}
              <select
                className="input"
                aria-label={`Marketing ${key}`}
                value={value}
                onChange={(event) =>
                  setFilters({ ...filters, [key]: event.target.value })
                }
              >
                <option>{value}</option>
                <option>{key === "region" ? "All regions" : "All"}</option>
              </select>
            </label>
          ))}
        </div>
      </section>
      <section className="card">
        <div className="card-head">
          <div>
            <span className="eyebrow">AVO Marketing Insight · MKT-003</span>
            <h2>North Food & Beverage decline</h2>
          </div>
          {badge("Medium confidence")}
        </div>
        <div className="insight-grid">
          {[
            [
              "1. What changed",
              "33% of North Food & Beverage customers are High or Critical Risk.",
            ],
            [
              "2. Who is affected",
              "Four consented customers represent RM 46,000 in revenue at risk.",
            ],
            [
              "3. Revenue at risk",
              "RM 46,000 calculated estimate across the filtered segment.",
            ],
            [
              "4. Likely drivers",
              "Purchase frequency −24%, revenue −18%, engagement −29%, and five price-value conversations.",
            ],
            [
              "5. Supporting evidence",
              "Transaction aggregates, campaign-result aggregates, and five valid message IDs.",
            ],
            [
              "6. Recommended intervention",
              "Create a value-education campaign grounded in approved product documentation.",
            ],
            [
              "7. What staff should avoid",
              "Do not invent discounts, guaranteed savings, or causal claims.",
            ],
            [
              "8. Expected outcome",
              "Improve product understanding and invite re-engagement; this is not guaranteed.",
            ],
            [
              "9. Confidence",
              "Medium. Multiple sources agree on decline direction.",
            ],
            [
              "10. Uncertainty",
              "Price concerns are observed, but other factors may contribute; correlation is not causation.",
            ],
            [
              "11. Recommended timeframe",
              "Review and launch an approved response within seven days.",
            ],
          ].map(([title, text]) => (
            <article className="evidence" key={title}>
              <span className="evidence-id">{title}</span>
              <p>{text}</p>
            </article>
          ))}
        </div>
        <div className="top-actions">
          <button
            className="btn btn-outline"
            onClick={() => setShowCustomers((value) => !value)}
          >
            View affected customers
          </button>
          <button className="btn btn-primary" onClick={launch}>
            <Sparkles size={14} /> Create campaign with AVO
          </button>
          <input
            aria-label="Dismissal reason"
            className="input compact"
            placeholder="Reason required to dismiss"
            value={dismissReason}
            onChange={(event) => setDismissReason(event.target.value)}
          />
          <button
            className="btn btn-outline"
            disabled={!dismissReason.trim()}
            title={!dismissReason.trim() ? "Dismissal reason is required" : ""}
            onClick={dismiss}
          >
            Dismiss trigger
          </button>
        </div>
        {showCustomers && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Tier</th>
                  <th>Risk</th>
                  <th>Revenue at risk</th>
                </tr>
              </thead>
              <tbody>
                {affected.map((customer) => (
                  <tr key={customer.id}>
                    <td>
                      {customer.id} · {customer.name}
                    </td>
                    <td>{customer.tier}</td>
                    <td>{customer.risk}</td>
                    <td>RM {customer.revenueAtRisk.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export function CampaignStudioV2({
  role,
  notify,
  go,
}: {
  role: Role;
  notify: (message: string) => void;
  go: (path: string) => void;
}) {
  const demo = useDemoWorkflow();
  const campaign = demo.state.campaign;
  const queryStep = Number(
    new URLSearchParams(
      typeof window === "undefined" ? "" : window.location.search,
    ).get("step"),
  );
  const [step, setStep] = useState(
    queryStep >= 1 && queryStep <= 7 ? queryStep : campaign.step,
  );
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [approvalComment, setApprovalComment] = useState(
    campaign.reviewerComment,
  );
  const patch = (value: Partial<CampaignDraft>) => demo.updateCampaign(value);
  const missing = validateStep(step, campaign);
  const move = (next: number) => {
    const issue = validateStep(step, campaign);
    if (next > step && issue) return setError(issue);
    setError("");
    setStep(next);
    patch({ step: next });
    window.history.replaceState(
      {},
      "",
      `/campaign-studio?campaignId=${campaign.id}&step=${next}`,
    );
  };
  const save = () => {
    patch({ step });
    demo.log("Campaign draft saved", campaign.id, `Step ${step}`);
    notify(`Campaign draft saved at ${wizardSteps[step - 1]}`);
  };
  const generate = () => {
    const version = campaign.versions.length + 1;
    patch({
      generated: true,
      versions: [
        ...campaign.versions,
        { version, at: new Date().toISOString(), content: campaign.content },
      ],
    });
    demo.log(
      version === 1
        ? "AVO campaign content generated"
        : "AVO campaign content regenerated",
      campaign.id,
      `Version ${version}`,
    );
    setSuccess(`Content version ${version} generated from approved sources.`);
  };
  const submit = () => {
    const confirmations = Object.values(campaign.confirmations).filter(
      Boolean,
    ).length;
    if (confirmations < 6)
      return setError(
        "All six review confirmations are required before submission.",
      );
    patch({
      status: "Pending Approval",
      reviewerComment: approvalComment,
      approvalHistory: [
        ...campaign.approvalHistory,
        {
          status: "Pending Approval",
          actor: campaign.requester,
          role: "Marketing Specialist",
          comment: "Submitted to Marketing Manager",
          at: new Date().toISOString(),
        },
      ],
    });
    demo.log(
      "Campaign submitted for approval",
      campaign.id,
      "Pending Approval",
    );
    setSuccess("Campaign submitted to Marketing Manager for approval.");
  };
  const decide = (decision: "Approved" | "Rejected" | "Changes Requested") => {
    const actorName =
      role === "Administrator" ? "Demo Administrator" : "Mina Lee";
    if (role !== "Marketing Manager" && role !== "Administrator")
      return setError("Marketing Manager or Administrator role is required.");
    if (actorName === campaign.requester)
      return setError(
        "Self-approval is forbidden. Switch to a different authorised reviewer.",
      );
    if (campaign.status !== "Pending Approval")
      return setError("Submit the campaign for approval first.");
    if (!approvalComment.trim())
      return setError("Reviewer comment is required.");
    patch({
      status: decision,
      reviewerComment: approvalComment,
      approvalHistory: [
        ...campaign.approvalHistory,
        {
          status: decision,
          actor: actorName,
          role,
          comment: approvalComment,
          at: new Date().toISOString(),
        },
      ],
    });
    demo.log(
      `Campaign ${decision.toLowerCase()}`,
      campaign.id,
      decision,
      approvalComment,
    );
    setSuccess(
      decision === "Approved"
        ? "Campaign approved and ready to schedule."
        : `Campaign ${decision}.`,
    );
  };
  const schedule = async () => {
    setError("");
    if (campaign.status !== "Approved")
      return setError(
        "Schedule is unavailable because campaign approval is pending.",
      );
    if (
      !campaign.channels.length ||
      !campaign.scheduleDate ||
      !campaign.scheduleTime ||
      !campaign.timeZone
    )
      return setError(
        "Publisher, channels, date, time and time zone are required.",
      );
    try {
      const posts: ScheduledPostRecord[] = [];
      for (const channel of campaign.channels) {
        const response = await fetch("/api/publish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            campaignId: campaign.id,
            channelId: `demo-${channel.toLowerCase()}`,
            text:
              campaign.content[`${channel.toLowerCase()}Caption`] ??
              campaign.content.email ??
              campaign.objective,
            dueAt: `${campaign.scheduleDate}T${campaign.scheduleTime}:00+08:00`,
            approved: true,
            idempotencyKey: `${campaign.id}-${channel}-${campaign.scheduleDate}-${campaign.scheduleTime}`,
          }),
        });
        const data = await response.json();
        if (!response.ok || data.error)
          throw new Error(data.error || `Publishing ${channel} failed`);
        posts.push({
          datasetId: demo.state.activeWorkspace,
          sourceType: data.simulated
            ? "Demo Publisher"
            : "External Integration",
          id: `POST-${campaign.id}-${channel.toUpperCase()}`,
          campaignId: campaign.id,
          campaignName: campaign.name,
          channel,
          date: campaign.scheduleDate,
          time: campaign.scheduleTime,
          timeZone: campaign.timeZone,
          status: "Scheduled",
          provider: data.simulated ? "Demo Publisher" : "Buffer",
          approver:
            campaign.approvalHistory.findLast(
              (item) => item.status === "Approved",
            )?.actor ?? "Approved",
          publisherId: data.id,
          triggerId: campaign.triggerId,
          owner: campaign.requester,
        });
      }
      demo.addScheduledPosts(posts);
      setSuccess("Campaign scheduled successfully.");
      notify("Campaign scheduled successfully.");
      go(`campaign-calendar?campaignId=${campaign.id}&scheduled=1`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Scheduling failed");
    }
  };
  return (
    <div>
      <WorkflowGuide
        title="Campaign creation"
        steps={wizardSteps}
        current={step - 1}
        missing={error || missing}
        expected={
          step === 7
            ? "One publisher record is created per approved channel and appears in the shared calendar."
            : "Complete and save this stage before continuing."
        }
      />
      <section className="card campaign-wizard">
        <div className="card-head">
          <div>
            <span className="eyebrow">
              {campaign.id} · Step {step} of 7
            </span>
            <h2>{wizardSteps[step - 1]}</h2>
          </div>
          {badge(campaign.status)}
        </div>
        {success && (
          <div className="notice success" role="status">
            {success}
          </div>
        )}
        {error && (
          <div className="notice danger" role="alert">
            {error}
          </div>
        )}
        <WizardStep
          step={step}
          campaign={campaign}
          patch={patch}
          generate={generate}
          approvalComment={approvalComment}
          setApprovalComment={setApprovalComment}
          submit={submit}
          decide={decide}
          schedule={schedule}
          go={go}
        />
        <div className="wizard-actions">
          {step > 1 && (
            <button className="btn btn-outline" onClick={() => move(step - 1)}>
              Back
            </button>
          )}
          <button className="btn btn-outline" onClick={save}>
            Save Draft
          </button>
          {step < 7 && (
            <button
              className="btn btn-primary"
              disabled={Boolean(missing)}
              title={missing}
              onClick={() => move(step + 1)}
            >
              Continue
            </button>
          )}
          {missing && (
            <span className="validation-help">
              Continue is unavailable because {missing}
            </span>
          )}
        </div>
      </section>
    </div>
  );
}

function validateStep(step: number, campaign: CampaignDraft) {
  if (
    step === 1 &&
    (!campaign.name.trim() ||
      !campaign.objective.trim() ||
      !campaign.problem.trim() ||
      !campaign.expectedOutcome.trim() ||
      !campaign.channels.length ||
      !campaign.startDate ||
      !campaign.endDate)
  )
    return "campaign name, objective, problem, expected outcome, channels and dates are required.";
  if (
    step === 2 &&
    (!campaign.segment.trim() || campaign.consentedAudience < 1)
  )
    return "a segment and at least one consented audience member are required.";
  if (step === 3 && !campaign.sources.length)
    return "no approved source document is selected.";
  if (step === 4 && !campaign.generated)
    return "AVO content must be generated and factually reviewed.";
  if (
    step === 5 &&
    Object.values(campaign.confirmations).filter(Boolean).length < 6
  )
    return "all six review confirmations are required.";
  if (step === 6 && campaign.status !== "Approved")
    return "campaign approval is required before scheduling.";
  return "";
}

function WizardStep({
  step,
  campaign,
  patch,
  generate,
  approvalComment,
  setApprovalComment,
  submit,
  decide,
  schedule,
  go,
}: {
  step: number;
  campaign: CampaignDraft;
  patch: (value: Partial<CampaignDraft>) => void;
  generate: () => void;
  approvalComment: string;
  setApprovalComment: (value: string) => void;
  submit: () => void;
  decide: (value: "Approved" | "Rejected" | "Changes Requested") => void;
  schedule: () => void;
  go: (path: string) => void;
}) {
  const field = (key: keyof CampaignDraft, label: string, type = "text") => (
    <label className="field">
      {label}
      <input
        className="input"
        aria-label={label}
        type={type}
        value={String(campaign[key])}
        onChange={(event) => patch({ [key]: event.target.value })}
      />
    </label>
  );
  if (step === 1)
    return (
      <div>
        <div className="notice">
          Prefilled from marketing trigger {campaign.triggerId}. Edit the brief
          before continuing.
        </div>
        <div className="grid two">
          {field("name", "Campaign name")}
          {field("objective", "Objective")}
          {field("problem", "Problem")}
          {field("expectedOutcome", "Expected outcome")}
          {field("startDate", "Start date", "date")}
          {field("endDate", "End date", "date")}
        </div>
        <fieldset>
          <legend>Channels</legend>
          {["LinkedIn", "Instagram", "Facebook", "Email", "WhatsApp"].map(
            (channel) => (
              <label className="check" key={channel}>
                <input
                  type="checkbox"
                  checked={campaign.channels.includes(channel)}
                  onChange={(event) =>
                    patch({
                      channels: event.target.checked
                        ? [...campaign.channels, channel]
                        : campaign.channels.filter(
                            (value) => value !== channel,
                          ),
                    })
                  }
                />{" "}
                {channel}
              </label>
            ),
          )}
        </fieldset>
        <button
          className="btn btn-outline"
          onClick={() => go(`marketing?triggerId=${campaign.triggerId}`)}
        >
          View Trigger
        </button>
      </div>
    );
  if (step === 2)
    return (
      <div>
        <div className="grid two">
          {field("segment", "Segment")}
          <Metric
            label="Estimated audience size"
            value={String(campaign.consentedAudience)}
          />
          <Metric
            label="Total audience"
            value={String(campaign.totalAudience)}
          />
          <Metric
            label="Consented audience"
            value={String(campaign.consentedAudience)}
          />
          <Metric
            label="Excluded audience"
            value={String(campaign.excludedAudience)}
          />
          <Metric
            label="Exclusion reasons"
            value="Withdrawn or missing channel consent"
          />
        </div>
        <h3>Audience preview</h3>
        {customers
          .filter((item) => item.region === "North")
          .slice(0, 4)
          .map((item) => (
            <div className="evidence" key={item.id}>
              {item.id} · {item.name} · {item.tier} · {item.risk}
            </div>
          ))}
      </div>
    );
  if (step === 3)
    return (
      <div>
        <div className="notice">
          Only approved, authorised sources may ground generated content.
        </div>
        {[
          "product-catalogue.pdf · page 1",
          "marketing-guidelines.pdf · page 1",
          "Product records · Inventory Optimizer",
          "Campaign asset · existing-campaign.png",
          "MKT-003 aggregate evidence",
        ].map((source) => (
          <label className="evidence check" key={source}>
            <input
              type="checkbox"
              checked={campaign.sources.includes(source)}
              onChange={(event) =>
                patch({
                  sources: event.target.checked
                    ? [...campaign.sources, source]
                    : campaign.sources.filter((value) => value !== source),
                })
              }
            />{" "}
            {source}
            <small> · Approved · preview available</small>
          </label>
        ))}
        <button className="btn btn-outline" onClick={() => go("imports")}>
          Authorised upload
        </button>
      </div>
    );
  if (step === 4)
    return (
      <div>
        <div className="top-actions">
          <button className="btn btn-primary" onClick={generate}>
            {campaign.generated
              ? "Regenerate content"
              : "Generate content with AVO"}
          </button>
          <button
            className="btn btn-outline"
            disabled={campaign.versions.length < 2}
            title={
              campaign.versions.length < 2
                ? "Generate another version to compare"
                : ""
            }
          >
            Compare versions ({campaign.versions.length})
          </button>
          <button className="btn btn-outline">View evidence</button>
        </div>
        <div className="notice">
          Factual validation: content is restricted to selected approved
          sources. No discount or guarantee was generated.
        </div>
        {Object.entries(campaign.content).map(([key, value]) => (
          <label className="field" key={key}>
            {key.replaceAll(/([A-Z])/g, " $1")}
            <textarea
              className="input"
              rows={key === "email" || key === "landingPage" ? 5 : 3}
              value={value}
              onChange={(event) =>
                patch({
                  content: { ...campaign.content, [key]: event.target.value },
                })
              }
            />
          </label>
        ))}
      </div>
    );
  if (step === 5) {
    const checks = [
      "Audience reviewed",
      "Consent reviewed",
      "Sources reviewed",
      "Content reviewed",
      "Claims reviewed",
      "Schedule reviewed",
    ];
    return (
      <div>
        <div className="grid two">
          <Metric label="Objective" value={campaign.objective} />
          <Metric
            label="Audience"
            value={`${campaign.consentedAudience} consented · ${campaign.excludedAudience} excluded`}
          />
          <Metric
            label="Sources"
            value={`${campaign.sources.length} approved`}
          />
          <Metric
            label="Validation"
            value="Consent, factual and policy checks passed"
          />
          <Metric label="Confidence" value="Medium" />
          <Metric
            label="Uncertainty"
            value="Engagement outcome is not guaranteed"
          />
        </div>
        <h3>Required confirmations</h3>
        {checks.map((check) => (
          <label className="check evidence" key={check}>
            <input
              type="checkbox"
              checked={campaign.confirmations[check] ?? false}
              onChange={(event) =>
                patch({
                  confirmations: {
                    ...campaign.confirmations,
                    [check]: event.target.checked,
                  },
                })
              }
            />{" "}
            {check}
          </label>
        ))}
      </div>
    );
  }
  if (step === 6)
    return (
      <div>
        <p>
          <b>Requester:</b> {campaign.requester} · <b>Reviewer:</b> Marketing
          Manager
        </p>
        <label className="field">
          Reviewer comment
          <input
            aria-label="Campaign reviewer comment"
            className="input"
            value={approvalComment}
            onChange={(event) => setApprovalComment(event.target.value)}
          />
        </label>
        <div className="top-actions">
          <button
            className="btn btn-primary"
            disabled={
              campaign.status !== "Draft" &&
              campaign.status !== "Changes Requested"
            }
            onClick={submit}
          >
            Submit for Approval
          </button>
          <button
            className="btn btn-primary"
            disabled={
              campaign.status !== "Pending Approval" || !approvalComment.trim()
            }
            title={
              !approvalComment.trim()
                ? "Reviewer comment is required"
                : campaign.status !== "Pending Approval"
                  ? "Submit campaign first"
                  : ""
            }
            onClick={() => decide("Approved")}
          >
            Approve
          </button>
          <button
            className="btn btn-danger"
            disabled={
              campaign.status !== "Pending Approval" || !approvalComment.trim()
            }
            onClick={() => decide("Rejected")}
          >
            Reject
          </button>
          <button
            className="btn btn-outline"
            disabled={
              campaign.status !== "Pending Approval" || !approvalComment.trim()
            }
            onClick={() => decide("Changes Requested")}
          >
            Request Changes
          </button>
        </div>
        <h3>Approval timeline</h3>
        {campaign.approvalHistory.map((item, index) => (
          <div className="evidence" key={`${item.at}-${index}`}>
            <b>
              {item.status} · {item.actor}
            </b>
            <div>{item.comment}</div>
            <small>{item.at}</small>
          </div>
        ))}
      </div>
    );
  return (
    <div>
      <div className="grid two">
        <label className="field">
          Publisher
          <select
            className="input"
            value={campaign.publisher}
            onChange={(event) =>
              patch({
                publisher: event.target.value as CampaignDraft["publisher"],
              })
            }
          >
            <option>Demo Publisher</option>
            <option>Buffer</option>
          </select>
        </label>
        {field("scheduleDate", "Schedule date", "date")}
        {field("scheduleTime", "Schedule time", "time")}
        <label className="field">
          Time zone
          <select
            className="input"
            value={campaign.timeZone}
            onChange={(event) => patch({ timeZone: event.target.value })}
          >
            <option>Asia/Kuala_Lumpur</option>
            <option>UTC</option>
          </select>
        </label>
      </div>
      <div className="notice">
        <b>Final preview:</b> {campaign.name} · {campaign.channels.join(", ")} ·{" "}
        {campaign.scheduleDate} {campaign.scheduleTime} {campaign.timeZone}
      </div>
      <button
        className="btn btn-primary"
        disabled={campaign.status !== "Approved"}
        title={
          campaign.status !== "Approved"
            ? "Schedule is unavailable because campaign approval is pending"
            : ""
        }
        onClick={schedule}
      >
        Schedule Campaign
      </button>
      {campaign.status !== "Approved" && (
        <p className="validation-help">
          Schedule is unavailable because campaign approval is pending.
        </p>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-mini">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function CalendarV2({
  go,
  notify,
}: {
  go: (path: string) => void;
  notify: (message: string) => void;
}) {
  const demo = useDemoWorkflow();
  const query = new URLSearchParams(
    typeof window === "undefined" ? "" : window.location.search,
  );
  const queryId = query.get("campaignId");
  const [view, setView] = useState("Month");
  const [status, setStatus] = useState("All statuses");
  const [channel, setChannel] = useState("All channels");
  const [selected, setSelected] = useState(
    queryId ?? demo.state.scheduledPosts[0]?.campaignId,
  );
  const posts = demo.state.scheduledPosts.filter(
    (item) =>
      (status === "All statuses" || item.status === status) &&
      (channel === "All channels" || item.channel === channel),
  );
  const selectedPosts = posts.filter((item) => item.campaignId === selected);
  const updatePost = (next: "Scheduled" | "Cancelled") => {
    demo.update((current) => ({
      ...current,
      scheduledPosts: current.scheduledPosts.map((item) =>
        item.campaignId === selected ? { ...item, status: next } : item,
      ),
    }));
    demo.log(
      `Scheduled post ${next.toLowerCase()}`,
      selected ?? "campaign",
      next,
    );
    notify(`Campaign ${next.toLowerCase()} and audited`);
  };
  return (
    <div>
      {query.get("scheduled") && (
        <div className="notice success" role="status">
          Campaign scheduled successfully. {queryId} is highlighted and its
          publisher details are open.
        </div>
      )}
      <section className="card">
        <div className="card-head">
          <h2>Campaign Calendar</h2>
          <div className="tabs">
            {["Month", "Week", "List"].map((item) => (
              <button
                className={`tab ${view === item ? "active" : ""}`}
                onClick={() => setView(item)}
                key={item}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        <div className="filter-row">
          <select
            aria-label="Calendar status"
            className="input"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option>All statuses</option>
            {[
              "Draft",
              "Pending Approval",
              "Changes Requested",
              "Approved",
              "Scheduled",
              "Published",
              "Failed",
              "Cancelled",
            ].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <select
            aria-label="Calendar channel"
            className="input"
            value={channel}
            onChange={(event) => setChannel(event.target.value)}
          >
            <option>All channels</option>
            {["LinkedIn", "Instagram", "Facebook", "Email", "WhatsApp"].map(
              (item) => (
                <option key={item}>{item}</option>
              ),
            )}
          </select>
          <input
            className="input"
            aria-label="Calendar campaign filter"
            placeholder="Campaign"
          />
          <input
            className="input"
            aria-label="Calendar owner filter"
            placeholder="Owner"
          />
          <input
            className="input"
            aria-label="Calendar date filter"
            type="date"
          />
        </div>
        <div className={`calendar-view ${view.toLowerCase()}`}>
          {posts.map((post) => (
            <button
              className={`calendar-record ${post.campaignId === selected ? "record-highlight" : ""}`}
              key={post.id}
              onClick={() => setSelected(post.campaignId)}
            >
              <b>{post.campaignName}</b>
              <span>
                {post.channel} · {post.date} {post.time}
              </span>
              {badge(post.status)}
            </button>
          ))}
        </div>
      </section>
      {selectedPosts.length > 0 && (
        <section className="card">
          <div className="card-head">
            <h2>{selected} · Scheduled posts</h2>
            {badge(selectedPosts[0].status)}
          </div>
          {selectedPosts.map((post) => (
            <div className="evidence" key={post.id}>
              <b>
                {post.id} · {post.channel}
              </b>
              <p>
                {post.date} {post.time} · {post.timeZone}
              </p>
              <p>
                Provider: {post.provider} · Publisher ID: {post.publisherId} ·
                Approver: {post.approver}
              </p>
              <p>
                Marketing trigger: {post.triggerId} · Owner: {post.owner}
              </p>
            </div>
          ))}
          <h3>Approval history</h3>
          {demo.state.campaign.approvalHistory.map((item, index) => (
            <div className="evidence" key={`${item.at}-${index}`}>
              {item.status} · {item.actor} · {item.comment}
            </div>
          ))}
          <div className="top-actions">
            <button
              className="btn btn-outline"
              onClick={() => updatePost("Scheduled")}
            >
              Reschedule
            </button>
            <button
              className="btn btn-danger"
              onClick={() => updatePost("Cancelled")}
            >
              Cancel
            </button>
            <button
              className="btn btn-outline"
              disabled={!selectedPosts.some((item) => item.status === "Failed")}
              title={
                !selectedPosts.some((item) => item.status === "Failed")
                  ? "Retry is available only for failed publishing"
                  : ""
              }
            >
              Retry failed publishing
            </button>
            <button
              className="btn btn-outline"
              onClick={() =>
                go(`campaign-studio?campaignId=${selected}&step=7`)
              }
            >
              View campaign
            </button>
            <button
              className="btn btn-outline"
              onClick={() => go(`analytics?campaign=${selected}`)}
            >
              View analytics
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

export function AnalyticsV2({ go }: { go: (path: string) => void }) {
  const demo = useDemoWorkflow();
  const customers = demo.dataset.customers;
  const [filters, setFilters] = useState({
    date: "Last 30 days",
    comparison: "Previous 30 days",
    tier: "All tiers",
    region: "All regions",
    channel: "All channels",
    action: "All actions",
    campaign: "All campaigns",
  });
  const filtered = customers.filter(
    (item) =>
      (filters.tier === "All tiers" || item.tier === filters.tier) &&
      (filters.region === "All regions" || item.region === filters.region),
  );
  const atRisk = filtered.filter(
    (item) => item.risk === "High" || item.risk === "Critical",
  );
  const revenue = atRisk.reduce((sum, item) => sum + item.revenueAtRisk, 0);
  const average = filtered.length
    ? Math.round(
        filtered.reduce((sum, item) => sum + item.riskScore, 0) /
          filtered.length,
      )
    : 0;
  const omar = customers.find((item) => item.name === "Omar Aziz");
  const omarCalculation = omar
    ? demo.dataset.churnCalculations[omar.id]
    : undefined;
  const omarOutcome = omar
    ? [...demo.dataset.outcomes]
        .reverse()
        .find((item) => item.customerId === omar.id)
    : undefined;
  const insights = [
    [
      `${omarOutcome ? "Successful recovery" : "Recovery monitoring"} · Omar Aziz`,
      omarOutcome ? "Observed data" : "Calculated state",
      `Risk recalculated to ${omar?.risk ?? "Unavailable"} · ${omar?.riskScore ?? 0}`,
      omarOutcome
        ? `${omarOutcome.type} recorded · score change ${omarCalculation?.scoreChange ?? 0}`
        : "No new outcome recorded in this session",
      omarOutcome ? "Recovered customer" : "Monitored customer",
      omarOutcome ? "View recorded outcome" : "Open retention action",
      omarCalculation?.confidence && omarCalculation.confidence >= 80
        ? "High"
        : "Medium",
    ],
    [
      "Most important positive change",
      "Observed data",
      `${demo.state.actions.filter((item) => item.status === "Completed").length} completed recovery actions`,
      "vs previous period",
      "Strategic customers",
      "Review completed outcomes",
      "High",
    ],
    [
      "Most important negative change",
      "Observed data",
      "−18% segment revenue",
      "vs previous period",
      "North Food & Beverage",
      "Open MKT-003",
      "High",
    ],
    [
      "Largest churn driver",
      "AVO interpretation",
      "Unresolved service follow-up",
      "5 evidence-linked messages",
      "Critical-risk customers",
      "Review conversations",
      "Medium",
    ],
    [
      "Highest-risk segment",
      "Calculated estimate",
      `${atRisk.length} High/Critical`,
      `${filtered.length} filtered customers`,
      filters.region,
      "Prioritise governed outreach",
      "High",
    ],
    [
      "Most effective retention action",
      "Observed data",
      "Service recovery",
      `${demo.dataset.outcomes.filter((item) => ["Customer retained", "Complaint resolved", "Purchase completed"].includes(item.type)).length} positive recorded outcomes`,
      "Strategic",
      "Reuse approved playbook",
      "Medium",
    ],
    [
      "Best-performing marketing channel",
      "Observed data",
      "Email",
      "+8 percentage points engagement",
      "Consented audience",
      "Test approved email content",
      "Medium",
    ],
    [
      "Approval bottleneck",
      "Calculated estimate",
      `${demo.state.actions.filter((item) => item.status === "Pending Approval").length} pending reviews`,
      "median wait 1.5 days",
      "Sales queue",
      "Allocate reviewer coverage",
      "High",
    ],
    [
      "AVO governance concern",
      "AVO interpretation",
      `${demo.dataset.signals.filter((item) => item.validationStatus === "Staff Review Required").length} staff-review signals`,
      "staff review required",
      "All segments",
      "Inspect evidence before decisions",
      "Medium",
    ],
    [
      "Recommended management response",
      "Recommendation",
      "Resolve approval queue and North decline",
      "two governed workflows",
      filters.region,
      "Open linked records",
      "Medium",
    ],
  ];
  return (
    <div>
      <section className="card">
        <div className="filter-row">
          {Object.entries(filters).map(([key, value]) => (
            <label className="field" key={key}>
              {key}
              <select
                className="input"
                aria-label={`Analytics ${key}`}
                value={value}
                onChange={(event) =>
                  setFilters({ ...filters, [key]: event.target.value })
                }
              >
                <option>{value}</option>
                {key === "tier" &&
                  ["Strategic", "Core", "Growth", "Standard"].map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                {key === "region" &&
                  ["North", "Central", "South"].map((item) => (
                    <option key={item}>{item}</option>
                  ))}
              </select>
            </label>
          ))}
        </div>
      </section>
      <section className="card">
        <div className="card-head">
          <h2>Management Insights</h2>
          <span className="demo-label">
            Filters update KPIs, insights and table
          </span>
        </div>
        <div className="insight-grid">
          {insights.map(
            ([
              title,
              label,
              metric,
              comparison,
              segment,
              action,
              confidence,
            ]) => (
              <article className="evidence" key={title}>
                <span className="evidence-id">{label}</span>
                <h3>{title}</h3>
                <p>
                  {metric} · {comparison}
                </p>
                <small>
                  Affected: {segment} · Confidence: {confidence}. This does not
                  establish causation.
                </small>
                <div>
                  <button
                    className="btn btn-outline"
                    onClick={() =>
                      go(
                        title.includes("marketing") || title.includes("segment")
                          ? "marketing"
                          : "actions",
                      )
                    }
                  >
                    {action}
                  </button>
                </div>
              </article>
            ),
          )}
        </div>
      </section>
      <div className="grid stats">
        <Metric label="Filtered customers" value={String(filtered.length)} />
        <Metric label="High / Critical risk" value={String(atRisk.length)} />
        <Metric
          label="Revenue at risk"
          value={`RM ${revenue.toLocaleString()}`}
        />
        <Metric label="Average churn score" value={String(average)} />
      </div>
      <section className="card">
        <h2>Filtered customer risk table</h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Tier</th>
                <th>Region</th>
                <th>Risk</th>
                <th>Score</th>
                <th>Revenue at risk</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td>
                    {item.id} · {item.name}
                  </td>
                  <td>{item.tier}</td>
                  <td>{item.region}</td>
                  <td>{item.risk}</td>
                  <td>{item.riskScore}</td>
                  <td>RM {item.revenueAtRisk.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
