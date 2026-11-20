import { describe, it, expect } from 'vitest';
import {
  LESSONS,
  getLessonById,
  getPrimaryLessonId,
  INDICATOR_TO_PRIMARY_LESSON,
  getLessonsForIndicator,
} from '../../src/lib/member4/academy/lessons.js';
import type { IndicatorId } from '../../src/lib/member4/types/shared.js';

describe('Finance Academy lessons', () => {
  it('has 3–5 lessons with stable ids', () => {
    expect(LESSONS.length).toBeGreaterThanOrEqual(3);
    expect(LESSONS.length).toBeLessThanOrEqual(5);
    const ids = LESSONS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length); // unique
  });

  it('every lesson has required content fields', () => {
    for (const lesson of LESSONS) {
      expect(lesson.title.length).toBeGreaterThan(0);
      expect(lesson.explanation.length).toBeGreaterThan(20);
      expect(lesson.practicalExample.length).toBeGreaterThan(10);
      expect(lesson.keyTakeaway.length).toBeGreaterThan(10);
      expect(lesson.relatedIndicators.length).toBeGreaterThan(0);
    }
  });

  it('maps every indicator to a primary lesson that exists', () => {
    const indicators: IndicatorId[] = ['fomo', 'overtrading', 'concentration', 'panic_selling'];
    for (const ind of indicators) {
      const lessonId = getPrimaryLessonId(ind);
      const lesson = getLessonById(lessonId);
      expect(lesson).toBeDefined();
      expect(lesson!.relatedIndicators).toContain(ind);
    }
  });

  it('INDICATOR_TO_PRIMARY_LESSON covers all four indicators', () => {
    expect(Object.keys(INDICATOR_TO_PRIMARY_LESSON).sort()).toEqual(
      ['concentration', 'fomo', 'overtrading', 'panic_selling'].sort(),
    );
  });

  it('quizzes have a valid correctIndex', () => {
    for (const lesson of LESSONS) {
      if (lesson.quiz) {
        expect(lesson.quiz.options.length).toBeGreaterThanOrEqual(2);
        expect(lesson.quiz.correctIndex).toBeGreaterThanOrEqual(0);
        expect(lesson.quiz.correctIndex).toBeLessThan(lesson.quiz.options.length);
      }
    }
  });

  it('getLessonsForIndicator returns at least the primary lesson', () => {
    const lessons = getLessonsForIndicator('fomo');
    expect(lessons.some((l) => l.id === 'decision_discipline')).toBe(true);
  });
});
