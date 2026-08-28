import Link from "next/link";
import { Suspense } from "react";
import { logoutAction } from "@/features/auth/actions";
import { getCurrentUser } from "@/features/auth/current-user";
import { HeaderSearch } from "./header-search";
import { MobileNav } from "./mobile-nav";
import { NavMegaMenu } from "./nav-mega-menu";

export async function SiteHeader() {
  let user = null;
  try {
    user = await getCurrentUser();
  } catch {
    // Keep public navigation usable if auth service has transient issue
  }

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md">
      {/* Announcement Bar */}
      <div className="bg-slate-950 px-4 py-2 text-center text-xs font-medium text-slate-200">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 sm:gap-3">
          <span>Curated everyday essentials</span>
          <span className="hidden text-slate-600 sm:inline">•</span>
          <span className="hidden sm:inline">Transparent integer VND pricing</span>
          <span className="hidden text-slate-600 sm:inline">•</span>
          <span>Verified customer reviews</span>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="border-b border-slate-200/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          {/* Left: Mobile trigger & Brand Logo */}
          <div className="flex items-center gap-3">
            <MobileNav user={user} />
            <Link
              href="/"
              className="flex items-center gap-1.5 text-lg font-black tracking-tight text-slate-950 focus-visible:outline-2 focus-visible:outline-slate-950"
            >
              <span className="tracking-widest">VERVE</span>
              <span className="text-xs font-semibold tracking-widest text-slate-500">STUDIO</span>
            </Link>
          </div>

          {/* Center: Desktop Mega Navigation */}
          <div className="hidden lg:flex lg:flex-1 lg:justify-center">
            <NavMegaMenu />
          </div>

          {/* Right: Search, Wishlist, Cart, Account */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Desktop Search */}
            <div className="hidden w-48 md:block lg:w-60">
              <HeaderSearch id="desktop-header-search-input" />
            </div>

            {/* Wishlist Link */}
            <Link
              href="/wishlist"
              aria-label="View saved wishlist items"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-700 transition hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-slate-950"
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
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-700 transition hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-slate-950"
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
            <Suspense fallback={<GuestAuthButtons />}>
              <UserAuthSection user={user} />
            </Suspense>
          </div>
        </div>
      </div>
    </header>
  );
}

function UserAuthSection({
  user,
}: {
  user: { email: string; role: string } | null;
}) {
  if (!user) {
    return <GuestAuthButtons />;
  }

  return (
    <div className="flex items-center gap-1.5">
      {user.role === "admin" && (
        <Link
          href="/admin"
          className="hidden rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900 transition hover:bg-amber-200 focus-visible:outline-2 focus-visible:outline-amber-900 sm:inline-block"
        >
          Admin
        </Link>
      )}
      <Link
        href="/account"
        aria-label="View account profile"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-700 transition hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-slate-950"
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
            d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
          />
        </svg>
      </Link>
      <form action={logoutAction} className="hidden sm:inline-block">
        <button
          type="submit"
          className="rounded-full px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-slate-900"
        >
          Sign Out
        </button>
      </form>
    </div>
  );
}

function GuestAuthButtons() {
  return (
    <div className="flex items-center gap-1.5">
      <Link
        href="/login"
        className="rounded-full px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-slate-900"
      >
        Sign In
      </Link>
      <Link
        href="/register"
        className="hidden rounded-full bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-slate-900 sm:inline-block"
      >
        Register
      </Link>
    </div>
  );
}
