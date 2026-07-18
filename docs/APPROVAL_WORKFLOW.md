# Approval workflow

Material actions move Draft -> Pending Approval -> Approved/Rejected/Changes Requested -> Executed or Cancelled. Retention/customer messages need a Sales Manager; campaigns/social schedules need a Marketing Manager; overrides, sensitive exports and governance changes need an authorised manager or administrator.

The requester cannot approve their own work, and AVO is never an approver. Requests retain original AVO output, human edit, reviewer comment, rejection reason, before/after state and submission/approval/execution timestamps. WhatsApp/email links become available only after approval and consent checks.

## Phase 1 retention action lifecycle

Draft -> Pending Approval -> Approved and Ready -> In Progress -> Waiting for Customer or Outcome Required -> Completed.

A manager may instead choose Changes Requested or Rejected. Changes Requested requires reviewer feedback and requested changes. The requester must click Begin Revision, edit the draft, create a new preserved version, and resubmit. Pending items cannot be edited.

Approval, Start Action, and Confirm Execution are separate audited events. Only the authorised owner (or Administrator) can start and execute. Self-approval is blocked. Execution stores executor, timestamp, response expectation, and approved content context. Customer responses and final outcomes are separate operational records.
