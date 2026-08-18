const LOCAL_ORIGIN = "http://local.invalid";

export function safeInternalPath(
  value: string | string[] | null | undefined,
  fallback = "/",
): string {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (
    !candidate ||
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(candidate)
  ) {
    return fallback;
  }

  try {
    const url = new URL(candidate, LOCAL_ORIGIN);
    if (url.origin !== LOCAL_ORIGIN) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export function buildLoginHref(nextPath: string): string {
  const safeNext = safeInternalPath(nextPath, "/");
  return `/login?${new URLSearchParams({ next: safeNext })}`;
}
