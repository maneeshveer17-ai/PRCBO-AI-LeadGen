/**
 * PRCBO AI LeadGen - Deterministic Lead Scoring Engine
 * 
 * Computes an objective qualification score (0–100) and structured analysis
 * based strictly on verified business attributes:
 * - Website presence & protocol security (Max 30 pts)
 * - Commercial footprint, spatial coordinates & genuine reviews (Max 25 pts)
 * - Industry category modernization readiness (Max 20 pts)
 * - Reachability & decision-maker contact completeness (Max 15 pts)
 * - Geographic clustering around strategic delivery hubs (Max 10 pts)
 * 
 * ZERO FABRICATION POLICY:
 * - Never invents review ratings, review counts, phone numbers, or emails.
 * - Missing fields are transparently accounted for in `missingInfo` and `missingFields`.
 */

import {
  SCORING_WEIGHTS,
  TIER_THRESHOLDS,
  STRATEGIC_HUBS,
  resolveCategoryProfile
} from './scoringRules.js';

/**
 * Validates whether a string has a realistic URL structure
 */
function isValidWebsite(url) {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim().toLowerCase();
  if (['none', 'null', 'n/a', 'no website', 'not provided', ''].includes(trimmed)) return false;
  return /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/i.test(trimmed);
}

/**
 * Validates whether an email string is realistic
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim().toLowerCase();
  if (['none', 'null', 'n/a', ''].includes(trimmed)) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

/**
 * Validates whether a phone number is realistic
 */
