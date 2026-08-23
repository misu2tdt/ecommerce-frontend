# Evergreen Store frontend

Next.js App Router storefront and administration UI for the Evergreen Store
NestJS API.

## Local development

Start the backend on port 3000, then configure and run the frontend on port
3001:

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open `http://localhost:3001`. `NEXT_PUBLIC_API_BASE_URL` must contain the
backend origin, normally `http://localhost:3000` for local development.

Authentication tokens remain in a Next.js-owned HttpOnly cookie. Protected
browser operations go through Server Components or Server Actions and the
authenticated server-side API helper; do not put JWTs in browser storage or
client props.

## Verification

```powershell
npm run lint
npm run typecheck
npm run build
```

Cloudinary uploads and MoMo confirmation remain backend-owned. Real provider
credentials are not required to build or run the normal local UI.
