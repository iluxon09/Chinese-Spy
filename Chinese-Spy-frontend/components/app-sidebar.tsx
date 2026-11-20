"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ChartNoAxesCombined,
  Activity,
  BriefcaseBusiness,
  CircleDollarSign,
  BookOpen,
  Settings,
} from "lucide-react";

const navigation = [
  { label: "Overview", href: "/", icon: LayoutDashboard },
  { label: "Markets", href: "/markets", icon: ChartNoAxesCombined },
  { label: "Trading", href: "/trading", icon: Activity },
  { label: "Portfolio", href: "/portfolio", icon: BriefcaseBusiness },
  { label: "Behaviour", href: "/behaviour", icon: CircleDollarSign },
  { label: "Simulator", href: "/simulator", icon: Activity },
  { label: "Academy", href: "/academy", icon: BookOpen },
];

export default function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex min-h-screen w-64 shrink-0 flex-col border-r border-white/10 bg-[#0B1120] p-6">
      <Link href="/" className="mb-12 block">
        <h1 className="text-3xl font-black tracking-widest text-emerald-400">
          TILT<span className="text-white">.</span>
        </h1>
        <p className="mt-2 text-xs tracking-widest text-slate-500">
          FINANCIAL UNIVERSE
        </p>
      </Link>

      <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500">
        Workspace
      </p>

      <nav className="space-y-2">
        {navigation.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href ||
                pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm ${
                active
                  ? "bg-emerald-400/10 font-semibold text-emerald-400"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <Settings size={18} className="mb-3 text-slate-400" />
        <p className="text-sm font-medium">Simulation Mode</p>
        <p className="mt-1 text-xs text-emerald-400">
          Virtual environment active
        </p>
      </div>
    </aside>
  );
}