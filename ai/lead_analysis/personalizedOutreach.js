/**
 * PRCBO AI LeadGen - Deterministic Personalized Outreach & Analysis Generator
 * 
 * Generates tailored, channel-specific outbound communications (Email, WhatsApp, Initial message)
 * and technical opportunity analysis based on verified business attributes.
 * 
 * Works as:
 * 1. An ultra-fast, zero-latency local generation engine (no API key required).
 * 2. A fallback engine for the Supabase Edge Function when LLM providers are rate-limited or offline.
 */

import { resolveCategoryProfile } from '../lead_scoring/scoringRules.js';

/**
 * Formats a professional greeting for the contact person
 */
function formatGreeting(contactPerson) {
  if (!contactPerson || typeof contactPerson !== 'string') return 'Hello,';
  const trimmed = contactPerson.trim();
  const lower = trimmed.toLowerCase();
  const unassignedValues = ['unassigned', 'unassigned (osm data)', 'director', 'lead manager', 'null', 'n/a', ''];
  if (unassignedValues.includes(lower)) return 'Dear Business Leader,';
  return `Dear ${trimmed},`;
}

function formatContactName(contactPerson) {
  if (!contactPerson || typeof contactPerson !== 'string') return 'there';
  const trimmed = contactPerson.trim();
  const lower = trimmed.toLowerCase();
  const unassignedValues = ['unassigned', 'unassigned (osm data)', 'director', 'lead manager', 'commercial entity', 'null', 'n/a', ''];
  if (unassignedValues.includes(lower)) return 'there';
  return trimmed;
}

/**
 * Generates personalized multi-channel outreach drafts tailored to a lead
 * 
 * @param {object} lead - Lead record with business details
 * @param {object} options - Generation options (e.g. tone, channel)
 * @returns {object} Formatted outreach drafts { email: { subject, body }, whatsapp: { message }, initialMessage }
 */
