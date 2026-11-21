import { AlertTriangle, LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";

export type PageStateVariant = "loading" | "error" | "empty";

type PageStateProps = {
  variant: PageStateVariant;
  title: string;
  description: string;
  action?: ReactNode;
};

export default function PageState({
  variant,
  title,
  description,
  action,
}: PageStateProps) {
  return (
    <main className="tilt-page-state">
      <section
        className={`tilt-state-panel tilt-state-panel--${variant}`}
        role={variant === "error" ? "alert" : "status"}
        aria-live={variant === "loading" ? "polite" : undefined}
      >
        <span className="tilt-state-icon" aria-hidden="true">
          {variant === "loading" ? (
            <LoaderCircle className="tilt-state-spinner" size={22} />
          ) : (
            <AlertTriangle size={21} />
          )}
        </span>
        <div className="tilt-state-copy">
          <p className="tilt-state-eyebrow">TILT / WORKSPACE</p>
          <h1>{title}</h1>
          <p>{description}</p>
          {action ? <div className="tilt-state-actions">{action}</div> : null}
        </div>
      </section>
    </main>
  );
}
