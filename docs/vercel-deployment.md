# Vercel deployment

Import this independent repository as a Next.js project. Vercel's standard
framework build is sufficient; no `vercel.json` is required.

## Configuration

Define `NEXT_PUBLIC_API_BASE_URL` for the Production environment before the
first build. It must be the canonical HTTPS origin of the Render backend. This
is public routing configuration and is frozen into the generated frontend at
build time, so changing it requires a new deployment.

Do not configure backend JWT, database, Cloudinary, Telegram, or MoMo secrets in
Vercel. No JWT is passed to Client Components or browser storage.

## Authentication topology

Login is a Server Action. The Vercel Next.js server calls Render and stores the
returned JWT in a host-only Vercel cookie with `HttpOnly`, `Secure` in
production, `SameSite=Lax`, and path `/`. Server Components and Server Actions
read that cookie and call Render through `authenticatedApiFetch()`.

Because browser authentication requests stay on the Vercel origin, the cookie
must not set a Render domain and does not need `SameSite=None`. The backend's
`FRONTEND_ORIGIN` must exactly equal the canonical Vercel production origin.

## Deploy and smoke

1. Complete Neon migrations and deploy the Render backend first.
2. Confirm the Render `/health` endpoint returns 200.
3. Set `NEXT_PUBLIC_API_BASE_URL` in Vercel Production and deploy.
4. Set Render `FRONTEND_ORIGIN` to the final Vercel production origin and
   manually redeploy Render if it changed.
5. Smoke catalog/product routes, login, account, customer ADMIN denial, and
   verified ADMIN access.
6. Confirm the JWT appears only as an HttpOnly cookie and not in localStorage,
   sessionStorage, page props, or browser JavaScript.

Vercel Preview deployments use different origins. They are intentionally not
accepted by the single production CORS allowlist; use a separate backend or a
deliberately changed exact allowlist before testing authenticated previews.
