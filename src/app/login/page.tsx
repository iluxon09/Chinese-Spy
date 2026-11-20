import AuthForm from "./auth-form";
import Link from "next/link";
export default function LoginPage() {
  return (
    <main className="page-shell">
      <section className="auth-shell">
        <Link className="back-link" href="/">← TILT home</Link>
        <p className="eyebrow">ACCOUNT ACCESS</p>
        <h1>Sign in to TILT</h1>
        <p className="intro">Use your Supabase Auth account to create and access your own virtual trading sessions.</p>
        <AuthForm />
      </section>
    </main>
  );
}
