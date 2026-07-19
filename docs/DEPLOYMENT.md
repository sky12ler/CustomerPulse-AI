# Deployment

## 1. Supabase

Run these SQL files in order:

1. `supabase/migrations/202607180001_initial_schema.sql`
2. `supabase/migrations/202607190002_customer_assignment_rls.sql`
3. `supabase/migrations/202607190003_operational_workspace.sql`

Migration 003 is required by the current Imported Workspace. It creates per-entity operational records, Auth provisioning, assignment resolution, role-aware RLS, Realtime publication and append-only audit enforcement.

Create accounts through `/login`. Each new account defaults to `account_executive`. Edit and run `supabase/ROLE_SETUP.sql` for each elevated role. Do not use shared passwords in the repository.

## 2. Vercel environment

Required for Imported Workspace:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

Required for live MiMo AVO:

```text
XIAOMIMIMO_API_KEY
XIAOMIMIMO_BASE_URL
XIAOMIMIMO_MODEL=mimo-v2.5
```

Optional:

```text
BUFFER_API_KEY
BUFFER_ORGANIZATION_ID
NEXT_PUBLIC_APP_URL
```

Never use `NEXT_PUBLIC_` for service-role, MiMo or Buffer secrets.

## 3. Deploy and verify

1. Push the reviewed branch to GitHub.
2. Confirm Vercel’s Production environment has the variables.
3. Deploy/redeploy the production branch.
4. Open `/api/health` and verify the expected configured modes.
5. Sign in, select Imported Workspace, import the connected three-file scenario pack and refresh.
6. Verify AVO’s returned provider label, approval separation, withdrawn-consent exclusion, audit before/after and another Account Executive’s denied customer route.
7. Run the full production Playwright command in `docs/TESTING.md`.

Demo Workspace, Demo AVO and Demo Publisher remain usable if external providers are unavailable. Fallbacks are labelled rather than silently substituted.
