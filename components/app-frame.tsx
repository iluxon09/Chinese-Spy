"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AppSidebar from "@/components/app-sidebar";
import { isPublicPricingPath } from "@/lib/auth/redirect";
import { ThemeToggle } from "@/components/theme-provider";

export default function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();

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
              <span className="text-xl font-extrabold tracking-[.16em] text-white">TILT<span className="text-emerald-300">.</span></span>
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
      <AppSidebar />
      <div className="app-main-content" id="main-content" tabIndex={-1}>
        {children}
      </div>
    </div>
  );
}
