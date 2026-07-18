"use client";

import { CheckCircle2, Circle, Target } from "lucide-react";

export function WorkflowGuide({
  title,
  steps,
  current,
  missing,
  expected,
  action,
}: {
  title: string;
  steps: string[];
  current: number;
  missing?: string;
  expected: string;
  action?: React.ReactNode;
}) {
  return (
    <section className="workflow-guide" aria-label={title}>
      <div className="card-head">
        <div>
          <span className="eyebrow">Workflow guide</span>
          <h2>{title}</h2>
        </div>
        <span className="badge medium">
          Stage {Math.min(current + 1, steps.length)} of {steps.length}
        </span>
      </div>
      <ol className="workflow-steps">
        {steps.map((step, index) => {
          const status =
            index < current
              ? "completed"
              : index === current
                ? "current"
                : "pending";
          return (
            <li
              className={status}
              key={step}
              aria-current={status === "current" ? "step" : undefined}
            >
              {status === "completed" ? (
                <CheckCircle2 />
              ) : status === "current" ? (
                <Target />
              ) : (
                <Circle />
              )}
              <span>
                <small>{status}</small>
                {step}
              </span>
            </li>
          );
        })}
      </ol>
      <div className="workflow-outcome">
        <div>
          <b>Expected outcome</b>
          <span>{expected}</span>
        </div>
        <div>
          <b>Missing requirements</b>
          <span>{missing || "None — ready for the next action."}</span>
        </div>
        {action && <div className="workflow-primary">{action}</div>}
      </div>
    </section>
  );
}
