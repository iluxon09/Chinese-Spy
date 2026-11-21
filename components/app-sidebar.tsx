"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ChartNoAxesCombined,
  Activity,
  BriefcaseBusiness,
  BookOpen,
  Calculator,
  Brain,
  MessageCircle,
  CreditCard,
  ChevronDown,
  UserRound,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import AccountControl from "@/components/account-control";
import { ThemeToggle } from "@/components/theme-provider";
import TiltLogo from "@/components/tilt-logo";

export const appNavigation: Array<{ label: string; href: string; icon: LucideIcon }> = [
  { label: "Overview", href: "/", icon: LayoutDashboard },
  { label: "Markets", href: "/markets", icon: ChartNoAxesCombined },
  { label: "Trading", href: "/trading", icon: Activity },
  { label: "Portfolio", href: "/portfolio", icon: BriefcaseBusiness },
  { label: "Simulator", href: "/simulator", icon: Activity },
  { label: "AI Risk Coach", href: "/coach", icon: MessageCircle },
  { label: "Behavioral Analysis", href: "/behaviour", icon: Brain },
  { label: "Finance Academy", href: "/academy", icon: BookOpen },
  { label: "Investment Architect", href: "/portfolio/architect", icon: Calculator },
  { label: "Pricing & Plans", href: "/pricing", icon: CreditCard },
];

const primaryLinks = appNavigation.slice(0, 5);
const researchLinks = appNavigation.slice(5);

function isActivePath(pathname: string, href: string) {
  return href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(`${href}/`);
}

export default function AppSidebar() {
  const pathname = usePathname();

  return (
    <header className="terminal-header">
      <Link href="/" className="terminal-brand" aria-label="TILT home">
        <TiltLogo className="terminal-brand-logo" priority />
        <span className="terminal-brand-divider" />
        <span className="terminal-brand-caption">FINANCIAL UNIVERSE</span>
      </Link>

      <nav className="terminal-main-nav" aria-label="Primary navigation">
        {primaryLinks.map(({ label, href, icon: Icon }) => {
          const active = isActivePath(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={active ? "terminal-nav-link is-active" : "terminal-nav-link"}
            >
              <Icon size={15} strokeWidth={1.8} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          );
        })}
        <details className="terminal-more-menu">
          <summary>
            Research <ChevronDown size={13} aria-hidden="true" />
          </summary>
          <div className="terminal-more-popover">
            {researchLinks.map(({ label, href, icon: Icon }) => {
              const active = isActivePath(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={active ? "is-active" : ""}
                >
                  <Icon size={15} aria-hidden="true" />
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>
        </details>
      </nav>

      <div className="terminal-header-actions">
        <Link href="/coach" className="terminal-coach-link">
          <MessageCircle size={15} aria-hidden="true" />
          <span>AI Risk Coach</span>
        </Link>
        <ThemeToggle compact />
        <details className="terminal-account-menu">
          <summary aria-label="Account menu">
            <span className="terminal-account-avatar">
              <UserRound size={17} />
            </span>
          </summary>
          <div className="terminal-account-popover">
            <AccountControl compact />
            <Link href="/settings/privacy" className="terminal-account-privacy-link">
              <ShieldCheck size={14} aria-hidden="true" />
              <span>Privacy & consent</span>
            </Link>
          </div>
        </details>
      </div>
    </header>
  );
}