export function generatePersonalizedOutreach(lead = {}, options = {}) {
  const safeLead = lead || {};
  const businessName = (safeLead.businessName || safeLead.name || 'your enterprise').trim();
  const location = (safeLead.location || 'your region').trim();
  const category = (safeLead.category || 'Commercial').trim();
  const contactPerson = safeLead.contactPerson || safeLead.contact_person || '';
  const greeting = formatGreeting(contactPerson);
  const firstName = formatContactName(contactPerson);

  const categoryProfile = resolveCategoryProfile(category);
  const recommendedService = safeLead.recommendedService || categoryProfile.primaryService || 'Web Development';
  const website = (safeLead.website || '').trim().toLowerCase();
  const hasWebsite = website && !['none', 'null', 'n/a', ''].includes(website);
  const isSecure = hasWebsite && website.startsWith('https://');

  let subject = '';
  let emailBody = '';
  let whatsappMsg = '';
  let initialMsg = '';

  // 1. Customized Angles based on digital maturity & vertical
  if (!hasWebsite) {
    subject = `Accelerating Digital Growth & Search Visibility for ${businessName}`;
    emailBody = `${greeting}\n\n` +
      `I recently came across ${businessName} in ${location} and noticed your strong local commercial presence. However, your business currently lacks an indexed official web presence, allowing regional competitors to capture high-intent digital search inquiries.\n\n` +
      `At PRCBO Tech, we engineer high-performance web applications and mobile-optimized digital storefronts specifically designed to convert regional interest into verifiable customer inquiries.\n\n` +
      `We would love to share a complimentary 5-minute prototype architecture demonstrating how an official web presence can expand ${businessName}'s customer pipeline.\n\n` +
      `Would you be open to a brief 10-minute discovery call this week?\n\n` +
      `Best regards,\n` +
      `PRCBO Tech Solutions Team\n` +
      `https://prcbo.in`;

    whatsappMsg = `Hi ${firstName}! Greetings from PRCBO Tech. We noticed ${businessName}'s strong presence in ${location}. Our engineering team developed a rapid web prototype tailored to capture customer search inquiries for your business. Can we share a quick 2-minute preview?`;
    initialMsg = `Hi ${firstName}, I noticed ${businessName} in ${location} and would love to share how our web engineering team helps regional businesses capture direct digital customer demand.`;

  } else if (!isSecure) {
    subject = `Modernizing Web Security & User Experience for ${businessName}`;
    emailBody = `${greeting}\n\n` +
      `While reviewing ${businessName}'s digital assets at ${safeLead.website}, our systems identified that your web application is operating without secure HTTPS protocol encryption, triggering security warnings for visiting prospects.\n\n` +
      `PRCBO Tech specializes in comprehensive web modernization: SSL security, modern responsive UI/UX, and cloud speed optimization to maximize user retention and trust.\n\n` +
      `We have compiled a brief modernization roadmap for ${businessName}. Would you be available for a short 10-minute dialogue this Thursday at 3 PM?\n\n` +
      `Warm regards,\n` +
      `PRCBO Tech Engineering Team`;

    whatsappMsg = `Hello ${firstName}! PRCBO Tech noticed opportunities to upgrade ${businessName}'s web performance and SSL security to boost visitor conversion. Open to a quick 2-minute overview?`;
    initialMsg = `Hi ${firstName}, exploring web modernization and cloud performance upgrades for ${businessName}. Let's connect!`;

  } else if (categoryProfile.primaryService === 'IoT Solutions') {
    subject = `Automated Factory Telemetry & Sensor Dashboards for ${businessName}`;
    emailBody = `${greeting}\n\n` +
      `I am reaching out regarding ${businessName}'s industrial operations in ${location}. In today's competitive B2B manufacturing landscape, unscheduled downtime and manual machinery logging represent significant operational overhead.\n\n` +
      `PRCBO Tech deploys industrial IoT telemetry systems, smart sensor gateways, and real-time production analytics dashboards that give leadership 24/7 visibility over facility throughput and energy consumption.\n\n` +
      `Could we schedule a concise 10-minute technical consultation to discuss how IoT monitoring can streamline operations at ${businessName}?\n\n` +
      `Best regards,\n` +
      `PRCBO Tech Industrial IoT Division`;

    whatsappMsg = `Hi ${firstName}! PRCBO Tech helps manufacturing leaders in ${location} implement real-time IoT sensor telemetry to reduce downtime. Can we share a quick 1-page overview for ${businessName}?`;
    initialMsg = `Hello ${firstName}, connecting to discuss smart IoT telemetry and production monitoring dashboards for ${businessName}.`;

  } else if (categoryProfile.primaryService === 'AI Development') {
    subject = `Enterprise AI Workflow Automation & Intelligent Tools for ${businessName}`;
    emailBody = `${greeting}\n\n` +
      `As ${businessName} continues to expand its technology footprint in ${location}, integrating custom AI agents and workflow automation can dramatically accelerate internal throughput and client responsiveness.\n\n` +
      `PRCBO Tech builds proprietary AI automation pipelines, intelligent data processing engines, and custom LLM integrations engineered directly into enterprise software stacks.\n\n` +
      `Would you be open to exploring potential AI use cases tailored to ${businessName} during a 10-minute briefing this week?\n\n` +
      `Sincerely,\n` +
      `PRCBO Tech AI Innovation Practice`;

    whatsappMsg = `Hi ${firstName}! Greetings from PRCBO Tech. We build custom AI workflow automation and intelligent assistants for tech enterprises like ${businessName}. Can we share a brief 2-minute case study?`;
    initialMsg = `Hi ${firstName}, let's explore collaborating on enterprise AI automation and intelligent workflows for ${businessName}.`;

  } else {
    // General B2B Modernization Proposition
    subject = `Digital Transformation & Strategic Technology Offerings for ${businessName}`;
    emailBody = `${greeting}\n\n` +
      `I am reaching out from PRCBO Tech following our regional market review of ${location}'s ${category} sector.\n\n` +
      `Our engineering practice delivers end-to-end digital solutions—ranging from modern high-converting web platforms to targeted digital customer acquisition funnels—designed to scale regional enterprises like ${businessName}.\n\n` +
      `We would welcome the opportunity to discuss how we can support ${businessName}'s growth milestones this quarter.\n\n` +
      `Would you be available for a brief introductory call over the next few days?\n\n` +
      `Best regards,\n` +
      `PRCBO Tech Growth Team`;

    whatsappMsg = `Hello ${firstName}! Greetings from PRCBO Tech to ${businessName}. We noticed opportunities to optimize your digital presence and customer acquisition in ${location}. Open to a brief 2-minute chat?`;
    initialMsg = `Hello ${firstName}, let's connect regarding high-impact digital solutions and technology modernization for ${businessName}!`;
  }

  return {
    email: {
      subject,
      body: emailBody
    },
    whatsapp: {
      message: whatsappMsg
    },
    initialMessage: initialMsg,
    generatedAt: new Date().toISOString(),
    isLlmPowered: false,
    engine: 'deterministic-personalization'
  };
}

