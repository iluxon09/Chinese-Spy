import { describe, expect, it } from "vitest";
import {
  deriveRiskProfile,
  parseRiskQuestionnaire,
  type RiskQuestionnaireAnswers,
} from "../../src/lib/crash-replay/risk-profile";

const conservative: RiskQuestionnaireAnswers = {
  investmentHorizon: "under-one-year",
  drawdownComfortPct: 5,
  reactionToFall: "sell",
  diversificationPreference: "one-two",
  investmentObjective: "preserve",
  maxPositionPct: 10,
};

describe("crash replay risk profile", () => {
  it("classifies conservative stated answers and preserves the selected guardrails", () => {
    expect(deriveRiskProfile(conservative)).toEqual({
      profile: "CONSERVATIVE",
      score: 0,
      maxDrawdownBps: 500,
      maxPositionBps: 1000,
    });
  });

  it("classifies a high risk-tolerance answer set as aggressive", () => {
    const answers: RiskQuestionnaireAnswers = {
      investmentHorizon: "over-five-years",
      drawdownComfortPct: 20,
      reactionToFall: "buy",
      diversificationPreference: "more-than-ten",
      investmentObjective: "growth",
      maxPositionPct: 25,
    };
    expect(deriveRiskProfile(answers).profile).toBe("AGGRESSIVE");
    expect(deriveRiskProfile(answers).score).toBe(13);
  });

  it("classifies a middle-of-range answer set as balanced", () => {
    const answers: RiskQuestionnaireAnswers = {
      investmentHorizon: "one-to-five-years",
      drawdownComfortPct: 10,
      reactionToFall: "review",
      diversificationPreference: "three-five",
      investmentObjective: "balanced",
      maxPositionPct: 15,
    };
    expect(deriveRiskProfile(answers).profile).toBe("BALANCED");
  });

  it("rejects missing fields and values outside the questionnaire options", () => {
    expect(parseRiskQuestionnaire({})).toBeNull();
    expect(parseRiskQuestionnaire({
      ...conservative,
      maxPositionPct: 90,
    })).toBeNull();
    expect(parseRiskQuestionnaire(null)).toBeNull();
  });
});
