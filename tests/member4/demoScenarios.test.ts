import { describe, it, expect } from 'vitest';
import { DEMO_SCENARIOS, getScenarioById } from '../../src/lib/member4/scenarios/demoScenarios.js';
import { getPrimaryLessonId } from '../../src/lib/member4/academy/lessons.js';
import type { IndicatorId } from '../../src/lib/member4/types/shared.js';

describe('Demo scenarios', () => {
  it('provides exactly four scenarios covering each indicator', () => {
    expect(DEMO_SCENARIOS).toHaveLength(4);
    const indicators = DEMO_SCENARIOS.map((s) => s.targetIndicator);
    expect(new Set(indicators).size).toBe(4);
    expect(indicators).toEqual(
      expect.arrayContaining(['fomo', 'overtrading', 'concentration', 'panic_selling']),
    );
  });

  it('each scenario has a coherent expected report', () => {
    for (const scenario of DEMO_SCENARIOS) {
      expect(scenario.expectedReport.indicator).toBe(scenario.targetIndicator);
      expect(scenario.expectedReport.status).toBe('detected');
      expect(scenario.expectedReport.lessonId).toBe(
        getPrimaryLessonId(scenario.targetIndicator as IndicatorId),
      );
      expect(scenario.actions.length).toBeGreaterThan(0);
      expect(scenario.startingCash).toBe(1_000_000);
    }
  });

  it('lookup by id works', () => {
    const s = getScenarioById('demo_fomo');
    expect(s).toBeDefined();
    expect(s!.name).toMatch(/FOMO/i);
  });
});
