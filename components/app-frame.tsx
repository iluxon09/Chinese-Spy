"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import AppSidebar, { appNavigation } from "@/components/app-sidebar";
import AccountControl from "@/components/account-control";

export default function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (pathname === "/login") return <>{children}</>;

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
