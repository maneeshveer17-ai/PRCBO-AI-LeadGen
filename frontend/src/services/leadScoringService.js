/**
 * PRCBO AI LeadGen - Frontend Lead Scoring Service
 * 
 * Bridges the deterministic scoring engine in ai/lead_scoring/ to the
 * React frontend context, UI pages, and Supabase persistence layer.
 * 
 * Safe Implementation:
 * - Pure deterministic algorithmic execution (zero client API keys or secrets exposed)
 * - Transparent missing data reporting
 * - Seamless integration with LeadContext and leadService
 */

import {
  calculateLeadScore,
  getScoreTier,
  getQualificationLevel,
  recommendServiceForLead,
  SCORING_WEIGHTS,
  TIER_THRESHOLDS,
  STRATEGIC_HUBS,
  CATEGORY_PROFILES
} from '../../../ai/lead_scoring/index.js';

export {
  calculateLeadScore,
  getScoreTier,
  getQualificationLevel,
  recommendServiceForLead,
  SCORING_WEIGHTS,
  TIER_THRESHOLDS,
  STRATEGIC_HUBS,
  CATEGORY_PROFILES
};

/**
 * Evaluates a lead and returns a normalized payload ready for LeadContext or Supabase update.
 * 
 * @param {object} lead - Lead entity to evaluate
 * @returns {object} Formatted evaluation results and update delta
 */
export function scoreLead(lead) {
  if (!lead) return null;

  const evaluation = calculateLeadScore(lead);

  return {
    aiScore: evaluation.score,
    scoreTier: evaluation.tier,
    confidence: evaluation.confidence,
    qualificationLevel: evaluation.qualificationLevel,
    recommendedService: evaluation.recommendedService,
    secondaryService: evaluation.secondaryService,
    whyThisLeadMatters: evaluation.whyThisLeadMatters,
    businessOpportunity: evaluation.businessOpportunity,
    nextBestAction: evaluation.nextBestAction,
    aiAnalysis: evaluation.aiAnalysis,
    scoringBreakdown: evaluation.scoringBreakdown,
    missingFields: evaluation.missingFields,
    missingInfo: evaluation.missingInfo,
    lastEvaluatedAt: evaluation.evaluatedAt
  };
}

/**
 * Enriches a lead object immutably with newly calculated deterministic AI score attributes.
 * 
 * @param {object} lead - Existing lead object
 * @returns {object} Newly scored lead object
 */
export function enrichLeadWithScore(lead) {
  if (!lead) return lead;
  const updates = scoreLead(lead);
  return {
    ...lead,
    ...updates,
    metadata: {
      ...(lead.metadata || {}),
      scoreTier: updates.scoreTier,
      confidence: updates.confidence,
      qualificationLevel: updates.qualificationLevel,
      secondaryService: updates.secondaryService,
      whyThisLeadMatters: updates.whyThisLeadMatters,
      businessOpportunity: updates.businessOpportunity,
      nextBestAction: updates.nextBestAction,
      aiAnalysis: updates.aiAnalysis,
      scoringBreakdown: updates.scoringBreakdown,
      missingFields: updates.missingFields,
      missingInfo: updates.missingInfo,
      lastEvaluatedAt: updates.lastEvaluatedAt
    }
  };
}

/**
 * Batch evaluates an array of leads.
 * 
 * @param {Array<object>} leads - Array of leads
 * @returns {Array<object>} Array of scored leads
 */
export function batchScoreLeads(leads = []) {
  if (!Array.isArray(leads)) return [];
  return leads.map(enrichLeadWithScore);
}
