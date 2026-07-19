"use client";

import { useState } from "react";
import { CheckCircle2, MessageCircle } from "lucide-react";
import { customers, recommendations } from "@/lib/demo-data";
import { canOutreach } from "@/lib/engines";
import type { RetentionActionRecord } from "@/lib/demo-workflow";
import type { Role } from "@/lib/types";
import type { OutcomeType } from "@/lib/operational";
import { useDemoWorkflow } from "./workflow-context";
import { WorkflowGuide } from "./workflow-guide";

const retentionSteps = [
  "Recommendation",
  "Pending Approval",
  "Approved and Ready",
  "In Progress",
  "Waiting for Customer",
  "Outcome Required",
  "Completed",
];
const badge = (value: string) => (
  <span className={`badge ${value.toLowerCase().replaceAll(" ", "-")}`}>
    {value}
  </span>
);

export function RecommendationsV2({
  notify,
  go,
}: {
  notify: (s: string) => void;
  go: (s: string) => void;
}) {
  const demo = useDemoWorkflow();
  const accessibleIds = new Set(
    demo.accessibleCustomers.map((customer) => customer.id),
  );
  const accessibleRecommendations = recommendations.filter((item) =>
    accessibleIds.has(item.customerId),
  );
  const [selected, setSelected] = useState(
    () =>
      new URLSearchParams(
        typeof window === "undefined" ? "" : window.location.search,
      ).get("recommendationId") ?? "REC-001",
  );
  const current =
    demo.state.recommendationStatuses[selected] === "Submitted" ? 5 : 4;
  if (demo.state.activeWorkspace === "imported")
    return (
      <section className="card empty">
        <h2>No imported recommendations yet</h2>
        <p>
          Import customers and transactions, then run AVO on authorised
          conversations. Demo recommendations remain isolated in Demo Workspace.
        </p>
      </section>
    );
  return (
    <div>
      <WorkflowGuide
        title="Customer retention"
        steps={retentionSteps}
        current={current}
        expected="A validated recommendation becomes a manager-owned approval request and linked retention action."
      />
      <div className="grid two">
        <section className="card">
          <div className="card-head">
            <h2>Recommendation queue</h2>
            <span className="badge medium">Human review required</span>
          </div>
          {accessibleRecommendations.map((item) => {
            const customer =
              demo.accessibleCustomers.find((c) => c.id === item.customerId) ??
              customers.find((c) => c.id === item.customerId)!;
            const status =
              demo.state.recommendationStatuses[item.id] ?? item.status;
            return (
              <button
                key={item.id}
                className={`queue-row ${selected === item.id ? "selected" : ""}`}
                onClick={() => setSelected(item.id)}
              >
                <span>
                  <b>
                    {item.id} · {customer.name}
                  </b>
                  <small>{item.action}</small>
                </span>
                {badge(status)}
              </button>
            );
          })}
        </section>
        <RecommendationDetail
          key={selected}
          rec={
            (accessibleRecommendations.find((item) => item.id === selected) ??
              accessibleRecommendations[0])!
          }
          notify={notify}
          go={go}
        />
      </div>
    </div>
  );
}

