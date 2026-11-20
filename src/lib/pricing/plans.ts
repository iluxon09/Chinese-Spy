/**
 * TILT's pilot-first revenue model, based on Section 9 of TILT_Full_Plan.pdf.
 *
 * The source plan deliberately sets no Indian price points: pricing and willingness
 * to pay are to be validated through paid cohort pilots. Labels here describe
 * commercial models, not approved prices or active billing products.
 */
export type DemoPlanId =
  | "cohort-pilot"
  | "site-licence"
  | "broker-fintech"
  | "trading-firm";

export type PricingPlan = {
  id: "free" | DemoPlanId;
  name: string;
  audience: string;
  priceLabel: string;
  interval: string;
  description: string;
  features: readonly string[];
  demoPlanId?: DemoPlanId;
  highlightLabel?: string;
};

export type DemoCheckoutPlan = {
  id: DemoPlanId;
  name: string;
  interval: string;
  description: string;
  pricingStatus: string;
  pricingBasis: string;
  requiresCohortSize: boolean;
};

export const PRICING_PLANS: readonly PricingPlan[] = [
  {
    id: "free",
    name: "TILT Student Demo",
    audience: "For students and first-time learners",
    priceLabel: "₹0",
    interval: "Free entry point",
    description: "A no-cost way for learners to experience TILT before an institution runs a facilitated session.",
    features: [
      "Fictional-market learning experience",
      "Virtual capital only",
      "Entry point for classroom and club pilots",
    ],
  },
  {
    id: "cohort-pilot",
    name: "Class / Club Pilot",
    audience: "First paid conversion",
    priceLabel: "Paid pilot",
    interval: "Custom cohort scope",
    description: "A proposed facilitated pilot for a business school, finance programme, CFA-prep group or trading club.",
    features: [
      "Proposed: ready-to-run educational case and facilitator notes",
      "Proposed: facilitated class or club session",
      "Pilot feedback used to validate the future institutional offer",
    ],
    demoPlanId: "cohort-pilot",
  },
  {
    id: "site-licence",
    name: "Annual Institutional Site Licence",
    audience: "Primary initial buyer",
    priceLabel: "Custom annual quote",
    interval: "Institution-wide licence",
    description: "The intended scale-up after a successful paid cohort pilot and buyer validation.",
    features: [
      "Target buyers: business schools and finance programmes",
      "Proposed: instructor guide and reusable learning case",
      "Proposed: cohort report; not currently available in the application",
    ],
    demoPlanId: "site-licence",
    highlightLabel: "PRIMARY REVENUE PATH",
  },
  {
    id: "broker-fintech",
    name: "Broker & Fintech Education",
    audience: "Later-stage market",
    priceLabel: "Later phase",
    interval: "Per-activated-user or annual licence",
    description: "A future readiness and education model for broker and fintech customers, after classroom evidence exists.",
    features: [
      "Future concept: readiness education before higher-risk products",
      "Possible model: per-activated-user or annual licence",
      "Longer sales cycle; not the first go-to-market target",
    ],
    demoPlanId: "broker-fintech",
  },
  {
    id: "trading-firm",
    name: "Trading & Prop-Style Firms",
    audience: "Later-stage market",
    priceLabel: "Later phase",
    interval: "Per-assessment or per-seat",
    description: "A possible future behavioural screening and training product for junior traders.",
    features: [
      "Future concept: behavioural screening and training",
      "Possible model: per-assessment or per-seat",
      "To be explored after the initial institutional pilots",
    ],
    demoPlanId: "trading-firm",
  },
];

const DEMO_CHECKOUT_PLANS: Record<DemoPlanId, DemoCheckoutPlan> = {
  "cohort-pilot": {
    id: "cohort-pilot",
    name: "TILT Class / Club Pilot",
    interval: "Paid cohort pilot",
    description: "A future facilitated pilot session for a class, finance programme or trading club.",
    pricingStatus: "Pilot quote to be agreed with the organiser",
    pricingBasis: "Scope the learner cohort and pilot requirements; no per-student rate has been approved.",
    requiresCohortSize: true,
  },
  "site-licence": {
    id: "site-licence",
    name: "Annual Institutional Site Licence",
    interval: "Annual institutional licence",
    description: "An institutional licence considered after a successful cohort pilot.",
    pricingStatus: "Custom annual quote after pilot validation",
    pricingBasis: "Institution-wide scope and requirements; not a published per-seat price.",
    requiresCohortSize: true,
  },
  "broker-fintech": {
    id: "broker-fintech",
    name: "Broker / Fintech Education Partnership",
    interval: "Later-stage partnership",
    description: "A future education and readiness programme for broker or fintech customers.",
    pricingStatus: "Not priced — later phase",
    pricingBasis: "The plan identifies per-activated-user or annual licensing as possible models.",
    requiresCohortSize: false,
  },
  "trading-firm": {
    id: "trading-firm",
    name: "Trading / Prop-Firm Assessment",
    interval: "Later-stage partnership",
    description: "A future behavioural screening and training offer for junior traders.",
    pricingStatus: "Not priced — later phase",
    pricingBasis: "The plan identifies per-assessment or per-seat pricing as possible models.",
    requiresCohortSize: false,
  },
};

export function getDemoCheckoutPlan(
  value: string | undefined,
): DemoCheckoutPlan | null {
  if (
    value === "cohort-pilot" ||
    value === "site-licence" ||
    value === "broker-fintech" ||
    value === "trading-firm"
  ) {
    return DEMO_CHECKOUT_PLANS[value];
  }
  return null;
}

/**
 * Validates cohort scope for the demo only. It intentionally does not calculate
 * a monetary quote because the source revenue model defines no per-student rate.
 */
export function getValidatedCohortSize(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;

  const cohortSize = Number(value);
  if (!Number.isSafeInteger(cohortSize) || cohortSize < 1 || cohortSize > 5000) {
    return null;
  }
  return cohortSize;
}
