# Architecture

The browser renders one responsive operational shell across 15 App Router routes. `lib/demo-data.ts` provides the no-credential domain store; production adapters use Supabase. Server routes call `AIProvider` (`OpenAIProvider` or `DemoAVOProvider`) and `SocialPublisher` (`BufferPublisher` or `DemoSocialPublisher`). Secrets never enter client components.

Data flows from confirmed import to customer/conversation records, deterministic tier/churn calculation, alert, validated AVO analysis, editable recommendation, role-based approval, explicit execution and immutable audit outcome. Campaigns add segment trigger, consented audience, approved document chunks, versioned content, approval and idempotent schedule. Every table contains `organization_id`; RLS resolves it from the authenticated profile.

The demo uses in-memory UI state intentionally so evaluators can complete the flow without external infrastructure. Connecting Supabase replaces persistence, not the governance boundaries.
