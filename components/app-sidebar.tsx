"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  ChartNoAxesCombined,
  Activity,
  BriefcaseBusiness,
  CircleDollarSign,
  BookOpen,
  Settings,
  BrainCircuit,
  FileSpreadsheet,
  Menu,
  X,
} from "lucide-react";

const navigation = [
  { label: "Overview", href: "/", icon: LayoutDashboard },
  { label: "Markets", href: "/markets", icon: ChartNoAxesCombined },
  { label: "Trading", href: "/trading", icon: Activity },
  { label: "Portfolio", href: "/portfolio", icon: BriefcaseBusiness },
  { label: "Behaviour", href: "/behaviour", icon: CircleDollarSign },
  { label: "Trading Psychology", href: "/portfolio/insights", icon: BrainCircuit },
  { label: "Trade Analyzer", href: "/portfolio/history", icon: FileSpreadsheet },
  { label: "Simulator", href: "/simulator", icon: Activity },
  { label: "Academy", href: "/academy", icon: BookOpen },
];

export default function AppSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b border-white/10 bg-[#0B1120] px-4 md:hidden">
        <Link href="/" onClick={() => setOpen(false)} aria-label="TILT home">
          <span className="text-2xl font-black tracking-widest text-emerald-400">
            TILT<span className="text-white">.</span>
          </span>
        </Link>
        <button
          type="button"
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open}
          aria-controls="primary-navigation"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex size-10 items-center justify-center rounded-lg border border-white/10 text-slate-200 transition hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
        />
      )}

      <aside
        id="primary-navigation"
        className={`${open ? "fixed inset-y-0 left-0 z-50 flex" : "hidden"} min-h-screen w-64 shrink-0 flex-col border-r border-white/10 bg-[#0B1120] p-6 md:sticky md:top-0 md:flex md:h-screen`}
      >
        <Link href="/" onClick={() => setOpen(false)} className="mb-12 block">
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
        <nav aria-label="Primary navigation" className="space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 ${
                  active
                    ? "bg-emerald-400/10 font-semibold text-emerald-400"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon size={18} aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto rounded-xl border border-white/10 p-4">
          <Settings size={18} aria-hidden="true" className="mb-3 text-slate-400" />
          <p className="text-sm font-medium">Simulation Mode</p>
          <p className="mt-1 text-xs text-emerald-400">Virtual environment active</p>
        </div>
      </aside>
    </>
  );
}