function isValidPhone(phone) {
  if (!phone || typeof phone !== 'string') return false;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

/**
 * Validates whether a contact person is a genuine named individual
 */
function isNamedPerson(contactPerson) {
  if (!contactPerson || typeof contactPerson !== 'string') return false;
  const lower = contactPerson.trim().toLowerCase();
  const placeholders = [
    'unassigned', 'unassigned (osm data)', 'commercial entity', 'lead manager',
    'director', 'managing director', 'key decision maker', 'not provided',
    'n/a', 'null', 'owner', 'manager', 'admin', ''
  ];
  return !placeholders.includes(lower) && lower.length >= 3;
}

/**
 * Evaluates website presence and security posture (0 - 30 pts)
 */
function evaluateWebsite(website) {
  const maxScore = SCORING_WEIGHTS.WEBSITE;

  if (!isValidWebsite(website)) {
    return {
      score: 0,
      maxScore,
      status: 'ABSENT',
      isSecure: false,
      value: null,
      notes: 'No official website detected on record. Primary candidate for web modernization.',
      missing: {
        field: 'website',
        label: 'Official Website',
        impact: -maxScore,
        reason: 'No digital domain or website URL registered for this business.'
      }
    };
  }

  const cleanUrl = website.trim();
  const isHttps = cleanUrl.toLowerCase().startsWith('https://');
  const isHttp = cleanUrl.toLowerCase().startsWith('http://');

  let score = 15; // Base presence
  let status = 'PARTIAL';
  let notes = '';

  if (isHttps) {
    score = 30;
    status = 'SECURE';
    notes = 'Active digital domain verified with secure HTTPS protocol.';
  } else if (isHttp) {
    score = 15;
    status = 'INSECURE';
    notes = 'Legacy HTTP website detected without SSL encryption. Modernization opportunity.';
  } else {
    // Domain provided without explicit protocol
    score = 22;
    status = 'UNSPECIFIED_PROTOCOL';
    notes = 'Digital domain detected; SSL protocol status pending verification.';
  }

  return {
    score,
    maxScore,
    status,
    isSecure: isHttps,
    value: cleanUrl,
    notes,
    missing: null
  };
}

/**
 * Evaluates commercial footprint, spatial coordinates & genuine reviews (0 - 25 pts)
 */
function evaluateCommercialVitality(lead) {
  const maxScore = SCORING_WEIGHTS.COMMERCIAL_VITALITY;
  let score = 0;
  const missing = [];
  const notesParts = [];

  // 1. Spatial GPS Coordinates Verification (0 or 5 pts)
  const lat = lead.lat !== undefined ? lead.lat : lead.latitude;
  const lng = lead.lng !== undefined ? lead.lng : lead.longitude;
  const hasCoordinates = lat !== null && lat !== undefined && !isNaN(Number(lat)) &&
                         lng !== null && lng !== undefined && !isNaN(Number(lng)) &&
                         Number(lat) !== 0 && Number(lng) !== 0;

  if (hasCoordinates) {
    score += 5;
    notesParts.push('Spatial GPS coordinates verified');
  } else {
    missing.push({
      field: 'coordinates',
      label: 'Spatial Coordinates',
      impact: -5,
      reason: 'Physical geolocation coordinates (latitude/longitude) are missing.'
    });
  }

  // 2. Genuine Public Star Rating (0 - 10 pts)
  const rating = (lead.rating !== undefined && lead.rating !== null && String(lead.rating).trim() !== '' && !isNaN(Number(lead.rating)))
    ? Number(lead.rating)
    : null;

  if (rating !== null && rating > 0) {
    if (rating >= 4.5) score += 10;
    else if (rating >= 4.0) score += 8;
    else if (rating >= 3.5) score += 5;
    else if (rating >= 3.0) score += 3;
    else score += 1;

    notesParts.push(`⭐ ${rating.toFixed(1)} rating`);
  } else {
    missing.push({
      field: 'rating',
      label: 'Star Rating',
      impact: -10,
      reason: 'Public customer rating is not available on source record.'
    });
  }

  // 3. Public Review Volume (0 - 10 pts)
  const reviewCount = (lead.reviewCount !== undefined && lead.reviewCount !== null && String(lead.reviewCount).trim() !== '' && !isNaN(Number(lead.reviewCount)))
    ? Number(lead.reviewCount)
    : null;

  if (reviewCount !== null && reviewCount > 0) {
    if (reviewCount >= 100) score += 10;
    else if (reviewCount >= 50) score += 8;
    else if (reviewCount >= 20) score += 6;
    else if (reviewCount >= 5) score += 4;
    else score += 2;

    notesParts.push(`${reviewCount} reviews`);
  } else {
    missing.push({
      field: 'reviewCount',
      label: 'Review Count',
      impact: -10,
      reason: 'Public review volume is not indexed for this business.'
    });
  }

  const notes = notesParts.length > 0
    ? notesParts.join(', ')
    : 'No public reputation metrics or reviews indexed on source provider.';

  return {
    score: Math.min(score, maxScore),
    maxScore,
    rating,
    reviewCount,
    hasCoordinates,
    notes,
    missing
  };
}

/**
 * Evaluates industry category modernization readiness (0 - 20 pts)
 */
function evaluateCategory(category) {
  const maxScore = SCORING_WEIGHTS.CATEGORY_READINESS;
  const profile = resolveCategoryProfile(category);

  return {
    score: Math.min(profile.score, maxScore),
    maxScore,
    category: category || 'Commercial',
    businessType: profile.businessType,
    primaryService: profile.primaryService,
    secondaryService: profile.secondaryService,
    defaultOpportunity: profile.defaultOpportunity,
    notes: `${profile.businessType} profile evaluated with ${profile.score}/${maxScore} technical transformation affinity.`
  };
}

/**
 * Evaluates reachability & decision-maker contact completeness (0 - 15 pts)
 */
function evaluateReachability(lead) {
  const maxScore = SCORING_WEIGHTS.REACHABILITY;
  let score = 0;
  const missing = [];
  const notesParts = [];

  // 1. Direct Phone / Mobile Number (7 pts)
  const phone = lead.phone ? String(lead.phone).trim() : '';
  const hasPhone = isValidPhone(phone);
  if (hasPhone) {
    score += 7;
    notesParts.push('Phone reachable');
  } else {
    missing.push({
      field: 'phone',
      label: 'Phone Number',
      impact: -7,
      reason: 'No direct phone or WhatsApp contact number found on record.'
    });
  }

  // 2. Verified Business Email Address (5 pts)
  const email = lead.email ? String(lead.email).trim() : '';
  const hasEmail = isValidEmail(email);
  if (hasEmail) {
    score += 5;
    notesParts.push('Email reachable');
  } else {
    missing.push({
      field: 'email',
      label: 'Email Address',
      impact: -5,
      reason: 'No official corporate or contact email found on record.'
    });
  }

  // 3. Named Decision Maker (3 pts)
  const rawContact = lead.contactPerson !== undefined ? lead.contactPerson : lead.contact_person;
  const contactPerson = rawContact ? String(rawContact).trim() : '';
  const hasNamedPerson = isNamedPerson(contactPerson);
  if (hasNamedPerson) {
    score += 3;
    notesParts.push(`Contact: ${contactPerson}`);
  } else {
    missing.push({
      field: 'contactPerson',
      label: 'Contact Person Name',
      impact: -3,
      reason: 'Key decision-maker name is unassigned or generic.'
    });
  }

  const notes = notesParts.length > 0
    ? notesParts.join('; ')
    : 'No direct phone, email, or named contact person found.';

  return {
    score: Math.min(score, maxScore),
    maxScore,
    hasPhone,
    hasEmail,
    hasNamedPerson,
    phone: hasPhone ? phone : null,
    email: hasEmail ? email : null,
    contactPerson: hasNamedPerson ? contactPerson : null,
    notes,
    missing
  };
}

/**
 * Evaluates geographic strategic clustering around delivery hubs (0 - 10 pts)
 */
function evaluateGeography(location) {
  const maxScore = SCORING_WEIGHTS.GEOGRAPHY;

  if (!location || typeof location !== 'string' || !location.trim()) {
    return {
      score: 0,
      maxScore,
      hubTier: 'NONE',
      notes: 'No geographical location provided.',
      missing: {
        field: 'location',
        label: 'Geographical Location',
        impact: -maxScore,
        reason: 'Business location is missing from record.'
      }
    };
  }

  const lower = location.toLowerCase().trim();

  // Tier 1 Hub Check (Madurai, Chennai, Coimbatore, Bengaluru)
  const isTier1 = STRATEGIC_HUBS.TIER_1.some(city => lower.includes(city));
  if (isTier1) {
    return {
      score: 10,
      maxScore,
      hubTier: 'TIER_1',
      notes: 'Located in a Tier-1 PRCBO strategic operational corridor.',
      missing: null
    };
  }

  // Tier 2 Hub Check (Trichy, Hyderabad, Salem, etc.)
  const isTier2 = STRATEGIC_HUBS.TIER_2.some(city => lower.includes(city));
  if (isTier2) {
    return {
      score: 8,
      maxScore,
      hubTier: 'TIER_2',
      notes: 'Located in a Tier-2 growth corridor within active delivery range.',
      missing: null
    };
  }

  // Regional State Check
  const isRegional = STRATEGIC_HUBS.REGIONAL_STATES.some(st => lower.includes(st));
  if (isRegional) {
    return {
      score: 6,
      maxScore,
      hubTier: 'REGIONAL',
      notes: 'Located within regional state boundary in South India.',
      missing: null
    };
  }

  // Other India Location
  return {
    score: 4,
    maxScore,
    hubTier: 'DOMESTIC',
    notes: 'Located outside primary regional operational hubs.',
    missing: null
  };
}

/**
 * Maps numerical score to official PRCBO qualification tier
 */
export function getScoreTier(score) {
  if (score === null || score === undefined || isNaN(Number(score))) {
    return 'UNSCORED';
  }
  const clamped = Math.max(0, Math.min(100, Math.round(Number(score))));
  if (clamped >= TIER_THRESHOLDS.HOT) return 'HOT';
  if (clamped >= TIER_THRESHOLDS.HIGH) return 'HIGH';
  if (clamped >= TIER_THRESHOLDS.MEDIUM) return 'MEDIUM';
  return 'LOW';
}

/**
 * Maps numerical score to human-readable qualification title
 */
export function getQualificationLevel(score, tier) {
  switch (tier) {
    case 'HOT':
      return 'Enterprise Ready • High Priority Outreach';
    case 'HIGH':
      return 'Qualified Lead • High Modernization Potential';
    case 'MEDIUM':
      return 'Actionable Prospect • Nurture Pipeline';
    case 'LOW':
    default:
      return score > 0 ? 'Early Stage • Requires Contact Enrichment' : 'Unqualified • Missing Core Assets';
  }
}

/**
 * Derives recommended PRCBO service and secondary track deterministically
 */
export function recommendServiceForLead(lead, websiteEval, categoryEval) {
  const profile = categoryEval;

  // If lead already had a custom service assigned that is valid, respect it
  if (lead.recommendedService && lead.recommendedService !== 'Service Unassigned' && lead.recommendedService !== 'Web Development') {
    return {
      primary: lead.recommendedService,
      secondary: profile.secondaryService
    };
  }

  // If website is absent or insecure HTTP, Web Development is always top priority
  if (websiteEval.status === 'ABSENT' || websiteEval.status === 'INSECURE') {
    return {
      primary: 'Web Development',
      secondary: profile.primaryService !== 'Web Development' ? profile.primaryService : profile.secondaryService
    };
  }

  return {
    primary: profile.primaryService,
    secondary: profile.secondaryService
  };
}

/**
 * Primary Deterministic Lead Scoring Function
 * 
 * @param {object} lead - Lead record with business attributes
 * @returns {object} Structured evaluation result
 */
export function calculateLeadScore(lead = {}) {
  const safeLead = lead || {};

  // 1. Evaluate 5 Core Dimensions
  const websiteEval = evaluateWebsite(safeLead.website);
  const vitalityEval = evaluateCommercialVitality(safeLead);
  const categoryEval = evaluateCategory(safeLead.category);
  const reachabilityEval = evaluateReachability(safeLead);
  const geographyEval = evaluateGeography(safeLead.location);

  // 2. Sum Raw Score and Clamp between 0 and 100
  const rawScore = websiteEval.score +
                   vitalityEval.score +
                   categoryEval.score +
                   reachabilityEval.score +
                   geographyEval.score;

  const score = Math.max(0, Math.min(100, Math.round(rawScore)));
  const tier = getScoreTier(score);
  const qualificationLevel = getQualificationLevel(score, tier);

  // 3. Compile Transparent Missing Information List
  const missingInfo = [];
  if (websiteEval.missing) missingInfo.push(websiteEval.missing);
  if (vitalityEval.missing && vitalityEval.missing.length > 0) {
    missingInfo.push(...vitalityEval.missing);
  }
  if (reachabilityEval.missing && reachabilityEval.missing.length > 0) {
    missingInfo.push(...reachabilityEval.missing);
  }
  if (geographyEval.missing) missingInfo.push(geographyEval.missing);

  const missingFields = missingInfo.map(item => item.field);

  // 4. Deterministic Service Recommendations
  const services = recommendServiceForLead(safeLead, websiteEval, categoryEval);

  // 5. Calculate Diagnostic Confidence Score based on data completeness
  const totalFactors = 5;
  const completeFactors = (websiteEval.score > 0 ? 1 : 0) +
                          (vitalityEval.hasCoordinates ? 1 : 0) +
                          (categoryEval.score > 8 ? 1 : 0) +
                          (reachabilityEval.hasPhone || reachabilityEval.hasEmail ? 1 : 0) +
                          (geographyEval.score > 4 ? 1 : 0);

  const confidencePct = Math.round((completeFactors / totalFactors) * 100);
  const confidence = `${Math.max(60, confidencePct)}%`;

  // 6. Synthesize Opportunity Rationale & Next Best Action
  const businessName = safeLead.businessName || safeLead.name || 'Commercial Prospect';
  const location = safeLead.location || 'regional territory';

  let whyThisLeadMatters = `${categoryEval.businessType} in ${location} exhibiting `;
  if (score >= TIER_THRESHOLDS.HOT) {
    whyThisLeadMatters += 'verified commercial viability and immediate digital modernization triggers.';
  } else if (score >= TIER_THRESHOLDS.HIGH) {
    whyThisLeadMatters += 'actionable commercial footprint with strong digital expansion opportunities.';
  } else if (score >= TIER_THRESHOLDS.MEDIUM) {
    whyThisLeadMatters += 'solid regional presence; requires contact enrichment before full campaign.';
  } else {
    whyThisLeadMatters += 'baseline entry awaiting additional contact and reputation verification.';
  }

  const businessOpportunity = websiteEval.status === 'ABSENT'
    ? `Build a high-converting, modern web application and mobile presence to capture online search demand.`
    : websiteEval.status === 'INSECURE'
    ? `Upgrade legacy web architecture with modern security, responsive UI/UX, and cloud speed optimization.`
    : categoryEval.defaultOpportunity;

  let nextBestAction = 'Initiate introductory outreach via phone or WhatsApp.';
  if (!reachabilityEval.hasPhone && !reachabilityEval.hasEmail) {
    nextBestAction = 'Enrich contact records: verify official business phone number and decision-maker email.';
  } else if (!reachabilityEval.hasPhone) {
    nextBestAction = 'Dispatch personalized email introduction to verified company address.';
  } else if (reachabilityEval.hasNamedPerson) {
    nextBestAction = `Schedule direct conversation with ${reachabilityEval.contactPerson} regarding ${services.primary}.`;
  }

  // 7. Structured AI Analysis Sub-matrix
  const aiAnalysis = {
    businessType: categoryEval.businessType,
    websiteOpportunity: {
      level: websiteEval.status === 'ABSENT' ? 'CRITICAL' : websiteEval.status === 'INSECURE' ? 'HIGH' : 'MEDIUM',
      note: websiteEval.notes
    },
    digitalMarketingOpportunity: {
      level: vitalityEval.reviewCount && vitalityEval.reviewCount > 50 ? 'HIGH' : 'MEDIUM',
      note: `Regional search visibility and lead acquisition potential for ${categoryEval.businessType}.`
    },
    uiUxOpportunity: {
      level: websiteEval.status === 'ABSENT' ? 'HIGH' : 'MEDIUM',
      note: 'Mobile-responsive interface and customer inquiry funnel optimization.'
    },
    aiOpportunity: {
      level: ['manufacturing', 'industrial', 'healthcare', 'it'].some(c => (safeLead.category || '').toLowerCase().includes(c)) ? 'HIGH' : 'MEDIUM',
      note: 'Automated business workflow, customer triage bot, and predictive intelligence.'
    },
    iotOpportunity: {
      level: ['manufacturing', 'industrial', 'textile'].some(c => (safeLead.category || '').toLowerCase().includes(c)) ? 'CRITICAL' : 'LOW',
      note: 'Smart factory sensors, energy monitoring, and telemetry gateways.'
    }
  };

  return {
    score,
    tier,
    confidence,
    qualificationLevel,
    recommendedService: services.primary,
    secondaryService: services.secondary,
    scoringBreakdown: {
      totalScore: score,
      maxScore: 100,
      website: websiteEval,
      commercialVitality: vitalityEval,
      categoryReadiness: categoryEval,
      reachability: reachabilityEval,
      geographicClustering: geographyEval
    },
    missingInfo,
    missingFields,
    whyThisLeadMatters,
    businessOpportunity,
    nextBestAction,
    aiAnalysis,
    evaluatedAt: new Date().toISOString()
  };
}
