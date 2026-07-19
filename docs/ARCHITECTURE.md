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
  versioned localStorage                              Supabase Auth session
  isolated + resettable                               per-entity records + RLS
                                                      Realtime + audit_logs
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

For authenticated Imported Workspace, `lib/workspace-persistence.ts` serializes each entity separately into `operational_entity_records`. Supabase RLS scopes by organisation, role and assigned profile. A database trigger resolves imported customer assignment from staff identity where possible. Realtime notifies other sessions, while local writes are debounced and tagged with the authenticated updater. Audit rows are inserted separately with before/after values and cannot be updated or deleted by normal application roles.

The server AVO route validates the Supabase bearer session and retrieves an imported customer through RLS. A caller-supplied demo role does not grant imported-customer access.

## Provider boundaries

`AIProvider` supports Xiaomi MiMo/OpenAI-compatible Responses API and deterministic Demo AVO. Live failure produces a labelled fallback response with a redacted reason. `SocialPublisher` supports Buffer and Demo Publisher. Buffer is unavailable without credentials; Demo Publisher produces only internal scheduling records.

Secrets stay server-side. Consent, evidence validation, manager approval, requester separation and audit remain application invariants.
