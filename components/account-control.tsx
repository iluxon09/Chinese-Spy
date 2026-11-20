"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoaderCircle, LogOut, UserRound } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function AccountControl({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [checking, setChecking] = useState(Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ));
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
      return;
    }

    const supabase = createSupabaseBrowserClient();
    let active = true;

    void supabase.auth.getUser().then(({ data, error: userError }) => {
      if (!active) return;
      if (!userError) setEmail(data.user?.email ?? null);
      setChecking(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user.email ?? null);
      setChecking(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    if (signingOut) return;
    setError("");
    setSigningOut(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
      setEmail(null);
      router.replace("/login");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to sign out.");
      setSigningOut(false);
    }
  }

  return (
    <section className={compact ? "account-control account-control-compact" : "account-control"}>
      <div className="account-control-user">
        <span className="account-control-avatar"><UserRound size={16} /></span>
        <div className="min-w-0">
          <p className="account-control-label">Signed in as</p>
          <p className="account-control-email" title={email ?? undefined}>
            {checking ? "Checking account…" : email ?? "Not signed in"}
          </p>
        </div>
      </div>
      {email ? (
        <button type="button" className="account-control-action" onClick={signOut} disabled={signingOut}>
          {signingOut ? <LoaderCircle size={15} className="animate-spin" /> : <LogOut size={15} />}
          {signingOut ? "Signing out…" : "Log out"}
        </button>
      ) : (
        <Link className="account-control-login" href="/login">Sign in</Link>
      )}
      {error && <p className="account-control-error" role="alert">{error}</p>}
    </section>
  );
}
