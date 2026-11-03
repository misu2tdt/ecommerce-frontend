import { expect, test } from "@playwright/test";
import {
  headerAuthView,
  resolveHeaderSession,
} from "@/features/auth/header-session";
import { ApiError } from "@/lib/api";
import type { CurrentUser } from "@/types/auth";

// The header must say "Sign In" only for a visitor who is really signed out. A
// session cookie whose check failed for a passing reason (rate limit, server
// error, network) still means a signed-in visitor.

const customer: CurrentUser = { id: 1, email: "a@example.test", role: "user" };
const admin: CurrentUser = { id: 2, email: "b@example.test", role: "admin" };

function session(options: {
  cookie: boolean;
  load: () => Promise<CurrentUser | null>;
}) {
  const logged: string[] = [];
  return {
    logged,
    resolve: () =>
      resolveHeaderSession({
        hasSession: () => Promise.resolve(options.cookie),
        loadUser: options.load,
        log: (message) => logged.push(message),
      }),
  };
}

test.describe("resolveHeaderSession", () => {
  test("no cookie is a guest, and the backend is not asked", async () => {
    let asked = false;
    const { resolve } = session({
      cookie: false,
      load: () => {
        asked = true;
        return Promise.resolve(customer);
      },
    });

    expect(await resolve()).toEqual({ kind: "guest" });
    expect(asked).toBe(false);
  });

  test("a confirmed user is a user", async () => {
    const { resolve } = session({ cookie: true, load: () => Promise.resolve(admin) });

    expect(await resolve()).toEqual({ kind: "user", user: admin });
  });

  test("a real 401 (the backend returned no user) means signed out", async () => {
    const { resolve, logged } = session({
      cookie: true,
      load: () => Promise.resolve(null),
    });

    expect(await resolve()).toEqual({ kind: "guest" });
    expect(logged).toEqual([]);
  });

  test("a 401 thrown as an error also means signed out", async () => {
    const { resolve } = session({
      cookie: true,
      load: () => Promise.reject(new ApiError("expired", 401)),
    });

    expect(await resolve()).toEqual({ kind: "guest" });
  });

  for (const [name, error] of [
    ["a rate limit (429)", new ApiError("Too Many Requests", 429)],
    ["a server error (500)", new ApiError("Internal error", 500)],
    ["a bad gateway (502)", new ApiError("Bad gateway", 502)],
    ["a network failure", new ApiError("Service is temporarily unavailable.", 0)],
    ["an unexpected error", new Error("boom")],
  ] as const) {
    test(`${name} keeps the visitor signed in and logs the reason`, async () => {
      const { resolve, logged } = session({
        cookie: true,
        load: () => Promise.reject(error),
      });

      expect(await resolve()).toEqual({ kind: "unverified" });
      expect(logged).toHaveLength(1);
      expect(logged[0]).toMatch(/Header session check failed/);
    });
  }

  test("the log never carries the visitor's token or email", async () => {
    const { resolve, logged } = session({
      cookie: true,
      load: () => Promise.reject(new ApiError("a@example.test token abc.def.ghi", 500)),
    });

    await resolve();

    expect(logged.join(" ")).not.toMatch(/example\.test|abc\.def/);
  });
});

test.describe("headerAuthView", () => {
  test("a guest sees Sign In and Register", () => {
    expect(headerAuthView({ kind: "guest" })).toEqual({
      signIn: true,
      register: true,
      account: false,
      admin: false,
      signOut: false,
    });
  });

  test("a signed-in visitor sees the account link, not Sign In", () => {
    expect(headerAuthView({ kind: "user", user: customer })).toEqual({
      signIn: false,
      register: false,
      account: true,
      admin: false,
      signOut: true,
    });
  });

  test("an admin also sees the Admin link", () => {
    expect(headerAuthView({ kind: "user", user: admin }).admin).toBe(true);
  });

  test("a session that could not be checked shows the signed-in view, without Admin", () => {
    expect(headerAuthView({ kind: "unverified" })).toEqual({
      signIn: false,
      register: false,
      account: true,
      admin: false,
      signOut: true,
    });
  });

  test("every transient failure ends in the signed-in view", async () => {
    for (const status of [429, 500, 502, 503, 504, 0]) {
      const { resolve } = session({
        cookie: true,
        load: () => Promise.reject(new ApiError("x", status)),
      });
      const view = headerAuthView(await resolve());
      expect(view.signIn, `status ${status}`).toBe(false);
      expect(view.account, `status ${status}`).toBe(true);
    }
  });
});