import { ApiError } from "@/lib/api";
import type { CurrentUser } from "@/types/auth";

// What the header knows about the visitor.
//  - user: the backend confirmed who is signed in
//  - guest: there is no session, or the backend said the session is not valid
//    (a real 401)
//  - unverified: there IS a session cookie but the check failed for another
//    reason (rate limit, server error, network). The visitor is probably still
//    signed in, so the header must not show "Sign In" as if they were not.
export type HeaderSession =
  | { kind: "user"; user: CurrentUser }
  | { kind: "guest" }
  | { kind: "unverified" };

export interface HeaderSessionDeps {
  hasSession: () => Promise<boolean>;
  // Resolves to null for a real 401; any other failure throws.
  loadUser: () => Promise<CurrentUser | null>;
  // Where the reason goes (the server log), never to the visitor.
  log: (message: string) => void;
}

export async function resolveHeaderSession(
  deps: HeaderSessionDeps,
): Promise<HeaderSession> {
  if (!(await deps.hasSession())) return { kind: "guest" };

  try {
    const user = await deps.loadUser();
    return user ? { kind: "user", user } : { kind: "guest" };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return { kind: "guest" };
    }
    const reason =
      error instanceof ApiError
        ? error.status === 0
          ? "network error"
          : `status ${error.status}`
        : "unexpected error";
    deps.log(`Header session check failed (${reason}); keeping the signed-in view`);
    return { kind: "unverified" };
  }
}

// Which parts of the account area of the header to show.
export interface HeaderAuthView {
  signIn: boolean;
  register: boolean;
  account: boolean;
  admin: boolean;
  signOut: boolean;
}

export function headerAuthView(session: HeaderSession): HeaderAuthView {
  if (session.kind === "guest") {
    return {
      signIn: true,
      register: true,
      account: false,
      admin: false,
      signOut: false,
    };
  }
  return {
    signIn: false,
    register: false,
    account: true,
    // Only a confirmed admin gets the Admin link; an unchecked session never does.
    admin: session.kind === "user" && session.user.role === "admin",
    signOut: true,
  };
}