/**
 * PRCBO AI LeadGen - AI Outreach & Analysis Client Service
 * 
 * Bridges client requests to:
 * 1. Supabase Edge Function 'analyze-lead' (server-side LLM with secret keys)
 * 2. Local deterministic fallback engine (zero API keys required, zero latency)
 * 
 * Security:
 * - NO API keys or secrets are stored in the client or frontend .env.
 * - Fails safely to high-converting localized templates if remote edge functions are unreachable.
 */

import { supabase, isSupabaseConfigured } from './supabaseClient.js';
import { generatePersonalizedOutreach, generateBusinessOpportunityAnalysis } from '../../../ai/lead_analysis/index.js';

/**
 * Generates personalized multi-channel outreach drafts for a lead
 * 
 * @param {object} lead - Lead record
 * @param {object} options - Generation options (tone: 'consultative' | 'direct' | 'executive')
 * @returns {Promise<object>} Outreach drafts { email, whatsapp, initialMessage, isLlmPowered, provider }
 */
export async function generateOutreachForLead(lead, options = {}) {
  if (!lead) return null;

  // 1. Attempt server-side Edge Function invocation if Supabase is active
  if (isSupabaseConfigured && supabase?.functions) {
    try {
      const { data, error } = await supabase.functions.invoke('analyze-lead', {
        body: {
          lead,
          action: 'outreach',
          tone: options.tone || 'consultative'
        }
      });

      if (!error && data?.email && data?.whatsapp) {
        return {
          email: data.email,
          whatsapp: data.whatsapp,
          initialMessage: data.initialMessage || data.whatsapp?.message || '',
          isLlmPowered: !!data.isLlmPowered,
          provider: data.provider || 'supabase-edge',
          generatedAt: new Date().toISOString()
        };
      }
    } catch (edgeErr) {
      // Edge function not deployed or network unreachable - fall through gracefully to local engine
      console.warn('Supabase Edge Function unavailable, utilizing local personalization engine:', edgeErr.message);
    }
  }

  // 2. Local deterministic personalization engine
  return generatePersonalizedOutreach(lead, options);
}

/**
 * Generates technical opportunity analysis and strategic recommendations for a lead
 * 
 * @param {object} lead - Lead record
 * @returns {Promise<object>} Opportunity analysis
 */
export async function generateAnalysisForLead(lead) {
  if (!lead) return null;

  const localFallback = generateBusinessOpportunityAnalysis(lead);

  if (isSupabaseConfigured && supabase?.functions) {
    try {
      const { data, error } = await supabase.functions.invoke('analyze-lead', {
        body: {
          lead,
          action: 'analysis'
        }
      });

      if (!error && data?.businessOpportunity) {
        return {
          whyThisLeadMatters: data.whyThisLeadMatters || localFallback.whyThisLeadMatters,
          businessOpportunity: data.businessOpportunity || localFallback.businessOpportunity,
          nextBestAction: data.nextBestAction || localFallback.nextBestAction,
          recommendedService: data.recommendedService || localFallback.recommendedService,
          secondaryService: data.secondaryService || localFallback.secondaryService,
          aiAnalysis: data.aiAnalysis || localFallback.aiAnalysis,
          isLlmPowered: !!data.isLlmPowered,
          provider: data.provider || 'supabase-edge',
          analyzedAt: new Date().toISOString()
        };
      }
    } catch (edgeErr) {
      console.warn('Edge Function analysis unavailable, using local engine:', edgeErr.message);
    }
  }

  return localFallback;
}
