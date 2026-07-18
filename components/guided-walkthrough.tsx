"use client";

import { X } from "lucide-react";
import { useDemoWorkflow } from "./workflow-context";

const scenarios = {
  A: [
    [
      "Open Maya Tan’s conversation",
      "Review the authorised customer thread.",
      "conversations?customerId=CUS-1001",
    ],
    [
      "Run AVO Analysis",
      "Three evidence-linked risk signals should appear.",
      "conversations?customerId=CUS-1001",
    ],
    [
      "Open the Critical alert",
      "ALT-001 should show Maya’s deterministic risk context.",
      "alerts?alertId=ALT-001",
    ],
    [
      "Inspect evidence",
      "Message IDs and uncertainty should be visible.",
      "alerts?alertId=ALT-001",
    ],
    [
      "Generate recommendation",
      "REC-001 should open as an editable governed draft.",
      "recommendations?recommendationId=REC-001",
    ],
    [
      "Submit for approval",
      "ACT-021 should enter the Sales Manager queue.",
      "recommendations?recommendationId=REC-001",
    ],
    [
      "Approve as Sales Manager",
      "Switch role, add a reviewer comment, then approve.",
      "actions?actionId=ACT-021",
    ],
    [
      "Execute WhatsApp action",
      "Switch to Account Executive; execution remains separate from approval.",
      "actions?actionId=ACT-021",
    ],
    [
      "View audit record",
      "Requester, editor, approver and executor should be traceable.",
      "audit?entity=ACT-021",
    ],
  ],
  C: [
    [
      "Open Marketing Intelligence",
      "MKT-003 should show an evidence-based decline.",
      "marketing?triggerId=MKT-003",
    ],
    [
      "Inspect decline insight",
      "Review change, drivers, avoid guidance and uncertainty.",
      "marketing?triggerId=MKT-003",
    ],
    [
      "View affected customers",
      "Confirm consent-filtered North customers.",
      "marketing?triggerId=MKT-003",
    ],
    [
      "Create campaign",
      "MKT-003 should prefill the campaign brief.",
      "campaign-studio?triggerId=MKT-003&step=1",
    ],
    [
      "Select sources",
      "Choose only approved source records.",
      "campaign-studio?campaignId=CAM-003&step=3",
    ],
    [
      "Generate content",
      "AVO should create editable, evidence-grounded channel content.",
      "campaign-studio?campaignId=CAM-003&step=4",
    ],
    [
      "Review campaign",
      "Complete all consent, source, claim and schedule confirmations.",
      "campaign-studio?campaignId=CAM-003&step=5",
    ],
    [
      "Approve campaign",
      "Submit, add reviewer comment, and approve separately.",
      "campaign-studio?campaignId=CAM-003&step=6",
    ],
    [
      "Schedule campaign",
      "Create one shared ScheduledPost per channel.",
      "campaign-studio?campaignId=CAM-003&step=7",
    ],
    [
      "View Campaign Calendar",
      "CAM-003 should be highlighted with publisher details.",
      "campaign-calendar?campaignId=CAM-003",
    ],
    [
      "View Analytics",
      "Management insights should respond to filters.",
      "analytics?campaign=CAM-003",
    ],
    [
      "View Audit",
      "The campaign chain should be visible in audit history.",
      "audit?entity=CAM-003",
    ],
  ],
} as const;

export function WalkthroughLauncher({ go }: { go: (path: string) => void }) {
  const demo = useDemoWorkflow();
  const start = (scenario: "A" | "C") => {
    demo.update((current) => ({
      ...current,
      walkthrough: { active: true, scenario, step: 0 },
    }));
    demo.log(
      "Guided walkthrough started",
      `Scenario ${scenario}`,
      "In Progress",
    );
    go(scenarios[scenario][0][2]);
  };
  return (
    <section className="card guided-launch">
      <div>
        <span className="eyebrow">Guided demo</span>
        <h2>Follow a verified end-to-end workflow</h2>
        <p className="subtle">
          The guide is non-blocking and its progress persists after refresh.
        </p>
      </div>
      <div className="top-actions">
        <button className="btn btn-primary" onClick={() => start("A")}>
          Start Guided Demo · Scenario A
        </button>
        <button className="btn btn-outline" onClick={() => start("C")}>
          Start Guided Demo · Scenario C
        </button>
      </div>
    </section>
  );
}

export function GuidedWalkthrough({
  go,
}: {
  page: string;
  go: (path: string) => void;
}) {
  const demo = useDemoWorkflow();
  const walkthrough = demo.state.walkthrough;
  if (!walkthrough.active || !walkthrough.scenario) return null;
  const steps = scenarios[walkthrough.scenario];
  const index = Math.min(walkthrough.step, steps.length - 1);
  const [title, expected, route] = steps[index];
  const exit = () => {
    demo.update((current) => ({
      ...current,
      walkthrough: { active: false, scenario: null, step: 0 },
    }));
    demo.log(
      "Guided walkthrough exited",
      `Scenario ${walkthrough.scenario}`,
      "Stopped",
    );
  };
  const next = () => {
    if (index === steps.length - 1) {
      demo.log(
        "Guided walkthrough completed",
        `Scenario ${walkthrough.scenario}`,
        "Completed",
      );
      exit();
      return;
    }
    const nextIndex = index + 1;
    demo.update((current) => ({
      ...current,
      walkthrough: { ...current.walkthrough, step: nextIndex },
    }));
    go(steps[nextIndex][2]);
  };
  return (
    <aside
      className="walkthrough-panel"
      aria-label={`Scenario ${walkthrough.scenario} guided walkthrough`}
    >
      <button
        className="walkthrough-close"
        aria-label="Exit walkthrough"
        onClick={exit}
      >
        <X size={16} />
      </button>
      <span className="eyebrow">
        Scenario {walkthrough.scenario} · Step {index + 1} of {steps.length}
      </span>
      <h3>{title}</h3>
      <p>
        <b>Expected outcome:</b> {expected}
      </p>
      <div className="progress">
        <span style={{ width: `${((index + 1) / steps.length) * 100}%` }} />
      </div>
      <div className="top-actions">
        <button className="btn btn-outline" onClick={() => go(route)}>
          Open current step
        </button>
        <button className="btn btn-primary" onClick={next}>
          {index === steps.length - 1 ? "Complete walkthrough" : "Next Step"}
        </button>
      </div>
      <button className="text-button" onClick={exit}>
        Exit Walkthrough
      </button>
    </aside>
  );
}
