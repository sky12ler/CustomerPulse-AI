# Architecture

The browser renders one responsive operational shell across 15 App Router routes. `lib/demo-data.ts` provides the no-credential domain store; production adapters use Supabase. Server routes call `AIProvider` (`OpenAIProvider` or `DemoAVOProvider`) and `SocialPublisher` (`BufferPublisher` or `DemoSocialPublisher`). Secrets never enter client components.

Data flows from confirmed import to customer/conversation records, deterministic tier/churn calculation, alert, validated AVO analysis, editable recommendation, role-based approval, explicit execution and immutable audit outcome. Campaigns add segment trigger, consented audience, approved document chunks, versioned content, approval and idempotent schedule. Every table contains `organization_id`; RLS resolves it from the authenticated profile.

The verified no-credential runtime uses in-memory UI workflow state and resets on reload. The normalized Supabase migration, RLS and reset loader are deployment-ready artifacts, but the current client does not persist interactive mutations to Supabase. That integration and a live two-tenant test are explicitly outstanding.
