# Architecture

CustomerPulse AI uses a responsive Next.js App Router shell. Client pages share one versioned `DemoWorkflowState` through `DemoWorkflowProvider`; the state is persisted in browser localStorage and survives route changes and refreshes.

## Operational architecture

```text
UI pages
  -> DemoWorkflowProvider
     -> Demo Workspace (permanent synthetic seed)
     -> Imported Workspace (incremental uploads)
        -> operational customers, transactions, messages, products
        -> analyses, signals, tier calculations, churn calculations
        -> alerts, responses, outcomes, actions, campaigns, audit
           -> Customer 360, Alerts, Retention Actions, Analytics
```

The workspaces are explicitly selected in the header and never silently mixed. Reset Demo Data recreates only the seeded Demo Workspace and preserves Imported Workspace.

`lib/operational.ts` owns the authoritative `calculateCustomerTier`, `calculateChurn`, `evaluateCustomerAlerts`, import commit, AVO signal conversion, and targeted recalculation functions. `lib/action-lifecycle.ts` defines the allowed state machine and RBAC invariants. AVO contributes validated evidence-linked signals only; the deterministic engine owns the official score.

Server routes retain provider abstractions for OpenAI/Demo AVO and Buffer/Demo Publisher. `OperationalRepository` retains a local/Supabase boundary. The credential-free verified runtime uses localStorage; the Supabase operational repository is an unconfigured boundary and is not claimed as live.

Secrets stay in server environment variables. Consent, manager approval, self-approval blocking, evidence validation, and audit creation remain enforced.
