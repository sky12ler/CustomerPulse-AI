# Architecture

CustomerPulse AI is a Next.js App Router application with a shared, versioned operational domain state.

```text
                         ┌──────────────────────────┐
                         │ Next.js / React browser │
                         └────────────┬─────────────┘
                                      │
                   ┌──────────────────┴──────────────────┐
                   │ DemoWorkflowProvider / domain API  │
                   └───────────┬───────────────┬─────────┘
                               │               │
             ┌─────────────────┘               └──────────────────┐
             ▼                                                    ▼
  Synthetic Demo Workspace                            Imported Workspace
  versioned localStorage                              versioned localStorage
  isolated + resettable                               isolated uploaded records
             │                                                    │
             └──────────────────────┬─────────────────────────────┘
                                    ▼
 customers / transactions / conversations / products / documents
 analyses / signals / tier / churn / ERAR / alerts
 recommendations / actions / responses / outcomes
 opportunities / campaigns / scheduled posts / results / audit
                                    │
                                    ▼
 Overview / Customers / Customer 360 / Alerts / Retention / Marketing / Analytics
```

The two workspaces are explicitly selected and never silently mixed. Reset Demo Data restores only synthetic demo records.

## Decision pipeline

```text
customer + transaction data ──> deterministic tier/behaviour
authorised conversations ─────> AVO analysis ──> evidence validation
                                            \       /
                                             churn + ERAR
                                                   │
                                       dynamic alert/no alert
                                                   │
                         staff recommendation → approval → action lifecycle
                                                   │
                                      response/outcome → recalculation
                                                   │
                                            audit + analytics
```

`lib/operational.ts` owns authoritative tier, churn, ERAR, alert and recalculation behavior. `lib/action-lifecycle.ts` owns permitted status transitions. `lib/marketing-operational.ts` owns segment opportunity and consent/channel audience calculations. AVO contributes validated signals and editable language; it does not own the official score, approval or execution.

## Persistence and access

Both workspaces use separate keys inside one versioned browser state. Imported records survive routes and refreshes in that browser but are not shared between visitors. The server receives an imported customer only when the same browser explicitly asks for AVO analysis; that request does not grant or perform any Supabase database access. The on-screen role selector enforces the walkthrough’s role, assignment, approval and export rules.

Supabase migrations and adapters remain in the repository as optional future deployment work. They are not required or claimed by the selected public hackathon workflow.

## Provider boundaries

`AIProvider` supports Xiaomi MiMo/OpenAI-compatible Responses API and deterministic Demo AVO. Live failure produces a labelled fallback response with a redacted reason. `SocialPublisher` supports Buffer and Demo Publisher. Buffer is unavailable without credentials; Demo Publisher produces only internal scheduling records.

Secrets stay server-side. Consent, evidence validation, manager approval, requester separation and audit remain application invariants.
