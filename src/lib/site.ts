// One name for the storefront: metadata, page descriptions and visible copy
// import it from here instead of repeating the string.
export const SITE_NAME = "VERVE STUDIO";

// The two source repositories, linked from the About page. Both are public
// (checked with `git remote get-url origin` and an unauthenticated request).
export const REPOSITORIES = {
  frontend: "https://github.com/misu2tdt/ecommerce-frontend",
  backend: "https://github.com/misu2tdt/ecommerce-backend",
} as const;
