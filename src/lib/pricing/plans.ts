/**
 * Proposed business-model assumptions from the team's TILT Revenue Model PDF.
 * None of these prices represent an active billing product.
 */
export type DemoPlanId = "plus" | "report" | "college";

export type PricingPlan = {
  id: "free" | DemoPlanId | "partner";
  name: string;
  audience: string;
  price: string;
  interval: string;
  description: string;
  features: readonly string[];
  demoPlanId?: DemoPlanId;
  featured?: boolean;
};

export type DemoCheckoutPlan = {
  id: DemoPlanId;
  name: string;
  unitPriceRupees: number;
  interval: string;
  description: string;
};

export const PRICING_PLANS: readonly PricingPlan[] = [
  {
    id: "free",
    name: "TILT Free",
    audience: "For curious learners",
    price: "₹0",
    interval: "free access",
    description: "Start learning through fictional markets and virtual trading.",
    features: [
      "Virtual-market simulator",
      "Basic behavioural feedback",
      "Introductory Finance Academy lessons",
    ],
  },
  {
    id: "plus",
    name: "TILT Plus",
    audience: "For engaged learners",
    price: "₹999",
    interval: "per year",
    description: "A proposed annual plan for deeper, personalised learning.",
    features: [
      "Unlimited simulations (planned plan benefit)",
      "Full behaviour reports (proposed)",
      "Goal planning and progress tracking (proposed)",
    ],
    demoPlanId: "plus",
    featured: true,
  },
  {
    id: "report",
    name: "Market Mirror Report",
    audience: "For active traders",
    price: "₹199",
    interval: "per statement",
    description: "A proposed one-off analysis of an uploaded trading statement.",
    features: [
      "One-off statement analysis (future feature)",
      "Evidence-backed behavioural explanation (planned)",
      "No stock tips or guaranteed returns",
    ],
    demoPlanId: "report",
  },
  {
    id: "college",
    name: "TILT Campus",
    audience: "For colleges",
    price: "₹150",
    interval: "per student / year",
    description: "A proposed educational licence priced per student.",
    features: [
      "Cohort access (planned)",
      "Instructor dashboard (future feature)",
      "Class-level learning insights (planned)",
    ],
    demoPlanId: "college",
  },
  {
    id: "partner",
    name: "Institutional Partners",
    audience: "For fintechs and institutions",
    price: "₹5–6 lakh",
    interval: "per year · indicative",
    description: "Proposed fixed-fee partnerships, not transaction-based commissions.",
    features: [
      "Sponsored educational scenarios (planned)",
      "Co-branded learning modules (planned)",
      "Potential white-label licensing (planned)",
    ],
  },
];

const DEMO_CHECKOUT_PLANS: Record<DemoPlanId, DemoCheckoutPlan> = {
  plus: {
    id: "plus",
    name: "TILT Plus",
    unitPriceRupees: 999,
    interval: "one year",
    description: "Proposed annual learning plan",
  },
  report: {
    id: "report",
    name: "Market Mirror Report",
    unitPriceRupees: 199,
    interval: "one statement",
    description: "Proposed one-off statement analysis",
  },
  college: {
    id: "college",
    name: "TILT Campus Licence",
    unitPriceRupees: 150,
    interval: "one student for one year",
    description: "Proposed college cohort licence",
  },
};

export function getDemoCheckoutPlan(
  value: string | undefined,
): DemoCheckoutPlan | null {
  if (value === "plus" || value === "report" || value === "college") {
    return DEMO_CHECKOUT_PLANS[value];
  }
  return null;
}

/** Display-only estimate; never used to request or settle a payment. */
export function getDemoTotalRupees(
  planId: DemoPlanId,
  collegeSeats = 400,
): number {
  if (planId === "plus") return 999;
  if (planId === "report") return 199;

  if (
    !Number.isSafeInteger(collegeSeats) ||
    collegeSeats < 1 ||
    collegeSeats > 5000
  ) {
    throw new RangeError("Student count must be a whole number from 1 to 5000.");
  }
  return collegeSeats * 150;
}
