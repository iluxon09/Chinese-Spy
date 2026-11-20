import AuthForm from "./auth-form";

export default function LoginPage() {
  return (
    <main className="page-shell">
      <section className="auth-shell">
        <p className="eyebrow">TILT · FINANCIAL UNIVERSE</p>
        <h1>Sign in to TILT</h1>
        <p className="intro">
          Sign in or create an account to access your own virtual trading
          simulation, portfolio and market history.
        </p>
        <AuthForm />
        <p className="note">
          Educational simulation only. No real-money trading or investment advice.
        </p>
      </section>
    </main>
  );
}
