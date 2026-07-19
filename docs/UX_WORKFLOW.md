# UX and workflow reference

## Shared demo session

`DemoWorkflowProvider` is the single browser source for role, import history, recommendation/action state, campaign draft/version/approval, ScheduledPost records, audit events, and walkthrough progress. It persists under `customerpulse-demo-v2`. Switch Role changes route availability immediately; Reset Demo removes the stored session and restores seeded data.

## Customer retention state flow

```text
Data → Conversation/AVO analysis → Risk/Alert → Recommendation (Draft)
  → Submit → Retention Action (Pending Approval)
  → Manager: Approved | Changes Requested | Rejected
  → Account Executive executes Approved action
  → In Progress → Outcome required → Completed
  → Analytics + Audit
```

Rules: owner, deadline, message, evidence, and approver are required; duplicate submission is blocked; original and edited AVO content are retained; reviewer comment is required; rejection needs a reason; requester cannot self-approve; approval never executes; consent is checked at execution; response and outcome are separate requirements.

Linked destinations use record query parameters, including `/recommendations?recommendationId=REC-001` and `/actions?actionId=ACT-021`. The destination selects and highlights the record.

## Marketing state flow

```text
MKT-003 → Campaign Brief → Audience → Approved Sources → Content + Versions
  → Six-part Review → Pending Approval → Approved
  → Schedule → one ScheduledPost per channel → Calendar → Analytics + Audit
```

Campaign Studio stages are Brief, Audience, Sources, Content, Review, Approval, and Schedule. Every stage has guidance, validation, Back, Save Draft and Continue. Content remains editable, evidence-linked, versioned, and subject to factual/policy review. Schedule is unavailable before approval. `/campaign-calendar?campaignId=CAM-003&scheduled=1` opens and highlights the shared records and publisher detail.

## Import workflow

1. Select Import Type — formats, 10 MB limit, required fields, purpose, access, blank/populated downloads.
2. Choose File — visible/keyboard Browse, drag/drop, detected name/size/type, progress, replace/remove.
3. Preview and Validate — rows/mapping/counts/errors for structured files; metadata/pages/text/chunks/classification/retention for documents.
4. Confirm Import — add/update/reject/chunk counts, uploader/time, explicit confirmation, persistent history/audit and contextual next actions.

Role permissions follow the acceptance matrix. Auditor has no upload permission. Account Executive is limited to conversations in the demo; assignment scoping is represented by role policy and remains a backend enforcement requirement when Supabase is connected.

## Workflow Guide and walkthrough

The reusable guide marks completed/current/pending stages, missing requirements, expected outcome and next action. It is horizontal on desktop and compact vertical on mobile. Overview starts persisted, non-modal Scenario A and C guides; normal navigation remains usable.

## Success and error conventions

Material operations render an in-page success or error state plus next routes; toast feedback supplements but does not replace it. Disabled controls include inline explanations or a title. Unauthorized routes state why access is restricted, name an eligible role, and link to Overview.

## Phase 1 workflow guide

The application displays the active Demo or Imported Workspace in the header. Customer 360 shows Monitored or Active Alert, the latest authoritative score, last evaluated date, future trigger description, source provenance, and Manual Recalculate.

Retention Actions exposes the next responsible control for each state: Begin Revision, Start Action, Open Approved WhatsApp, Confirm Execution, Record Response, Record No Response, Extend Deadline, Send Approved Follow-up, Escalate, and Record Outcome and Recalculate Risk. Disabled controls explain missing role or required information.

## Phase 2 Customers and Customer 360

List state is encoded in `/customers` query parameters: `q`, `tier`, `risk`, `owner`, `region`, `industry`, `consent`, `alert`, `pending`, `overdue`, `sentiment`, `status`, `sort`, `dir`, `page`, and `size`. Opening a customer carries the complete list URL in `from`; Back to Customers restores it and session scroll restoration returns the user near the prior position.

The operational path is Customers -> `/customers/[customerId]` -> Conversations/AVO Insights/Alerts/Actions. Customer 360 tabs are real URL states and browser Back/Forward remount from the URL. Breadcrumbs identify Customers -> Customer Name, and authorized Previous/Next controls use the current scoped customer collection.

Desktop uses the full operational table; tablet suppresses lower-priority columns; mobile uses accessible customer cards. The explicit customer link is primary. A clickable row remains a convenience target with link semantics, focus styling, Enter/Space handling, and event guards so nested links/buttons do not trigger row navigation.

Account Executive state contains only customers assigned to Aisha Rahman. Owner filters are derived from that scoped collection, direct unassigned URLs are denied without data disclosure, and exports contain only the complete filtered authorized result set. Auditor may inspect Customer 360 but cannot run AVO or perform write actions.
