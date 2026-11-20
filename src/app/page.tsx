import Link from "next/link";
import { getAuthenticatedSupabase } from "@/lib/supabase/server";

export default async function HomePage() {
  let signedInEmail: string | null = null;
  let configured = true;
  try {
    const { user } = await getAuthenticatedSupabase();
    signedInEmail = user?.email ?? null;
  } catch {
    configured = false;
  }

  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">TILT · MEMBER 1 WORKSPACE</p>
        <h1>Simulator &amp; Market Engine</h1>
        <p className="intro">
          A deterministic, database-backed virtual trading foundation for TILT.
          All securities and prices in this workspace are fictional and educational.
        </p>
        <div className="status-grid">
          <article className="status-card">
            <span className="status-dot" />
            <h2>Trading engine</h2>
            <p>Atomic BUY/SELL RPC, integer-paise accounting, charges, cost basis and P&amp;L.</p>
          </article>
          <article className="status-card">
            <span className="status-dot" />
            <h2>Fictional market</h2>
            <p>Eight companies, scripted news events, deterministic market steps and history.</p>
          </article>
          <article className="status-card">
            <span className="status-dot" />
            <h2>Persistence &amp; security</h2>
            <p>Supabase Postgres, authenticated RPCs, session ownership checks and RLS.</p>
          </article>
        </div>
        <div className="action-row">
          <Link className="primary-button link-button" href="/login">{signedInEmail ? "Account" : "Sign in / Create account"}</Link>
          <a className="secondary-button" href="/api/health" target="_blank" rel="noreferrer">Check API health</a>
          <a className="secondary-button" href="/api/docs" target="_blank" rel="noreferrer">API guide</a>
        </div>
        <p className="account-line">
          {signedInEmail ? `Signed in as ${signedInEmail}` : configured ? "Sign in to access protected API endpoints." : "Supabase is not configured yet. Follow the README setup steps."}
        </p>
        <p className="note">MVP scope: backend engine and APIs · No real-money trading · No investment advice</p>
      </section>
    </main>
  );
}
