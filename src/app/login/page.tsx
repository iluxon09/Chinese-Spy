import AuthForm from "./auth-form";
import { ArrowUpRight, ChartNoAxesCombined, ShieldCheck, WalletCards } from "lucide-react";

const benefits = [
  {
    icon: ChartNoAxesCombined,
    title: "Explore a fictional market",
    description: "Follow eight companies as deterministic market events move their prices.",
  },
  {
    icon: WalletCards,
    title: "Practise with virtual capital",
    description: "Create your own simulation and practise BUY / SELL decisions without real money.",
  },
  {
    icon: ShieldCheck,
    title: "Keep your activity private",
    description: "Your sessions and portfolio are scoped to your signed-in account.",
  },
];

export default function LoginPage() {
  return (
    <main className="auth-page">
      <div className="auth-grid">
        <section className="auth-intro" aria-labelledby="welcome-heading">
          <div className="auth-brand">
            <span className="auth-brand-mark">T</span>
            <span className="auth-brand-name">TILT<span>.</span></span>
            <span className="auth-brand-divider" />
            <span className="auth-brand-caption">FINANCIAL UNIVERSE</span>
          </div>

          <div className="auth-intro-copy">
            <div className="auth-kicker">
              <span className="auth-kicker-dot" />
              A MARKET TO LEARN IN
            </div>
            <h1 id="welcome-heading">
              Make decisions.
              <br />
              <span>Understand the market.</span>
            </h1>
            <p className="auth-lead">
              A hands-on trading simulator built to help you learn how markets,
              risk and trading behaviour work — one decision at a time.
            </p>
          </div>

          <div className="auth-benefits">
            {benefits.map(({ icon: Icon, title, description }, index) => (
              <article className="auth-benefit" key={title}>
                <span className="auth-benefit-icon"><Icon size={19} /></span>
                <div>
                  <h2>{title}</h2>
                  <p>{description}</p>
                </div>
                <span className="auth-benefit-index">0{index + 1}</span>
              </article>
            ))}
          </div>

          <div className="auth-intro-footer">
            <span>SIMULATED MARKETS · REAL LEARNING</span>
            <span className="auth-footer-arrow"><ArrowUpRight size={15} /></span>
          </div>
        </section>

        <section className="auth-panel" aria-labelledby="auth-heading">
          <div className="auth-panel-inner">
            <div className="auth-panel-heading">
              <p className="auth-panel-eyebrow">YOUR WORKSPACE AWAITS</p>
              <h2 id="auth-heading">Welcome to TILT.</h2>
              <p>Sign in to continue, or create an account to start your first simulation.</p>
            </div>

            <AuthForm />

            <p className="auth-legal">
              TILT is an educational simulation using fictional companies and virtual money.
              It does not place real trades or provide investment advice.
            </p>
          </div>

          <div className="auth-panel-bottom">
            <span>BUILT FOR CURIOUS MINDS</span>
            <span>© TILT FINANCIAL UNIVERSE</span>
          </div>
        </section>
      </div>
    </main>
  );
}
