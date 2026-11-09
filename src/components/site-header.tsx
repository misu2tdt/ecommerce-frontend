import Link from "next/link";
import { logoutAction } from "@/features/auth/actions";
import { getCurrentUser } from "@/features/auth/current-user";
import { resolveHeaderSession } from "@/features/auth/header-session";
import { getSessionToken } from "@/features/auth/session";
import { SITE_NAME } from "@/lib/site";
import { DemoAccountsLink } from "./demo-accounts-link";
import { HeaderAuth } from "./header-auth";
import { HeaderSearch } from "./header-search";
import { MobileNav } from "./mobile-nav";
import { NavMegaMenu } from "./nav-mega-menu";

export async function SiteHeader() {
  // A failed check (rate limit, server error, network) is not "signed out": the
  // header keeps the signed-in view and the reason goes to the server log.
  const session = await resolveHeaderSession({
    hasSession: async () => (await getSessionToken()) !== null,
    loadUser: () => getCurrentUser(),
    log: (message) => console.warn(message),
  });
  // The drawer only needs to know whether to offer account links.
  const drawerUser =
    session.kind === "user"
      ? session.user
      : session.kind === "unverified"
        ? { email: "", role: "user" }
        : null;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md">
      {/* Announcement Bar */}
      <div className="bg-brand-strong px-4 py-2 text-center text-body-sm text-neutral-200">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 sm:gap-3">
          {/* One message on phones, two from sm, all three from md: never wraps */}
          <span>Curated everyday essentials</span>
          <span className="hidden text-neutral-600 md:inline">•</span>
          <span className="hidden md:inline">Prices shown in VND</span>
          <span className="hidden text-neutral-600 sm:inline">•</span>
          <span className="hidden sm:inline">Verified customer reviews</span>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4 sm:gap-4 sm:px-6 lg:px-8">
          {/* Left: Mobile trigger & Brand Logo */}
          <div className="flex min-w-0 items-center gap-1 sm:gap-3">
            <MobileNav user={drawerUser} />
            <Link
              href="/"
              aria-label={SITE_NAME}
              className="flex min-w-0 items-center gap-1 sm:gap-1.5 overflow-hidden whitespace-nowrap text-title font-bold tracking-tight text-brand-strong focus-visible:outline-2 focus-visible:outline-brand"
            >
              <span className="tracking-wide sm:tracking-widest">VERVE</span>
              <span className="hidden text-body-sm font-semibold tracking-wide text-neutral-600 min-[400px]:inline sm:tracking-widest">STUDIO</span>
            </Link>
          </div>

          {/* Center: Desktop Mega Navigation (needs ~1280px; below that the drawer is used) */}
          <div className="hidden xl:flex xl:min-w-0 xl:flex-1 xl:justify-center">
            <NavMegaMenu />
          </div>

          {/* Right: Search, Wishlist, Cart, Account */}
          {/* From xl, tighter gaps (and 8px less padding on the text buttons) leave the category menu room to spare, even for an admin and with wider fonts */}
          <div className="flex shrink-0 items-center gap-0.5 sm:gap-2 xl:gap-1">
            {/* Desktop Search */}
            {/* Narrower where the bar is full: 128px at 768px and from 1280px, where the category menu sits beside it and an admin has one more button. The 128px minimum keeps it usable. */}
            <div className="hidden w-32 md:block lg:w-60 xl:w-32">
              <HeaderSearch id="desktop-header-search-input" />
            </div>

            {/* Wishlist Link */}
            <Link
              href="/wishlist"
              aria-label="View saved wishlist items"
              className="inline-flex h-11 w-11 items-center justify-center rounded-md text-neutral-700 transition hover:bg-brand-soft hover:text-brand-strong focus-visible:outline-2 focus-visible:outline-brand"
            >
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
                  d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                />
              </svg>
            </Link>

            {/* Shopping Cart Link */}
            <Link
              href="/cart"
              aria-label="View shopping cart"
              className="inline-flex h-11 w-11 items-center justify-center rounded-md text-neutral-700 transition hover:bg-brand-soft hover:text-brand-strong focus-visible:outline-2 focus-visible:outline-brand"
            >
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
                  d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                />
              </svg>
            </Link>

            {/* Auth Navigation */}
            <HeaderAuth session={session} signOut={logoutAction} />

            {/* Always the last item; from md up (phones get it in the drawer) */}
            <DemoAccountsLink />
          </div>
        </div>
      </div>
    </header>
  );
}
