"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LoaderCircle, LockKeyhole, Mail, ShieldAlert, ShieldCheck } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getSafeInternalPath } from "@/lib/auth/redirect";

type FormMessage = { kind: "error" | "success"; text: string };

export default function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<FormMessage | null>(null);
  const [busy, setBusy] = useState(false);

  function changeMode(nextMode: "signin" | "signup") {
    setMode(nextMode);
    setMessage(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    setMessage(null);
    setBusy(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const normalizedEmail = email.trim().toLowerCase();

      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
        });
        if (error) throw error;

        if (!data.session) {
          setMessage({
            kind: "success",
            text: "Your account has been created. Check your inbox for the confirmation email, then return here to sign in.",
          });
          setMode("signin");
          setPassword("");
          return;
        }
      }

      const requested = new URLSearchParams(window.location.search).get("next");
      router.replace(getSafeInternalPath(requested));
      router.refresh();
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : "Authentication failed.";
      setMessage({
        kind: "error",
        text: rawMessage.includes("Invalid login credentials")
          ? "That email and password combination was not recognised. Check your details or create an account."
          : rawMessage,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={submit} aria-busy={busy}>
      <div className="auth-mode-switch" role="tablist" aria-label="Choose sign-in or registration">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "signin"}
          className={mode === "signin" ? "is-active" : ""}
          onClick={() => changeMode("signin")}
        >
          Sign in
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "signup"}
          className={mode === "signup" ? "is-active" : ""}
          onClick={() => changeMode("signup")}
        >
          Create account
        </button>
      </div>

      <div className="auth-field">
        <label htmlFor="tilt-email">Email address</label>
        <div className="auth-input-wrap">
          <Mail size={17} aria-hidden="true" />
          <input
            id="tilt-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="you@example.com"
            required
            maxLength={254}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
      </div>

      <div className="auth-field">
        <div className="auth-label-row">
          <label htmlFor="tilt-password">Password</label>
          <span>{mode === "signup" ? "8 characters minimum" : "Your account password"}</span>
        </div>
        <div className="auth-input-wrap">
          <LockKeyhole size={17} aria-hidden="true" />
          <input
            id="tilt-password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            placeholder={mode === "signup" ? "Create a secure password" : "Enter your password"}
            required
            minLength={mode === "signup" ? 8 : undefined}
            maxLength={128}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <button
            className="auth-password-toggle"
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
          >
            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`auth-message ${message.kind === "error" ? "is-error" : "is-success"}`}
          role={message.kind === "error" ? "alert" : "status"}
          aria-live="polite"
        >
          {message.kind === "error" ? <ShieldAlert size={17} /> : <ShieldCheck size={17} />}
          <span>{message.text}</span>
        </div>
      )}

      <button className="auth-submit" type="submit" disabled={busy}>
        {busy ? (
          <><LoaderCircle size={18} className="animate-spin" /> Please wait…</>
        ) : mode === "signin" ? (
          "Sign in to TILT"
        ) : (
          "Create your TILT account"
        )}
      </button>

      <p className="auth-form-footnote">
        Your account is secured by Supabase Authentication. TILT will never ask you to share
        your password or private API keys.
      </p>
    </form>
  );
}
