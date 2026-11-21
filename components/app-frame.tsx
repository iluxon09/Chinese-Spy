"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AppSidebar, { appNavigation } from "@/components/app-sidebar";
import AccountControl from "@/components/account-control";
import { isPublicPricingPath } from "@/lib/auth/redirect";
import { Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme-provider";

export default function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileMenuOpen(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileMenuOpen]);

  if (pathname === "/login") {
    return (
      <>
        {children}
        <div className="auth-theme-toggle">
          <ThemeToggle compact />
        </div>
      </>
    );
  }

  if (isPublicPricingPath(pathname)) {
    return (
      <div className="tilt-public min-h-screen">
        <a
          href="#public-main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-emerald-300 focus:px-4 focus:py-2 focus:font-semibold focus:text-slate-950"
        >
          Skip to content
        </a>
        <header className="tilt-public-header">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-8">
            <Link href="/pricing" className="inline-flex items-center gap-3" aria-label="TILT pricing home">
              <span className="tilt-public-mark">
                T
              </span>
              <span className="leading-tight">
                <strong className="block text-lg tracking-tight">TILT<span className="text-emerald-300">.</span></strong>
                <span className="block text-[10px] font-semibold tracking-[.2em] text-slate-400">
                  FINANCIAL UNIVERSE
                </span>
              </span>
            </Link>
            <div className="tilt-public-header-actions">
              <ThemeToggle compact />
              <Link
                href="/login"
                className="inline-flex min-h-10 items-center justify-center rounded-lg px-4 py-2 text-sm font-bold transition"
              >
                Sign in / Open workspace
              </Link>
            </div>
          </div>
        </header>
        <div id="public-main-content" tabIndex={-1}>{children}</div>
      </div>
    );
  }

  return (
    <div className="app-frame tilt-product">
      <a className="skip-link" href="#main-content">Skip to content</a>

      <header className="mobile-app-header">
        <Link href="/" className="mobile-app-brand" onClick={() => setMobileMenuOpen(false)}>
          <span className="app-sidebar-mark">T</span>
          <span>TILT<span>.</span></span>
        </Link>
        <div className="mobile-app-header-actions">
          <ThemeToggle compact />
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
        </div>
      </header>

      {mobileMenuOpen && (
        <>
          <button
            type="button"
            className="mobile-navigation-backdrop"
            aria-label="Close navigation"
            onClick={() => setMobileMenuOpen(false)}
          />
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
        </>
      )}

      <div className="app-frame-body">
        <AppSidebar />
        <div className="app-main-content" id="main-content" tabIndex={-1}>{children}</div>
      </div>
    </div>
  );
}