function RecommendationDetail({
  rec,
  notify,
  go,
}: {
  rec: (typeof recommendations)[number];
  notify: (s: string) => void;
  go: (s: string) => void;
}) {
  const demo = useDemoWorkflow();
  const customer =
    demo.accessibleCustomers.find((item) => item.id === rec.customerId) ??
    customers.find((item) => item.id === rec.customerId)!;
  const [draft, setDraft] = useState(
    customer.scenario === "A"
      ? "Hi Maya, I’m sorry our promised update was missed. I’m reviewing the replacement status under our service policy and will confirm the next step after manager approval."
      : "Hi Ethan, I can share the approved Analytics Suite overview if helpful.",
  );
  const [owner, setOwner] = useState(rec.owner);
  const [deadline, setDeadline] = useState(
    rec.id === "REC-001" ? "2026-07-19" : "2026-07-23",
  );
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const linked = demo.state.actions.find(
    (item) => item.recommendationId === rec.id,
  );
  const status = demo.state.recommendationStatuses[rec.id] ?? rec.status;
  const submit = () => {
    setError("");
    if (
      !owner.trim() ||
      !deadline ||
      !draft.trim() ||
      !customer.messages.some((message) => message.evidence) ||
      !linked?.approver
    )
      return setError(
        "Owner, deadline, message draft, evidence and approver are required.",
      );
    try {
      const action = demo.submitRecommendation(rec.id, draft, owner, deadline);
      setSuccess(action.id);
      notify("Recommendation submitted to Sales Manager for approval.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Submission failed");
    }
  };
  if (success)
    return (
      <section className="card success-panel" role="status">
        <CheckCircle2 size={34} />
        <h2>Recommendation submitted to Sales Manager for approval.</h2>
        <p>
          {rec.id} moved from Draft to Submitted. {success} is now Pending
          Approval in Farah Chen’s queue.
        </p>
        <div className="notice">
          Requester, approver, original AVO output, human edit, evidence links
          and timestamp were audited.
        </div>
        <button
          className="btn btn-primary"
          onClick={() => go(`actions?actionId=${success}`)}
        >
          View Retention Action
        </button>{" "}
        <button className="btn btn-outline" onClick={() => setSuccess("")}>
          Return to Recommendations
        </button>
      </section>
    );
  return (
    <section className="card">
      <div className="card-head">
        <h2>{rec.id} · AVO Recommendation</h2>
        {badge(status)}
      </div>
      <div className="notice warning">
        AVO-generated draft. Staff must verify evidence; approver: Farah Chen
        (Sales Manager).
      </div>
      <h3>{rec.action}</h3>
      <p>{rec.explanation}</p>
      <div className="grid two">
        <label className="field">
          Owner
          <input
            aria-label="Recommendation owner"
            className="input"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
          />
        </label>
        <label className="field">
          Deadline
          <input
            aria-label="Recommendation deadline"
            type="date"
            className="input"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </label>
      </div>
      <label className="field">
        Human-edited customer draft
        <textarea
          aria-label="Recommendation message draft"
          className="input"
          rows={5}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
      </label>
      <h3>Evidence</h3>
      {customer.messages
        .filter((message) => message.evidence)
        .slice(0, 3)
        .map((message) => (
          <div className="evidence" key={message.id}>
            <span className="evidence-id">{message.id} · source evidence</span>
            {message.text}
          </div>
        ))}
      <div className="notice">
        Confidence: {rec.confidence}. Uncertainty: future customer behaviour
        cannot be confirmed; validate current delivery status.
      </div>
      {error && (
        <div className="notice danger" role="alert">
          {error}
        </div>
      )}
      <div className="top-actions">
        <button
          className="btn btn-primary"
          disabled={status !== "Draft"}
          title={status !== "Draft" ? `Already submitted as ${linked?.id}` : ""}
          onClick={submit}
        >
          {status === "Draft" ? "Submit for Approval" : "Already Submitted"}
        </button>
        <button
          className="btn btn-outline"
          onClick={() =>
            go(
              `/customers/${customer.id}?tab=overview&from=${encodeURIComponent("/recommendations")}`,
            )
          }
        >
          View Customer
        </button>
        <button
          className="btn btn-outline"
          onClick={() => go(`alerts?alertId=${linked?.alertId}`)}
        >
          View Alert
        </button>
        {linked && status !== "Draft" && (
          <button
            className="btn btn-outline"
            onClick={() => go(`actions?actionId=${linked.id}`)}
          >
            View Retention Action
          </button>
        )}
      </div>
      {status !== "Draft" && (
        <p className="validation-help">
          Submit is unavailable because duplicate recommendation submissions are
          prevented.
        </p>
      )}
    </section>
  );
}

const actor = (role: Role) =>
  role === "Administrator"
    ? "Demo Administrator"
    : role === "Sales Manager"
      ? "Farah Chen"
      : role === "Marketing Manager"
        ? "Mina Lee"
        : role === "Account Executive"
          ? "Aisha Rahman"
          : "Demo Auditor";

