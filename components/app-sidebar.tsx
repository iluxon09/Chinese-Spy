"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, ChartNoAxesCombined, Activity, BriefcaseBusiness,
  BookOpen, Calculator, Brain, ShieldCheck, CreditCard, type LucideIcon,
} from "lucide-react";
import AccountControl from "@/components/account-control";

export const appNavigation: Array<{ label: string; href: string; icon: LucideIcon }> = [
  { label: "Overview", href: "/", icon: LayoutDashboard },
  { label: "Markets", href: "/markets", icon: ChartNoAxesCombined },
  { label: "Trading", href: "/trading", icon: Activity },
  { label: "Portfolio", href: "/portfolio", icon: BriefcaseBusiness },
  { label: "Simulator", href: "/simulator", icon: Activity },
  { label: "Crash Replay", href: "/crash-replay", icon: ShieldCheck },
  { label: "Behavioral Analysis", href: "/behaviour", icon: Brain },
  { label: "Finance Academy", href: "/academy", icon: BookOpen },
  { label: "Investment Architect", href: "/portfolio/architect", icon: Calculator },
  { label: "Pricing & Plans", href: "/pricing", icon: CreditCard },
];

const navigationGroups = [
  { label: "MARKET WORKSPACE", hrefs: ["/", "/markets", "/trading", "/portfolio", "/simulator"] },
  { label: "RISK & DECISIONS", hrefs: ["/crash-replay", "/behaviour"] },
  { label: "LEARN & PLAN", hrefs: ["/academy", "/portfolio/architect", "/pricing"] },
];

function isActivePath(pathname: string, href: string) {
  return href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(`${href}/`);
}

export default function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="app-sidebar">
      <Link href="/" className="app-sidebar-brand" aria-label="TILT home">
        <span className="app-sidebar-mark">T</span>
        <span>
          <strong>TILT<span>.</span></strong>
          <small>FINANCIAL UNIVERSE</small>
        </span>
      </Link>

      <nav className="app-sidebar-nav" aria-label="Main navigation">
        {navigationGroups.map((group) => (
          <section className="app-sidebar-group" key={group.label} aria-label={group.label}>
            <p className="app-sidebar-group-label">{group.label}</p>
            {appNavigation
              .filter(({ href }) => group.hrefs.includes(href))
              .map(({ label, href, icon: Icon }) => {
                const active = isActivePath(pathname, href);
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={active ? "app-nav-link is-active" : "app-nav-link"}
                  >
                    <Icon size={17} strokeWidth={1.9} aria-hidden="true" />
                    <span>{label}</span>
                  </Link>
                );
              })}
          </section>
        ))}
      </nav>

      <div className="app-sidebar-footer">
        <div className="app-simulation-note">
          <span className="app-simulation-indicator" />
          <div>
            <strong>Simulation environment</strong>
            <small>Virtual capital · No real money</small>
          </div>
        </div>
        <AccountControl />
      </div>
    </aside>
  );
}
