// One name for the storefront: metadata, page descriptions and visible copy
// import it from here instead of repeating the string.
export const SITE_NAME = "VERVE STUDIO";

// The sample accounts of the public demo (the ones `seed:demo:production` creates
// in the backend). Shown on the Demo accounts page and the About page; the same
// password is public on purpose. Never put a real account here.
export const DEMO_ACCOUNTS = {
  customer: { email: "demo.customer@example.com", password: "DemoOnly!2026" },
  admin: { email: "demo.admin@example.com", password: "DemoOnly!2026" },
} as const;

export const DEMO_ACCOUNTS_PATH = "/demo-accounts";

// The two source repositories, linked from the About page. Both are public
// (checked with `git remote get-url origin` and an unauthenticated request).
export const REPOSITORIES = {
  frontend: "https://github.com/misu2tdt/ecommerce-frontend",
  backend: "https://github.com/misu2tdt/ecommerce-backend",
} as const;