export function ActionsV2({
  notify,
  role,
  go,
}: {
  notify: (s: string) => void;
  role: Role;
  go: (s: string) => void;
}) {
  const demo = useDemoWorkflow();
  const queryId = new URLSearchParams(
    typeof window === "undefined" ? "" : window.location.search,
  ).get("actionId");
  const [selected, setSelected] = useState(
    queryId ?? demo.accessibleActions[0]?.id,
  );
  const [tab, setTab] = useState("All");
  const [search, setSearch] = useState("");
  const [comment, setComment] = useState("");
  const [reason, setReason] = useState("");
  const [response, setResponse] = useState("");
  const [outcome, setOutcome] = useState("");
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const manager = role === "Sales Manager" || role === "Administrator";
  const executor = role === "Account Executive" || role === "Administrator";
  const counts = {
    pending: demo.accessibleActions.filter(
      (a) => a.status === "Pending Approval",
    ).length,
    changes: demo.accessibleActions.filter(
      (a) => a.status === "Changes Requested",
    ).length,
    ready: demo.accessibleActions.filter(
      (a) => a.status === "Approved and Ready",
    ).length,
    progress: demo.accessibleActions.filter((a) => a.status === "In Progress")
      .length,
    overdue: demo.accessibleActions.filter(
      (a) =>
        new Date(a.deadline) < new Date() &&
        !["Completed", "Rejected"].includes(a.status),
    ).length,
    completed: demo.accessibleActions.filter((a) => a.status === "Completed")
      .length,
  };
  const visible = demo.accessibleActions.filter(
    (item) =>
      item.datasetId === demo.state.activeWorkspace &&
      (tab === "All" ||
        (tab === "My Tasks" && item.owner === actor(role)) ||
        item.status === tab) &&
      `${item.id} ${item.customerName} ${item.owner}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const action =
    demo.accessibleActions.find(
      (item) =>
        item.id === selected && item.datasetId === demo.state.activeWorkspace,
    ) ?? visible[0];
  const decide = (decision: "Approved" | "Rejected" | "Changes Requested") => {
    setError("");
    try {
      demo.reviewAction(action.id, decision, comment, reason);
      const message =
        decision === "Approved"
          ? `Action approved and ready for execution by ${action.owner}.`
          : `Action marked ${decision}.`;
      setSuccess(message);
      notify(message);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Decision failed");
    }
  };
  const start = () => {
    setError("");
    try {
      demo.startAction(action.id);
      setSuccess(
        "Action started. Use the approved execution control, then confirm execution.",
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Start failed");
    }
  };
  const execute = () => {
    setError("");
    try {
      const customer = demo.accessibleCustomers.find(
        (c) => c.id === action.customerId,
      );
      if (!customer || !canOutreach(customer, "WhatsApp"))
        throw new Error(
          "WhatsApp action is unavailable because customer consent has been withdrawn.",
        );
      demo.executeAction(
        action.id,
        true,
        "Approved WhatsApp deep link opened and execution confirmed",
      );
      setSuccess("Execution confirmed. Waiting for Customer is now active.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Execution failed");
    }
  };
  const captureResponse = () => {
    setError("");
    try {
      demo.recordResponse(action.id, response, "Positive");
      setSuccess(
        "Customer response stored separately. Record the business outcome next.",
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Response failed");
    }
  };
  const record = () => {
    setError("");
    try {
      demo.recordOutcome(action.id, outcome as OutcomeType, response);
      setSuccess(
        "Outcome recorded. Risk, alert, revenue at risk, and analytics were recalculated.",
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Outcome failed");
    }
  };
  const lifecycleIndex: Record<string, number> = {
    Draft: 0,
    "Changes Requested": 0,
    "Pending Approval": 1,
    "Approved and Ready": 2,
    "In Progress": 3,
    "Waiting for Customer": 4,
    "Outcome Required": 5,
    Completed: 6,
  };
  const current = lifecycleIndex[action?.status ?? "Draft"] ?? 0;
  return (
    <div>
      <WorkflowGuide
        title="Customer retention"
        steps={retentionSteps}
        current={current}
        missing={error}
        expected="A manager-reviewed action is executed separately, then its outcome is recorded and audited."
      />
      <div className="grid stats">
        {[
          ["Pending Approval", counts.pending],
          ["Changes Requested", counts.changes],
          ["Approved and Ready", counts.ready],
          ["In Progress", counts.progress],
          ["Overdue", counts.overdue],
          ["Completed This Month", counts.completed],
        ].map(([label, value]) => (
          <div className="card" key={label}>
            <span className="subtle">{label}</span>
            <div className="stat-value">{value}</div>
          </div>
        ))}
      </div>
      <section className="card">
        <div className="tabs action-tabs">
          {[
            "All",
            "My Tasks",
            "Draft",
            "Pending Approval",
            "Changes Requested",
            "Approved and Ready",
            "In Progress",
            "Waiting for Customer",
            "Outcome Required",
            "Completed",
            "Rejected",
          ].map((value) => (
            <button
              key={value}
              className={`tab ${tab === value ? "active" : ""}`}
              onClick={() => setTab(value)}
            >
              {value}
            </button>
          ))}
        </div>
        <div className="filter-row">
          <input
            aria-label="Filter actions"
            className="input"
            placeholder="Customer, action ID or owner"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="input" aria-label="Tier filter">
            <option>All tiers</option>
            <option>Strategic</option>
            <option>Growth</option>
          </select>
          <select className="input" aria-label="Risk filter">
            <option>All risks</option>
            <option>Critical</option>
            <option>High</option>
          </select>
          <select className="input" aria-label="Priority filter">
            <option>All priorities</option>
            <option>Urgent</option>
            <option>High</option>
          </select>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Action / Customer</th>
                <th>Tier / Risk</th>
                <th>Recommendation</th>
                <th>Priority</th>
                <th>Owner / Approver</th>
                <th>Deadline</th>
                <th>Approval</th>
                <th>Execution</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => (
                <tr
                  id={item.id}
                  className={item.id === selected ? "record-highlight" : ""}
                  key={item.id}
                  onClick={() => setSelected(item.id)}
                >
                  <td>
                    <b>{item.id}</b>
                    <br />
                    {item.customerName}
                  </td>
                  <td>
                    {badge(item.tier)} {badge(item.risk)}
                  </td>
                  <td>{item.recommendation}</td>
                  <td>{badge(item.priority)}</td>
                  <td>
                    {item.owner}
                    <br />
                    <small>{item.approver}</small>
                  </td>
                  <td>
                    {item.deadline}
                    <br />
                    {new Date(item.deadline) < new Date() &&
                      !["Completed", "Rejected"].includes(item.status) && (
                        <span className="badge critical">Overdue</span>
                      )}
                  </td>
                  <td>{badge(item.approvalStatus)}</td>
                  <td>{item.executionStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {action && (
        <ActionDetail
          action={action}
          manager={manager}
          executor={executor}
          comment={comment}
          reason={reason}
          response={response}
          outcome={outcome}
          success={success}
          error={error}
          setComment={setComment}
          setReason={setReason}
          setResponse={setResponse}
          setOutcome={setOutcome}
          decide={decide}
          start={start}
          execute={execute}
          captureResponse={captureResponse}
          record={record}
          notify={notify}
          go={go}
        />
      )}
    </div>
  );
}

interface ActionDetailProps {
  action: RetentionActionRecord;
  manager: boolean;
  executor: boolean;
  comment: string;
  reason: string;
  response: string;
  outcome: string;
  success: string;
  error: string;
  setComment: (value: string) => void;
  setReason: (value: string) => void;
  setResponse: (value: string) => void;
  setOutcome: (value: string) => void;
  decide: (decision: "Approved" | "Rejected" | "Changes Requested") => void;
  start: () => void;
  execute: () => void;
  captureResponse: () => void;
  record: () => void;
  notify: (message: string) => void;
  go: (path: string) => void;
}

function ActionDetail(props: ActionDetailProps) {
  const {
    action,
    manager,
    executor,
    comment,
    reason,
    response,
    outcome,
    success,
    error,
    setComment,
    setReason,
    setResponse,
    setOutcome,
    decide,
    start,
    execute,
    captureResponse,
    record,
    notify,
    go,
  } = props;
  const demo = useDemoWorkflow();
  return (
    <section className="card action-detail">
      <div className="card-head">
        <div>
          <span className="eyebrow">Selected action</span>
          <h2>
            {action.id} · {action.customerName}
          </h2>
        </div>
        {badge(action.status)}
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
      <div className="grid two">
        <div>
          <h3>Customer and churn context</h3>
          <p>
            {action.tier} customer at {action.risk} risk. {action.explanation}
          </p>
          <h3>Recommended action</h3>
          <p>{action.recommendation}</p>
          <p>
            <b>Confidence:</b> {action.confidence}
          </p>
          <p>
            <b>Uncertainty:</b> {action.uncertainty}
          </p>
          <h3>Evidence</h3>
          {action.evidence.map((item) => (
            <div className="evidence" key={item}>
              {item}
            </div>
          ))}
          <button
            className="btn btn-outline"
            onClick={() =>
              go(
                `/customers/${action.customerId}?tab=actions&from=${encodeURIComponent("/actions")}`,
              )
            }
          >
            View Customer
          </button>{" "}
          <button
            className="btn btn-outline"
            onClick={() =>
              go(`recommendations?recommendationId=${action.recommendationId}`)
            }
          >
            View Recommendation
          </button>
        </div>
        <div>
          <h3>Governed content</h3>
          <label className="field">
            Original AVO output
            <textarea
              className="input"
              readOnly
              value={action.originalAvoOutput}
            />
          </label>
          <label className="field">
            Human-edited output
            <textarea
              className="input"
              readOnly
              value={action.humanEditedOutput}
            />
          </label>
          <p>
            <b>Owner:</b> {action.owner} · <b>Approver:</b> {action.approver} ·{" "}
            <b>Deadline:</b> {action.deadline}
          </p>
          {action.status === "Pending Approval" && (
            <>
              <label className="field">
                Reviewer comment (required)
                <input
                  aria-label="Reviewer comment"
                  className="input"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </label>
              <label className="field">
                Requested changes or rejection reason
                <input
                  aria-label="Rejection reason"
                  className="input"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </label>
              <div className="top-actions">
                <button
                  className="btn btn-primary"
                  disabled={!manager || !comment.trim()}
                  title={
                    !manager
                      ? "Sales Manager required"
                      : !comment.trim()
                        ? "Reviewer comment is required"
                        : ""
                  }
                  onClick={() => decide("Approved")}
                >
                  Approve
                </button>
                <button
                  className="btn btn-danger"
                  disabled={!manager || !comment.trim() || !reason.trim()}
                  title={!reason.trim() ? "Rejection reason is required" : ""}
                  onClick={() => decide("Rejected")}
                >
                  Reject
                </button>
                <button
                  className="btn btn-outline"
                  disabled={!manager || !comment.trim() || !reason.trim()}
                  title={!reason.trim() ? "Requested changes are required" : ""}
                  onClick={() => decide("Changes Requested")}
                >
                  Request Changes
                </button>
                <button
                  className="btn btn-outline"
                  disabled={!manager}
                  onClick={() => {
                    demo.log(
                      "Retention action reassigned",
                      action.id,
                      "Success",
                    );
                    notify("Action reassigned and audited");
                  }}
                >
                  Reassign
                </button>
                <button
                  className="btn btn-outline"
                  disabled={!manager}
                  onClick={() => {
                    demo.log(
                      "Retention action escalated",
                      action.id,
                      "Escalated",
                    );
                    notify("Action escalated and audited");
                  }}
                >
                  Escalate
                </button>
              </div>
              {(!manager || !comment.trim()) && (
                <p className="validation-help">
                  Approve is unavailable because{" "}
                  {manager
                    ? "reviewer comment is required"
                    : "Sales Manager or Administrator role is required"}
                  .
                </p>
              )}
            </>
          )}
          {action.status === "Changes Requested" && (
            <div className="notice warning">
              <b>Reviewer feedback:</b> {action.reviewerComment}
              <button
                className="btn btn-primary"
                disabled={!executor}
                onClick={() => {
                  demo.beginRevision(action.id);
                  go(
                    "recommendations?recommendationId=" +
                      action.recommendationId,
                  );
                }}
              >
                Begin Revision
              </button>
            </div>
          )}
          {action.status === "Approved and Ready" && (
            <>
              <p>
                <b>Next step:</b> The assigned owner starts the approved action.
                Starting does not execute it.
              </p>
              <button
                className="btn btn-primary"
                disabled={!executor}
                title={
                  !executor
                    ? "Assigned Account Executive or Administrator required"
                    : ""
                }
                onClick={start}
              >
                Start Action
              </button>
            </>
          )}
          {action.status === "In Progress" && (
            <>
              <p>
                <b>Execution control:</b> Open the approved WhatsApp message,
                then confirm that execution occurred.
              </p>
              <a
                className="btn btn-outline"
                href={
                  "https://wa.me/?text=" +
                  encodeURIComponent(action.humanEditedOutput)
                }
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle size={14} /> Open Approved WhatsApp
              </a>{" "}
              <button
                className="btn btn-primary"
                disabled={!executor}
                onClick={execute}
              >
                Confirm Execution
              </button>
            </>
          )}
          {action.status === "Waiting for Customer" && (
            <>
              <div className="evidence">
                <b>Waiting for Customer</b>
                <br />
                Executed {action.executedAt} - Response deadline{" "}
                {action.responseDeadline} - Follow-up owner {action.owner}
              </div>
              <label className="field">
                Customer response
                <input
                  aria-label="Customer response"
                  className="input"
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                />
              </label>
              <button
                className="btn btn-primary"
                disabled={!response.trim()}
                onClick={captureResponse}
              >
                Record Response
              </button>{" "}
              <button
                className="btn btn-outline"
                onClick={() => {
                  demo.recordResponse(
                    action.id,
                    "No response received by deadline",
                    "Neutral",
                  );
                  notify("No response recorded; outcome is now required.");
                }}
              >
                Record No Response
              </button>{" "}
              <button
                className="btn btn-outline"
                onClick={() => {
                  const date = new Date(action.responseDeadline ?? Date.now());
                  date.setDate(date.getDate() + 3);
                  demo.update((current) => ({
                    ...current,
                    actions: current.actions.map((item) =>
                      item.id === action.id
                        ? {
                            ...item,
                            responseDeadline: date.toISOString().slice(0, 10),
                          }
                        : item,
                    ),
                  }));
                  demo.log("Response deadline extended", action.id, "Success");
                  notify("Response deadline extended and audited.");
                }}
              >
                Extend Deadline
              </button>{" "}
              <button
                className="btn btn-outline"
                onClick={() => {
                  demo.log("Approved follow-up sent", action.id, "Success");
                  notify("Approved follow-up recorded in the audit trail.");
                }}
              >
                Send Approved Follow-up
              </button>{" "}
              <button
                className="btn btn-outline"
                onClick={() => {
                  demo.log("Waiting action escalated", action.id, "Escalated");
                  notify("Waiting action escalated and audited.");
                }}
              >
                Escalate
              </button>
            </>
          )}
          {action.status === "Outcome Required" && (
            <>
              <label className="field">
                Outcome type
                <select
                  aria-label="Action outcome"
                  className="input"
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value)}
                >
                  <option value="">Select an outcome</option>
                  {[
                    "Customer retained",
                    "Complaint resolved",
                    "Offer accepted",
                    "Meeting scheduled",
                    "Purchase completed",
                    "No response",
                    "Customer declined",
                    "Customer churned",
                    "Follow-up required",
                    "Inconclusive",
                  ].map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                Outcome notes
                <textarea
                  aria-label="Outcome notes"
                  className="input"
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                />
              </label>
              <button
                className="btn btn-primary"
                disabled={!response.trim() || !outcome}
                onClick={record}
              >
                Record Outcome and Recalculate Risk
              </button>
            </>
          )}
          <h3>Approval and audit history</h3>
          {action.history.map((item, index) => (
            <div className="evidence" key={`${item.at}-${index}`}>
              <b>
                {item.status} · {item.actor}
              </b>
              <div>{item.comment}</div>
              <small>{item.at}</small>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
