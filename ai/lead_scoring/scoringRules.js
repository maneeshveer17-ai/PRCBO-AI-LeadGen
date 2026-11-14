/**
 * PRCBO AI LeadGen - Deterministic Lead Scoring Rules and Taxonomy
 * 
 * Defines feature weights, tier thresholds, category modernization index,
 * geographic clustering weights, and deterministic service recommendation mapping.
 */

// Core Scoring Weights (Total = 100 points)
export const SCORING_WEIGHTS = {
  WEBSITE: 30,             // Website presence, SSL security, valid domain
  COMMERCIAL_VITALITY: 25, // Star rating, review volume, spatial coordinates
  CATEGORY_READINESS: 20,  // Industry tech modernization index & PRCBO vertical fit
  REACHABILITY: 15,        // Direct phone, email, and named decision maker
  GEOGRAPHY: 10            // Strategic clustering around PRCBO regional delivery hubs
};

// Tier Thresholds
export const TIER_THRESHOLDS = {
  HOT: 88,     // 88 - 100: Prime readiness, high priority outreach
  HIGH: 70,    // 70 - 87:  Actionable prospect, high potential
  MEDIUM: 50,  // 50 - 69:  Nurture pipeline, moderate qualification
  LOW: 0       // 0 - 49:   Unqualified or missing critical contact/digital assets
};

// Strategic Geographic Hubs
export const STRATEGIC_HUBS = {
  TIER_1: ['madurai', 'chennai', 'coimbatore', 'bengaluru', 'bangalore'],
  TIER_2: ['trichy', 'tiruchirappalli', 'hyderabad', 'salem', 'tirunelveli', 'kochi', 'mysuru'],
  REGIONAL_STATES: ['tamil nadu', 'karnataka', 'telangana', 'kerala', 'andhra pradesh']
};

// Category Modernization Index & Default Service Affinities
export const CATEGORY_PROFILES = {
  manufacturing: {
    score: 20,
    primaryService: 'IoT Solutions',
    secondaryService: 'Web Development',
    businessType: 'Industrial B2B Manufacturing',
    defaultOpportunity: 'Factory floor monitoring, telemetry sensors, and automated production dashboards.'
  },
  industrial: {
    score: 20,
    primaryService: 'IoT Solutions',
    secondaryService: 'AI Development',
    businessType: 'Heavy Engineering & Industrial Works',
    defaultOpportunity: 'Machinery telemetry, predictive maintenance, and operational analytics.'
  },
  textile: {
    score: 20,
    primaryService: 'IoT Solutions',
    secondaryService: 'Web Development',
    businessType: 'Textile Weaving & Garment Export',
    defaultOpportunity: 'Loom monitoring, power telemetry, and international digital catalog showcase.'
  },
  healthcare: {
    score: 18,
    primaryService: 'Web Development',
    secondaryService: 'UI/UX Design',
    businessType: 'Healthcare, Clinical & Diagnostic Services',
    defaultOpportunity: 'Patient appointment booking, telehealth integration, and responsive clinic portal.'
  },
  it: {
    score: 16,
    primaryService: 'AI Development',
    secondaryService: 'Web Development',
    businessType: 'IT, Software & Technology Enterprise',
    defaultOpportunity: 'Workflow automation, custom LLM integrations, and modern full-stack web platforms.'
  },
  hotel: {
    score: 14,
    primaryService: 'Web Development',
    secondaryService: 'UI/UX Design',
    businessType: 'Hospitality, Hotel & Resort',
    defaultOpportunity: 'Direct booking engine, room showcase, and guest experience UI/UX.'
  },
  commercial: {
    score: 12,
    primaryService: 'Web Development',
    secondaryService: 'Digital Marketing',
    businessType: 'Commercial Enterprise & Trade',
    defaultOpportunity: 'Conversion-focused digital storefront, local search visibility, and regional campaigns.'
  },
  retail: {
    score: 12,
    primaryService: 'Web Development',
    secondaryService: 'Digital Marketing',
    businessType: 'Retail & Multi-channel Commerce',
    defaultOpportunity: 'Online product catalog, inventory visibility, and customer acquisition marketing.'
  },
  default: {
    score: 8,
    primaryService: 'Web Development',
    secondaryService: 'Digital Marketing',
    businessType: 'General Commercial Prospect',
    defaultOpportunity: 'Comprehensive digital transformation and online presence modernization.'
  }
};

/**
 * Normalizes category string to match known category profile
 */
export function resolveCategoryProfile(category) {
  if (!category || typeof category !== 'string') return CATEGORY_PROFILES.default;
  const lower = category.toLowerCase().trim();

  if (lower.includes('manufactur') || lower.includes('factory')) return CATEGORY_PROFILES.manufacturing;
  if (lower.includes('industrial') || lower.includes('craft') || lower.includes('machin')) return CATEGORY_PROFILES.industrial;
  if (lower.includes('textile') || lower.includes('loom') || lower.includes('fabric')) return CATEGORY_PROFILES.textile;
  if (lower.includes('health') || lower.includes('hospital') || lower.includes('clinic') || lower.includes('pharmacy') || lower.includes('doctor')) return CATEGORY_PROFILES.healthcare;
  if (lower.includes('it') || lower.includes('tech') || lower.includes('software') || lower.includes('office') || lower.includes('telecom')) return CATEGORY_PROFILES.it;
  if (lower.includes('hotel') || lower.includes('tourism') || lower.includes('resort') || lower.includes('restaurant') || lower.includes('cafe')) return CATEGORY_PROFILES.hotel;
  if (lower.includes('retail') || lower.includes('shop') || lower.includes('store')) return CATEGORY_PROFILES.retail;
  if (lower.includes('commercial') || lower.includes('trade')) return CATEGORY_PROFILES.commercial;

  return CATEGORY_PROFILES.default;
}
