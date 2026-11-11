// A collection's cover picture is an address an admin typed in, so it may be on
// any host. Only the image host the shop uses (see next.config.ts) can go through
// the image optimizer; any other address is shown as it is.
const OPTIMIZED_HOSTS = ["res.cloudinary.com"];

export function isOptimizableImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && OPTIMIZED_HOSTS.includes(parsed.hostname);
  } catch {
    return false;
  }
}

// Whether the address can be used as a picture at all (http or https only).
export function isHttpImageUrl(url: string): boolean {
  try {
    return ["http:", "https:"].includes(new URL(url).protocol);
  } catch {
    return false;
  }
}
