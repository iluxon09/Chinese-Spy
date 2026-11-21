"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { BrainCircuit, Database, LoaderCircle, LockKeyhole, ShieldCheck } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Props = { mode: "gate" | "settings" };
type ConsentRecord = {
  coreDataAcknowledged: boolean;
  aiProcessingConsent: boolean;
  acceptedAt: string | null;
};

export default function ConsentManager({ mode }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "ready" | "error">(mode === "gate" ? "ready" : "loading");
  const [coreAcknowledged, setCoreAcknowledged] = useState(false);
  const [aiProcessingConsent, setAiProcessingConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (mode === "gate") return;
    let cancelled = false;
    void fetch("/api/consent", { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error ?? "Could not load privacy preferences.");
        return body as ConsentRecord;
      })
      .then((record) => {
        if (cancelled) return;
        setCoreAcknowledged(record.coreDataAcknowledged);
        setAiProcessingConsent(record.aiProcessingConsent);
        setStatus("ready");
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : "Could not load privacy preferences.");
        setStatus("error");
      });
    return () => { cancelled = true; };
  }, [mode]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !coreAcknowledged) return;
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const response = await fetch("/api/consent", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coreDataAcknowledged: true, aiProcessingConsent }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "Could not save privacy preferences.");
      if (mode === "gate") {
        window.location.replace("/");
        return;
      }
      setCoreAcknowledged(body.coreDataAcknowledged === true);
      setAiProcessingConsent(body.aiProcessingConsent === true);
      setSaved(true);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save privacy preferences.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
    } finally {
      window.location.replace("/login");
    }
  }

  if (status === "loading") {
    return (
      <main className="grid min-h-screen place-content-center gap-3 bg-[#080d18] text-sm text-slate-400" aria-live="polite">
        <LoaderCircle size={22} className="mx-auto animate-spin" />
        Loading privacy preferences…
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="grid min-h-screen place-content-center bg-[#080d18] p-6 text-slate-300">
        <section className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#101a2b] p-8" role="alert">
          <p className="text-xs font-bold tracking-[.16em] text-emerald-300">TILT / PRIVACY</p>
          <h1 className="mt-3 text-2xl font-bold text-white">Consent settings unavailable</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">{error}</p>
          <p className="mt-2 text-sm leading-6 text-slate-400">The workspace stays locked until the consent migration is applied and your preferences can be recorded.</p>
          <button type="button" onClick={() => window.location.reload()} className="mt-6 rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold">Retry</button>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080d18] px-4 py-8 text-slate-200 [background-image:radial-gradient(ellipse_at_12%_12%,rgba(40,194,160,.12),transparent_34%),radial-gradient(ellipse_at_88%_90%,rgba(52,109,191,.1),transparent_40%)]">
      <section className="w-full max-w-3xl rounded-2xl border border-white/10 bg-[#0b1424]/95 p-5 shadow-2xl sm:p-9" aria-labelledby="consent-heading">
        <div className="mb-7 text-2xl font-black tracking-[.16em] text-white">TILT<span className="text-emerald-300">.</span></div>
        <p className="text-[10px] font-bold tracking-[.18em] text-emerald-300">{mode === "gate" ? "BEFORE YOU ENTER THE WORKSPACE" : "ACCOUNT / PRIVACY"}</p>
        <h1 id="consent-heading" className="mt-2 text-3xl font-extrabold tracking-tight text-white">{mode === "gate" ? "Your data. Your choice." : "Privacy & consent"}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">TILT is a financial-literacy simulator. Review what is stored and how optional AI features use information before continuing.</p>

        <div className="mt-7 grid gap-3">
          <article className="grid gap-3 rounded-xl border border-white/10 bg-white/[.025] p-4 sm:grid-cols-[36px_1fr_auto]">
            <span className="grid size-9 place-items-center rounded-lg border border-emerald-300/20 bg-emerald-300/[.07] text-emerald-200"><Database size={18}/></span>
            <div>
              <h2 className="text-sm font-bold text-white">Core account and simulation data</h2>
              <p className="mt-1 text-xs leading-5 text-slate-400">Supabase stores your sign-in account information and the data needed to run your workspace, including simulation sessions, virtual cash, holdings, orders and transaction history.</p>
            </div>
            <span className="text-[10px] text-slate-500">Required</span>
          </article>

          <article className="grid gap-3 rounded-xl border border-white/10 bg-white/[.025] p-4 sm:grid-cols-[36px_1fr_auto]">
            <span className="grid size-9 place-items-center rounded-lg border border-emerald-300/20 bg-emerald-300/[.07] text-emerald-200"><BrainCircuit size={18}/></span>
            <div>
              <h2 className="text-sm font-bold text-white">Optional Google Gemini features</h2>
              <p className="mt-1 text-xs leading-5 text-slate-400">When enabled, your AI Risk Coach prompts and limited virtual portfolio, recent simulated trades and market-event context are sent to Google Gemini to generate a response. The real-market briefing also uses Gemini with Google Search grounding; it does not send your portfolio.</p>
              <p className="mt-2 text-xs leading-5 text-slate-400">AI chat history stays in the current browser session and is not saved in TILT's database. Gemini processes requests under Google's API terms and settings.</p>
            </div>
            <span className="text-[10px] text-emerald-300">Optional</span>
          </article>

          <article className="grid gap-3 rounded-xl border border-white/10 bg-white/[.025] p-4 sm:grid-cols-[36px_1fr]">
            <span className="grid size-9 place-items-center rounded-lg border border-emerald-300/20 bg-emerald-300/[.07] text-emerald-200"><LockKeyhole size={18}/></span>
            <div>
              <h2 className="text-sm font-bold text-white">What TILT does not do</h2>
              <p className="mt-1 text-xs leading-5 text-slate-400">TILT uses fictional companies and virtual money. It does not place real trades or provide investment advice. Never enter passwords, API keys, PAN, bank details or other sensitive identifiers into AI prompts.</p>
            </div>
          </article>
        </div>

        <form onSubmit={save} className="mt-6 grid gap-4">
          <label className="flex cursor-pointer items-start gap-3 text-xs leading-5 text-slate-300">
            <input className="mt-1 size-4 accent-emerald-300" type="checkbox" checked={coreAcknowledged} onChange={(event) => setCoreAcknowledged(event.target.checked)} disabled={mode === "settings" && coreAcknowledged} required={mode === "gate"} />
            <span>I understand and acknowledge that TILT must process and store account and simulation data through Supabase to provide the core service.</span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-emerald-300/15 bg-emerald-300/[.035] p-3 text-xs leading-5 text-slate-300">
            <input className="mt-1 size-4 accent-emerald-300" type="checkbox" checked={aiProcessingConsent} onChange={(event) => setAiProcessingConsent(event.target.checked)} />
            <span>I opt in to optional Google Gemini processing for the AI Risk Coach and real-market briefing. I understand the data use described above.</span>
          </label>
          <p className="text-[10px] leading-5 text-slate-500">You can use the simulator without opting in to AI. You can change your AI preference later from the account menu under Privacy & consent.</p>
          {error && <p role="alert" className="text-xs text-rose-300">{error}</p>}
          {saved && <p role="status" className="text-xs text-emerald-300">Your privacy preferences have been saved.</p>}
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="submit" disabled={busy || !coreAcknowledged} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-emerald-300 px-5 text-xs font-extrabold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40">
              {busy ? <><LoaderCircle size={16} className="animate-spin"/> Saving…</> : mode === "gate" ? "Continue to TILT" : "Save preferences"}
            </button>
            {mode === "gate" && <button type="button" onClick={signOut} disabled={busy} className="min-h-11 rounded-lg border border-white/15 px-5 text-xs font-semibold text-slate-300 disabled:opacity-50">I don't agree — sign out</button>}
          </div>
        </form>

        <p className="mt-6 flex items-center gap-2 text-[9px] text-slate-600"><ShieldCheck size={13}/> Consent record version 2026-11-21-v1</p>
      </section>
    </main>
  );
}
