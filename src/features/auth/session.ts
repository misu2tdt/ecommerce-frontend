import "server-only";

import { cookies } from "next/headers";

const SESSION_COOKIE = "ecommerce_session";
const FALLBACK_SESSION_SECONDS = 24 * 60 * 60;

export async function getSessionToken(): Promise<string | null> {
  return (await cookies()).get(SESSION_COOKIE)?.value ?? null;
}

export async function setSessionToken(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: readJwtExpiration(token),
    priority: "high",
  });
}

export async function clearSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

function readJwtExpiration(token: string): Date {
  const fallback = new Date(Date.now() + FALLBACK_SESSION_SECONDS * 1000);

  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) return fallback;

    const payload = JSON.parse(
      Buffer.from(payloadPart, "base64url").toString("utf8"),
    ) as { exp?: unknown };
    if (
      typeof payload.exp !== "number" ||
      !Number.isSafeInteger(payload.exp) ||
      payload.exp <= Math.floor(Date.now() / 1000)
    ) {
      return fallback;
    }

    return new Date(payload.exp * 1000);
  } catch {
    return fallback;
  }
}
