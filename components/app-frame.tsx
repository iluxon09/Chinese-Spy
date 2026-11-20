"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AppSidebar, { appNavigation } from "@/components/app-sidebar";
import AccountControl from "@/components/account-control";
import { isPublicPricingPath } from "@/lib/auth/redirect";
import { Menu, X } from "lucide-react";

export default function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (pathname === "/login") return <>{children}</>;

  if (isPublicPricingPath(pathname)) {
    return (
      <div className="min-h-screen bg-[#080d18] text-slate-100">
        <a
          href="#public-main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-emerald-300 focus:px-4 focus:py-2 focus:font-semibold focus:text-slate-950"
        >
          Skip to content
        </a>
        <header className="border-b border-white/10 bg-[#0b1423]">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-8">
            <Link href="/pricing" className="inline-flex items-center gap-3" aria-label="TILT pricing home">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-300 text-lg font-black text-slate-950">
                T
              </span>
              <span className="leading-tight">
                <strong className="block text-lg tracking-tight">TILT<span className="text-emerald-300">.</span></strong>
                <span className="block text-[10px] font-semibold tracking-[.2em] text-slate-400">
                  FINANCIAL UNIVERSE
                </span>
              </span>
            </Link>
            <Link
              href="/login"
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-emerald-300/50 hover:bg-white/5"
            >
              Sign in / Open workspace
            </Link>
          </div>
        </header>
        <div id="public-main-content">{children}</div>
      </div>
    );
  }

  return (
    <div className="app-frame">
      <a className="skip-link" href="#main-content">Skip to content</a>

      <header className="mobile-app-header">
        <Link href="/" className="mobile-app-brand" onClick={() => setMobileMenuOpen(false)}>
          <span className="app-sidebar-mark">T</span>
          <span>TILT<span>.</span></span>
        </Link>
        <button
          type="button"
          className="mobile-menu-toggle"
          onClick={() => setMobileMenuOpen((open) => !open)}
          aria-label={mobileMenuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-app-navigation"
        >
          {mobileMenuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
      </header>

      {mobileMenuOpen && (
        <div className="mobile-navigation-panel" id="mobile-app-navigation">
          <nav className="mobile-navigation-list" aria-label="Mobile navigation">
            {appNavigation.map(({ label, href, icon: Icon }) => {
              const active = href === "/"
                ? pathname === "/"
                : pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={active ? "mobile-nav-link is-active" : "mobile-nav-link"}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Icon size={18} aria-hidden="true" />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>
          <AccountControl compact />
        </div>
      )}

      <div className="app-frame-body">
        <AppSidebar />
        <div className="app-main-content" id="main-content">{children}</div>
      </div>
    </div>
  );
}
