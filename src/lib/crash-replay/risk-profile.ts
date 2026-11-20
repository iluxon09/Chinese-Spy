export type RiskQuestionnaireAnswers = {
  investmentHorizon: "under-one-year" | "one-to-five-years" | "over-five-years";
  drawdownComfortPct: 5 | 10 | 15 | 20;
  reactionToFall: "sell" | "review" | "hold" | "buy";
  diversificationPreference: "one-two" | "three-five" | "six-ten" | "more-than-ten";
  investmentObjective: "preserve" | "balanced" | "growth";
  maxPositionPct: 10 | 15 | 20 | 25;
};

export type RiskProfile = "CONSERVATIVE" | "BALANCED" | "AGGRESSIVE";

export type RiskProfileResult = {
  profile: RiskProfile;
  score: number;
  maxDrawdownBps: number;
  maxPositionBps: number;
};

const allowed = {
  investmentHorizon: ["under-one-year", "one-to-five-years", "over-five-years"],
  drawdownComfortPct: [5, 10, 15, 20],
  reactionToFall: ["sell", "review", "hold", "buy"],
  diversificationPreference: ["one-two", "three-five", "six-ten", "more-than-ten"],
  investmentObjective: ["preserve", "balanced", "growth"],
  maxPositionPct: [10, 15, 20, 25],
} as const;

export function parseRiskQuestionnaire(value: unknown): RiskQuestionnaireAnswers | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const answer = value as Record<string, unknown>;

  if (
    !allowed.investmentHorizon.includes(answer.investmentHorizon as typeof allowed.investmentHorizon[number]) ||
    !allowed.drawdownComfortPct.includes(answer.drawdownComfortPct as typeof allowed.drawdownComfortPct[number]) ||
    !allowed.reactionToFall.includes(answer.reactionToFall as typeof allowed.reactionToFall[number]) ||
    !allowed.diversificationPreference.includes(answer.diversificationPreference as typeof allowed.diversificationPreference[number]) ||
    !allowed.investmentObjective.includes(answer.investmentObjective as typeof allowed.investmentObjective[number]) ||
    !allowed.maxPositionPct.includes(answer.maxPositionPct as typeof allowed.maxPositionPct[number])
  ) {
    return null;
  }

  return {
    investmentHorizon: answer.investmentHorizon as RiskQuestionnaireAnswers["investmentHorizon"],
    drawdownComfortPct: answer.drawdownComfortPct as RiskQuestionnaireAnswers["drawdownComfortPct"],
    reactionToFall: answer.reactionToFall as RiskQuestionnaireAnswers["reactionToFall"],
    diversificationPreference: answer.diversificationPreference as RiskQuestionnaireAnswers["diversificationPreference"],
    investmentObjective: answer.investmentObjective as RiskQuestionnaireAnswers["investmentObjective"],
    maxPositionPct: answer.maxPositionPct as RiskQuestionnaireAnswers["maxPositionPct"],
  };
}

/**
 * A transparent educational classification of self-reported answers.
 * It is not a regulated risk-profiling instrument or investment suitability test.
 */
export function deriveRiskProfile(answers: RiskQuestionnaireAnswers): RiskProfileResult {
  const horizonScore = {
    "under-one-year": 0,
    "one-to-five-years": 1,
    "over-five-years": 2,
  }[answers.investmentHorizon];

  const drawdownScore = answers.drawdownComfortPct / 5 - 1;

  const reactionScore = {
    sell: 0,
    review: 1,
    hold: 2,
    buy: 3,
  }[answers.reactionToFall];

  const diversificationScore = {
    "one-two": 0,
    "three-five": 1,
    "six-ten": 2,
    "more-than-ten": 3,
  }[answers.diversificationPreference];

  const objectiveScore = {
    preserve: 0,
    balanced: 1,
    growth: 2,
  }[answers.investmentObjective];

  const score = horizonScore + drawdownScore + reactionScore + diversificationScore + objectiveScore;
  const profile: RiskProfile = score <= 4
    ? "CONSERVATIVE"
    : score <= 8
      ? "BALANCED"
      : "AGGRESSIVE";

  return {
    profile,
    score,
    maxDrawdownBps: answers.drawdownComfortPct * 100,
    maxPositionBps: answers.maxPositionPct * 100,
  };
}
