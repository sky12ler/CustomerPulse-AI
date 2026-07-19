# Deployment

## 1. Imported Workspace

No database or login setup is required. Imported Workspace is intentionally browser-local and isolated. The Supabase migrations are optional artifacts for a future authenticated multi-user edition, not a dependency of this deployment.

## 2. Vercel environment

Required for live MiMo AVO:

```text
MIMO_API_KEY
MIMO_BASE_URL=https://api.xiaomimimo.com/v1
MIMO_MODEL=mimo-v2.5-pro
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
5. Select Imported Workspace, import the connected three-file scenario pack and refresh the same browser.
6. Verify AVO’s returned provider label, approval separation, withdrawn-consent exclusion, audit before/after and the Account Executive’s assignment-scoped customer route.
7. Run the full production Playwright command in `docs/TESTING.md`.

Demo Workspace, Demo AVO and Demo Publisher remain usable if external providers are unavailable. Fallbacks are labelled rather than silently substituted.