/**
 * Generates structured business opportunity analysis for a lead
 */
export function generateBusinessOpportunityAnalysis(lead = {}) {
  const safeLead = lead || {};
  const businessName = safeLead.businessName || safeLead.name || 'Commercial Prospect';
  const category = safeLead.category || 'Commercial';
  const location = safeLead.location || 'regional cluster';
  const website = (safeLead.website || '').trim();
  const hasWebsite = website && !['none', 'null', 'n/a', ''].includes(website.toLowerCase());
  const isSecure = hasWebsite && website.toLowerCase().startsWith('https://');

  const profile = resolveCategoryProfile(category);
  const recommendedService = !hasWebsite || !isSecure ? 'Web Development' : profile.primaryService;
  const secondaryService = recommendedService === 'Web Development' ? profile.primaryService : profile.secondaryService;

  let whyThisLeadMatters = `${profile.businessType} located in ${location}`;
  if (!hasWebsite) {
    whyThisLeadMatters += ' with high local commercial activity but no detected web presence, creating an urgent conversion vulnerability.';
  } else if (!isSecure) {
    whyThisLeadMatters += ' operating an unencrypted HTTP web portal with immediate modernization and security triggers.';
  } else {
    whyThisLeadMatters += ` with established operational footprint prime for ${recommendedService} integration.`;
  }

  let businessOpportunity = '';
  if (!hasWebsite) {
    businessOpportunity = `Deploy a modern, conversion-focused mobile web portal to capture organic search queries for ${category} in ${location}.`;
  } else if (!isSecure) {
    businessOpportunity = `Migrate legacy web architecture to HTTPS, upgrade responsive UI/UX, and optimize customer inquiry flow.`;
  } else {
    businessOpportunity = profile.defaultOpportunity;
  }

  const nextBestAction = (!safeLead.phone && !safeLead.email)
    ? 'Verify contact numbers and decision-maker email via secondary discovery before outbound pitch.'
    : safeLead.phone
    ? `Dispatch WhatsApp pitch introduction to ${safeLead.contactPerson || 'business owner'} focused on ${recommendedService}.`
    : `Send personalized email proposal to ${safeLead.email} highlighting ${recommendedService}.`;

  const aiAnalysis = {
    businessType: profile.businessType,
    websiteOpportunity: {
      level: !hasWebsite ? 'CRITICAL' : !isSecure ? 'HIGH' : 'MEDIUM',
      note: !hasWebsite ? 'No official digital presence detected on record.' : !isSecure ? 'Unencrypted legacy protocol requires SSL and UI upgrade.' : 'Active web presence verified.'
    },
    digitalMarketingOpportunity: {
      level: 'HIGH',
      note: `Regional search visibility and client acquisition campaigns in ${location}.`
    },
    uiUxOpportunity: {
      level: !hasWebsite || !isSecure ? 'HIGH' : 'MEDIUM',
      note: 'Mobile-responsive interface and customer inquiry funnel optimization.'
    },
    aiOpportunity: {
      level: ['manufacturing', 'industrial', 'healthcare', 'it'].some(c => category.toLowerCase().includes(c)) ? 'HIGH' : 'MEDIUM',
      note: 'Automated workflow pipelines, triage bots, and business intelligence.'
    },
    iotOpportunity: {
      level: ['manufacturing', 'industrial', 'textile'].some(c => category.toLowerCase().includes(c)) ? 'CRITICAL' : 'LOW',
      note: 'Sensor integration, facility monitoring, and telemetry dashboards.'
    }
  };

  return {
    whyThisLeadMatters,
    businessOpportunity,
    nextBestAction,
    recommendedService,
    secondaryService,
    aiAnalysis,
    analyzedAt: new Date().toISOString()
  };
}
