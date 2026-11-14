/**
 * PRCBO AI LeadGen - Lead Scoring Subsystem Entry Point
 */

export {
  calculateLeadScore,
  getScoreTier,
  getQualificationLevel,
  recommendServiceForLead
} from './scoringEngine.js';

export {
  SCORING_WEIGHTS,
  TIER_THRESHOLDS,
  STRATEGIC_HUBS,
  CATEGORY_PROFILES,
  resolveCategoryProfile
} from './scoringRules.js';
