"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, ChartNoAxesCombined, Activity, BriefcaseBusiness,
  BookOpen, Calculator, Upload, LogOut, UserRound, LoaderCircle, Brain,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const navigation = [
  { label: "Overview", href: "/", icon: LayoutDashboard },
  { label: "Markets", href: "/markets", icon: ChartNoAxesCombined },
  { label: "Trading", href: "/trading", icon: Activity },
  { label: "Portfolio", href: "/portfolio", icon: BriefcaseBusiness },
  { label: "Simulator", href: "/simulator", icon: Activity },
  { label: "Market Mirror", href: "/behaviour", icon: Brain },
  { label: "Finance Academy", href: "/academy", icon: BookOpen },
  { label: "Investment Architect", href: "/portfolio/architect", icon: Calculator },
  { label: "CSV Preview", href: "/portfolio/upload", icon: Upload },
];

export default function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let alive = true;

    void supabase.auth.getUser().then(({ data, error }) => {
      if (!alive) return;
      if (!error) setEmail(data.user?.email ?? null);
      setChecking(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user.email ?? null);
      setChecking(false);
    });

    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSignOut() {
    setAuthError("");
    setSigningOut(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setEmail(null);
      router.replace("/login");
      router.refresh();
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Could not sign out.");
      setSigningOut(false);
    }
  }

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-white/10 bg-[#0B1120] p-6 lg:flex">
      <Link href="/" className="mb-10 block">
        <h1 className="text-3xl font-black tracking-widest text-emerald-400">TILT<span className="text-white">.</span></h1>
        <p className="mt-2 text-xs tracking-widest text-slate-500">FINANCIAL UNIVERSE</p>
      </Link>
      <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500">Workspace</p>
      <nav className="space-y-2">
        {navigation.map(item => {
          const Icon=item.icon;
          const active=item.href==="/" ? pathname==="/" : pathname===item.href || pathname.startsWith(item.href+"/");
          return <Link key={item.href} href={item.href} className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition ${active?"bg-emerald-400/10 font-semibold text-emerald-400":"text-slate-400 hover:bg-white/5 hover:text-white"}`}>
            <Icon size={18}/>{item.label}
          </Link>;
        })}
      </nav>
      <div className="mt-auto space-y-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-sm font-medium">Simulation Mode</p>
          <p className="mt-1 text-xs text-emerald-400">Virtual environment · No real money</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#101827] p-4">
          <div className="flex items-center gap-2">
            <UserRound size={16} className="shrink-0 text-emerald-400"/>
            <div className="min-w-0">
              <p className="text-xs text-slate-500">Signed in as</p>
              <p className="truncate text-sm text-slate-200">{checking ? "Checking account…" : email ?? "Not signed in"}</p>
            </div>
          </div>
          {email ? (
            <button type="button" onClick={handleSignOut} disabled={signingOut} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 transition hover:border-red-400/30 hover:bg-red-400/10 hover:text-red-300 disabled:cursor-wait disabled:opacity-50">
              {signingOut ? <LoaderCircle size={15} className="animate-spin"/> : <LogOut size={15}/>}
              {signingOut ? "Signing out…" : "Log out"}
            </button>
          ) : (
            <Link href="/login" className="mt-4 flex w-full items-center justify-center rounded-lg bg-emerald-400 px-3 py-2 text-sm font-semibold text-slate-950">Log in</Link>
          )}
          {authError && <p role="alert" className="mt-2 text-xs text-red-300">{authError}</p>}
        </div>
      </div>
    </aside>
  );
}
