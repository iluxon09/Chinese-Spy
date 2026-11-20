"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, ChartNoAxesCombined, Activity, BriefcaseBusiness,
  BookOpen, Calculator, Brain, ShieldCheck, type LucideIcon,
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
];

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

      <p className="app-sidebar-label">WORKSPACE</p>
      <nav className="app-sidebar-nav" aria-label="Main navigation">
        {appNavigation.map(({ label, href, icon: Icon }) => {
          const active = href === "/"
            ? pathname === "/"
            : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={active ? "app-nav-link is-active" : "app-nav-link"}
            >
              <Icon size={18} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="app-sidebar-footer">
        <div className="app-simulation-note">
          <span className="app-simulation-indicator" />
          <div>
            <strong>Simulation mode</strong>
            <small>Virtual capital · No real money</small>
          </div>
        </div>
        <AccountControl />
      </div>
    </aside>
  );
}
