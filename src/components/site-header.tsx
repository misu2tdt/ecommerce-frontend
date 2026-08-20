import Link from "next/link";
import { Suspense } from "react";
import { logoutAction } from "@/features/auth/actions";
import { getCurrentUser } from "@/features/auth/current-user";

const navLinkClass =
  "rounded px-2 py-2 text-sm font-semibold text-slate-700 hover:text-emerald-800 focus-visible:outline-2 focus-visible:outline-emerald-800";

export function SiteHeader() {
  return (
    <header className="border-b border-emerald-950/10 bg-white">
      <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-6 py-2">
        <Link
          href="/"
          className="text-lg font-bold tracking-tight text-emerald-950 focus-visible:outline-2 focus-visible:outline-emerald-800"
        >
          Evergreen Store
        </Link>
        <nav
          aria-label="Primary navigation"
          className="flex min-h-11 items-center gap-1"
        >
          <Link href="/products" className={navLinkClass}>
            Products
          </Link>
          <Suspense fallback={<GuestNavigation />}>
            <AuthNavigation />
          </Suspense>
        </nav>
      </div>
    </header>
  );
}

async function AuthNavigation() {
  let user = null;
  try {
    user = await getCurrentUser();
  } catch {
    // Keep public navigation usable while the auth backend is unavailable.
  }

  if (!user) return <GuestNavigation />;

  return (
    <>
      {user.role === "admin" && (
        <Link href="/admin" className={navLinkClass}>
          Admin
        </Link>
      )}
      <Link href="/cart" className={navLinkClass}>
        Cart
      </Link>
      <Link href="/wishlist" className={navLinkClass}>
        Wishlist
      </Link>
      <Link href="/account" className={navLinkClass}>
        Account
      </Link>
      <form action={logoutAction}>
        <button
          type="submit"
          className="min-h-10 rounded px-2 py-2 text-sm font-semibold text-slate-700 hover:text-emerald-800 focus-visible:outline-2 focus-visible:outline-emerald-800"
        >
          Logout
        </button>
      </form>
    </>
  );
}

function GuestNavigation() {
  return (
    <>
      <Link href="/login" className={navLinkClass}>
        Login
      </Link>
      <Link href="/register" className={navLinkClass}>
        Register
      </Link>
    </>
  );
}
