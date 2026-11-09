import Link from "next/link";
import {
  headerAuthView,
  type HeaderSession,
} from "@/features/auth/header-session";
import { buttonStyles } from "./ui/button";

const iconLink =
  "inline-flex h-11 w-11 items-center justify-center rounded-md text-neutral-700 transition hover:bg-brand-soft hover:text-brand-strong focus-visible:outline-2 focus-visible:outline-brand";

// The account part of the header. "Sign In" appears only for a real guest: when
// a session exists but could not be checked right now, the visitor still sees the
// account link (and Sign Out), not a sign-in prompt.
export function HeaderAuth({
  session,
  signOut,
}: {
  session: HeaderSession;
  signOut: () => Promise<void>;
}) {
  const view = headerAuthView(session);
  if (view.signIn) return <GuestAuthButtons />;

  return (
    <div className="flex items-center gap-0.5 sm:gap-1.5">
      {view.admin && (
        <Link
          href="/admin"
          className={buttonStyles({
            variant: "secondary",
            size: "sm",
            className: "max-sm:hidden xl:px-2",
          })}
        >
          Admin
        </Link>
      )}
      <Link href="/account" aria-label="View account profile" className={iconLink}>
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="1.75"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
          />
        </svg>
      </Link>
      <form action={signOut} className="hidden sm:inline-block">
        <button
          type="submit"
          className={buttonStyles({ variant: "ghost", size: "sm", className: "xl:px-2" })}
        >
          Sign Out
        </button>
      </form>
    </div>
  );
}

function GuestAuthButtons() {
  return (
    <div className="flex items-center gap-0.5 sm:gap-1.5">
      <Link
        href="/login"
        className={buttonStyles({ variant: "ghost", size: "sm" })}
      >
        Sign In
      </Link>
      <Link
        href="/register"
        className={buttonStyles({
          variant: "primary",
          size: "sm",
          className: "max-sm:hidden",
        })}
      >
        Register
      </Link>
    </div>
  );
}
