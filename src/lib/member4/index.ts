/**
 * TILT Member 4 public API
 * Finance Academy • Investment Architect calculators • Demo scenarios • Content
 */

// Shared types
export type {
  OrderSide,
  Transaction,
  Holding,
  PricePoint,
  IndicatorId,
  IndicatorStatus,
  BehaviourReport,
  LessonId,
  LessonQuiz,
  Lesson,
  FictionalCompany,
  MarketEvent,
  DemoScenario,
} from './types/shared';

// Academy
export {
  LESSONS,
  getLessonById,
  getLessonsForIndicator,
  getPrimaryLessonId,
  getAllLessons,
  INDICATOR_TO_PRIMARY_LESSON,
} from './academy/index';

// Calculators
export {
  calculateSip,
  validateSipInput,
  calculateGoalSip,
  validateGoalInput,
  type SipInput,
  type SipResult,
  type SipValidationError,
  type GoalInput,
  type GoalResult,
  type GoalValidationError,
} from './calculators/index';

// Content
export {
  FICTIONAL_COMPANIES,
  getCompanyBySymbol,
  getCompaniesBySector,
  MARKET_EVENTS,
  getEventById,
  getEventsUpToStep,
} from './content/index';

// Demo scenarios
export {
  DEMO_SCENARIOS,
  getScenarioById,
  getAllScenarios,
} from './scenarios/index';
