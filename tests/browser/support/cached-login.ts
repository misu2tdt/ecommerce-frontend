import {
  expect,
  type APIRequestContext,
  type Cookie,
  type Page,
} from "@playwright/test";
import { API_URL, PASSWORD, signIn } from "./shop";

// Logins are rationed: the backend allows 20 a minute per email. The specs that
// use this sign in through the sign-in page once per email (the session cookies
// are reused by every later test, in this file and in the next one of the same
// worker) and renew only before the 15-minute token could run out; the API
// token is cached the same way and renewed only after a 401. The count of every
// login made through here is kept, so a run can show how close it came to the
// limit.

const SESSION_MAX_AGE_MS = 8 * 60_000;

const counts: Record<string, number> = {};
function count(kind: string, email: string) {
  const key = `${email} (${kind})`;
  counts[key] = (counts[key] ?? 0) + 1;
}

// How many logins this worker made through here, per email and kind.
export const loginsPerformed = () => ({ ...counts });

const sessions = new Map<string, { cookies: Cookie[]; at: number }>();

// Signs the page's browser context in as `email`: through the sign-in page the
// first time, with the saved cookies afterwards.
export async function signInOnce(
  page: Page,
  email: string,
  next = "/account",
): Promise<void> {
  const saved = sessions.get(email);
  if (saved && Date.now() - saved.at <= SESSION_MAX_AGE_MS) {
    await page.context().addCookies(saved.cookies);
    return;
  }
  count("browser", email);
  await signIn(page, email, next);
  sessions.set(email, {
    cookies: await page.context().cookies(),
    at: Date.now(),
  });
}

const tokens = new Map<string, string>();

async function apiToken(
  request: APIRequestContext,
  email: string,
  renew: boolean,
): Promise<string> {
  const saved = tokens.get(email);
  if (saved && !renew) return saved;
  count("api", email);
  const response = await request.post(`${API_URL}/auth/login`, {
    data: { email, password: PASSWORD },
  });
  expect(
    response.ok(),
    `API login answered ${response.status()} (the limit is 20 a minute per email)`,
  ).toBe(true);
  const token = ((await response.json()) as { access_token: string })
    .access_token;
  tokens.set(email, token);
  return token;
}

// One request as `email` with the cached token; a 401 means the token ran out,
// so it is renewed and the request is sent once more.
export async function apiAs(
  request: APIRequestContext,
  email: string,
  method: "GET" | "POST" | "DELETE",
  path: string,
) {
  const send = async (renew: boolean) =>
    request.fetch(`${API_URL}${path}`, {
      method,
      headers: { Authorization: `Bearer ${await apiToken(request, email, renew)}` },
    });
  const first = await send(false);
  return first.status() === 401 ? send(true) : first;
}
