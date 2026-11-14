import { supabase, isSupabaseConfigured, supabaseConfigReason } from './supabaseClient.js';

/**
 * Extracts missing field info objects from a scoring breakdown object.
 * Useful for reconstructing transparent missing data if meta.missingInfo was omitted.
 */
export const extractMissingInfoFromBreakdown = (breakdown) => {
  if (!breakdown || typeof breakdown !== 'object') return [];
  const list = [];
  if (breakdown.website?.missing) list.push(breakdown.website.missing);
  if (Array.isArray(breakdown.commercialVitality?.missing)) {
    list.push(...breakdown.commercialVitality.missing);
  }
  if (Array.isArray(breakdown.reachability?.missing)) {
    list.push(...breakdown.reachability.missing);
  }
  if (breakdown.geographicClustering?.missing) {
    list.push(breakdown.geographicClustering.missing);
  }
  return list;
};

/**
 * Transforms a Supabase PostgreSQL row (snake_case) into a frontend lead object (camelCase).
 */
export const mapDbRowToFrontendLead = (row) => {
  if (!row) return null;

  const rawScore = row.ai_score;
  const aiScore = rawScore !== null && rawScore !== undefined && !isNaN(rawScore) ? Number(rawScore) : null;
  
  let scoreTier = 'UNSCORED';
  if (aiScore !== null) {
    scoreTier = aiScore >= 88 ? 'HOT' : aiScore >= 70 ? 'HIGH' : 'MEDIUM';
  }

  const meta = row.metadata || {};

  return {
    id: row.id,
    businessName: row.business_name || 'Unnamed Prospect',
    category: row.category || 'Commercial',
    location: row.location || 'India',
    contactPerson: row.contact_person || (meta.isRealData ? 'Unassigned (OSM Data)' : 'Lead Manager'),
    designation: meta.designation || (meta.isRealData ? 'Commercial Entity' : 'Director'),
    email: row.email || '',
    phone: row.phone || '',
    website: row.website || '',
    socialMedia: meta.socialMedia || {},
    source: row.source || 'Database',
    sourceId: row.source_id || null,
    osmId: meta.osmId || (row.source_id && row.source_id.startsWith('osm-') ? row.source_id.replace(/^osm-(node|way|relation)-/, '') : null),
    osmType: meta.osmType || null,
    osmUrl: meta.osmUrl || null,
    isRealData: !!meta.isRealData,
    lat: row.latitude !== null && row.latitude !== undefined ? Number(row.latitude) : null,
    lng: row.longitude !== null && row.longitude !== undefined ? Number(row.longitude) : null,
    storageMode: 'Supabase PostgreSQL',
    dateAdded: row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    status: row.status || 'New',
    aiScore,
    scoreTier: meta.scoreTier || scoreTier,
    confidence: meta.confidence || (aiScore ? `${aiScore}%` : 'Pending AI Run'),
    qualificationLevel: meta.qualificationLevel || (meta.isRealData ? 'Unqualified • Needs AI Scan' : 'Qualified Lead'),
    recommendedService: row.recommended_service || 'Web Development',
    secondaryService: meta.secondaryService || null,
    rating: meta.rating !== undefined ? meta.rating : null,
    reviewCount: meta.reviewCount !== undefined ? meta.reviewCount : null,
    address: meta.address || row.location,
    summary: row.description || '',
    description: row.description || '',
    scoringBreakdown: meta.scoringBreakdown || null,
    missingFields: Array.isArray(meta.missingFields)
      ? meta.missingFields.map(item => (typeof item === 'object' && item?.field ? item.field : String(item)))
      : (Array.isArray(meta.missingInfo) ? meta.missingInfo.map(item => (typeof item === 'object' && item?.field ? item.field : String(item))) : []),
    missingInfo: Array.isArray(meta.missingInfo) && meta.missingInfo.length > 0
      ? meta.missingInfo
      : extractMissingInfoFromBreakdown(meta.scoringBreakdown),
    lastEvaluatedAt: meta.lastEvaluatedAt || null,
    aiAnalysis: meta.aiAnalysis || {
      businessType: row.category || 'Commercial Entity',
      websiteOpportunity: { level: row.website ? 'MEDIUM' : 'HIGH', note: row.website ? 'Website evaluation pending.' : 'No website listed in records.' },
      digitalMarketingOpportunity: { level: 'MEDIUM', note: 'Regional visibility optimization opportunity.' },
      uiUxOpportunity: { level: 'MEDIUM', note: 'Customer digital experience assessment.' },
      aiOpportunity: { level: 'HIGH', note: 'Workflow automation opportunity.' },
      iotOpportunity: { level: 'LOW', note: 'Telemetry evaluation.' }
    },
    whyThisLeadMatters: meta.whyThisLeadMatters || `High-value prospective commercial entity in ${row.location}.`,
    businessOpportunity: meta.businessOpportunity || 'Comprehensive digital transformation and modernization candidate.',
    nextBestAction: meta.nextBestAction || 'Initiate introductory outreach via phone, email, or WhatsApp.',
    outreachDrafts: meta.outreachDrafts || {
      email: {
        subject: `Digital Transformation Proposal for ${row.business_name}`,
        body: `Dear ${row.contact_person || 'Business Owner'},\n\nWe would love to introduce PRCBO Tech digital services tailored for ${row.business_name}...`
      },
      whatsapp: {
        message: `Hello! Greetings from PRCBO Tech to ${row.business_name}. We noticed opportunities to optimize your digital presence.`
      },
      initialMessage: `Hi, let's explore collaborating on technology solutions for ${row.business_name}!`
    }
  };
};

/**
 * Transforms a frontend lead object (camelCase) into a Supabase PostgreSQL row (snake_case).
 */
export const mapFrontendLeadToDbRow = (lead) => {
  const businessName = (lead.businessName || lead.business_name || '').trim();
  const rawScore = lead.aiScore !== undefined ? lead.aiScore : lead.ai_score;
  const aiScore = rawScore !== null && rawScore !== undefined && !isNaN(rawScore) ? Math.round(Number(rawScore)) : null;

  const row = {
    business_name: businessName,
    category: lead.category || 'Commercial',
    contact_person: lead.contactPerson || lead.contact_person || null,
    email: lead.email ? lead.email.trim() : null,
    phone: lead.phone ? lead.phone.trim() : null,
    website: lead.website ? lead.website.trim() : null,
    location: lead.location || 'India',
    latitude: lead.lat !== undefined && lead.lat !== null && !isNaN(lead.lat) ? Number(lead.lat) : null,
    longitude: lead.lng !== undefined && lead.lng !== null && !isNaN(lead.lng) ? Number(lead.lng) : null,
    recommended_service: lead.recommendedService || lead.recommended_service || 'Web Development',
    ai_score: aiScore,
    status: lead.status || 'New',
    source: lead.source || (lead.isRealData ? 'OpenStreetMap Live' : 'Manual Entry'),
    source_id: lead.sourceId || lead.source_id || (lead.osmId ? `osm-${lead.osmType || 'node'}-${lead.osmId}` : null),
    description: (lead.summary || lead.description || lead.opportunitySnippet || '').trim(),
    metadata: {
      isRealData: !!lead.isRealData,
      scoreTier: lead.scoreTier,
      confidence: lead.confidence,
      qualificationLevel: lead.qualificationLevel,
      designation: lead.designation,
      osmId: lead.osmId,
      osmType: lead.osmType,
      osmUrl: lead.osmUrl,
      socialMedia: lead.socialMedia,
      rating: lead.rating !== undefined ? lead.rating : null,
      reviewCount: lead.reviewCount !== undefined ? lead.reviewCount : null,
      address: lead.address,
      secondaryService: lead.secondaryService,
      aiAnalysis: lead.aiAnalysis,
      outreachDrafts: lead.outreachDrafts,
      whyThisLeadMatters: lead.whyThisLeadMatters,
      businessOpportunity: lead.businessOpportunity,
      nextBestAction: lead.nextBestAction,
      scoringBreakdown: lead.scoringBreakdown || null,
      missingFields: Array.isArray(lead.missingFields)
        ? lead.missingFields.map(item => (typeof item === 'object' && item?.field ? item.field : String(item)))
        : (Array.isArray(lead.missingInfo) ? lead.missingInfo.map(item => (typeof item === 'object' && item?.field ? item.field : String(item))) : []),
      missingInfo: Array.isArray(lead.missingInfo) && lead.missingInfo.length > 0
        ? lead.missingInfo
        : extractMissingInfoFromBreakdown(lead.scoringBreakdown),
      lastEvaluatedAt: lead.lastEvaluatedAt || null
    }
  };

  // Only assign explicit ID if it's already a valid UUID
  if (lead.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lead.id)) {
    row.id = lead.id;
  }

  return row;
};

/**
 * Loads all leads from the Supabase PostgreSQL database ordered by creation date descending.
 * @returns {Promise<{ data: Array|null, error: object|null }>}
 */
export const fetchLeadsFromDatabase = async () => {
  if (!isSupabaseConfigured || !supabase) {
    return {
      data: null,
      error: {
        message: supabaseConfigReason || 'Supabase credentials not configured',
        isConfigured: false
      }
    };
  }

  try {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error };
    }

    const mapped = (data || []).map(mapDbRowToFrontendLead);
    return { data: mapped, error: null };
  } catch (err) {
    return {
      data: null,
      error: {
        message: err.message || 'Network error fetching leads from Supabase'
      }
    };
  }
};

/**
 * Inserts a single lead record into Supabase PostgreSQL.
 * Handles duplicate conflicts (source_id or business_name + location) gracefully.
 * @param {object} leadData - Frontend lead object
 * @returns {Promise<{ data: object|null, error: object|null }>}
 */
export const insertLeadToDatabase = async (leadData) => {
  if (!isSupabaseConfigured || !supabase) {
    return {
      data: null,
      error: {
        message: supabaseConfigReason || 'Supabase credentials not configured',
        isConfigured: false
      }
    };
  }

  try {
    const dbRow = mapFrontendLeadToDbRow(leadData);

    const { data, error } = await supabase
      .from('leads')
      .insert([dbRow])
      .select()
      .single();

    if (error) {
      // 23505 is PostgreSQL unique constraint violation code
      const isDuplicate = error.code === '23505' || error.message?.toLowerCase().includes('duplicate') || error.message?.toLowerCase().includes('unique');
      return {
        data: null,
        error: {
          ...error,
          isDuplicate,
          message: isDuplicate
            ? `"${leadData.businessName || 'Business'}" is already registered in the Supabase database.`
            : error.message
        }
      };
    }

    return {
      data: mapDbRowToFrontendLead(data),
      error: null
    };
  } catch (err) {
    return {
      data: null,
      error: {
        message: err.message || 'Failed to insert lead into Supabase'
      }
    };
  }
};

/**
 * Updates a lead's CRM status in Supabase PostgreSQL.
 * @param {string} leadId - UUID of lead record
 * @param {string} newStatus - New CRM status string
 * @returns {Promise<{ data: object|null, error: object|null }>}
 */
export const updateLeadStatusInDatabase = async (leadId, newStatus) => {
  if (!isSupabaseConfigured || !supabase) {
    return {
      data: null,
      error: {
        message: supabaseConfigReason || 'Supabase credentials not configured',
        isConfigured: false
      }
    };
  }

  try {
    const { data, error } = await supabase
      .from('leads')
      .update({ status: newStatus })
      .eq('id', leadId)
      .select()
      .single();

    if (error) {
      return { data: null, error };
    }

    return {
      data: mapDbRowToFrontendLead(data),
      error: null
    };
  } catch (err) {
    return {
      data: null,
      error: {
        message: err.message || 'Failed to update lead status in Supabase'
      }
    };
  }
};

/**
 * Safely merges existing lead metadata with incoming updates without overwriting
 * unrelated metadata fields. Supports deep merging for structured nested objects
 * such as aiAnalysis, outreachDrafts, and scoringBreakdown.
 * 
 * @param {object} existingMeta - Existing JSONB metadata from PostgreSQL
 * @param {object} updates - Updates object passed to leadService
 * @returns {object} Cleanly merged metadata object
 */
export const mergeLeadMetadata = (existingMeta = {}, updates = {}) => {
  const current = (existingMeta && typeof existingMeta === 'object' && !Array.isArray(existingMeta))
    ? { ...existingMeta }
    : {};
  const incoming = (updates && typeof updates === 'object' && !Array.isArray(updates))
    ? updates
    : {};

  const directMeta = (incoming.metadata && typeof incoming.metadata === 'object' && !Array.isArray(incoming.metadata))
    ? incoming.metadata
    : {};

  const metadataKeys = [
    'isRealData',
    'scoreTier',
    'confidence',
    'qualificationLevel',
    'designation',
    'osmId',
    'osmType',
    'osmUrl',
    'socialMedia',
    'rating',
    'reviewCount',
    'address',
    'secondaryService',
    'aiAnalysis',
    'outreachDrafts',
    'whyThisLeadMatters',
    'businessOpportunity',
    'nextBestAction',
    'scoringBreakdown',
    'missingFields',
    'missingInfo',
    'lastEvaluatedAt'
  ];

  const merged = {
    ...current,
    ...directMeta
  };

  for (const key of metadataKeys) {
    if (incoming[key] !== undefined) {
      merged[key] = incoming[key];
    }
  }

  // Deep-merge aiAnalysis if present
  if (incoming.aiAnalysis !== undefined || directMeta.aiAnalysis !== undefined || current.aiAnalysis !== undefined) {
    merged.aiAnalysis = {
      ...(typeof current.aiAnalysis === 'object' && current.aiAnalysis !== null ? current.aiAnalysis : {}),
      ...(typeof directMeta.aiAnalysis === 'object' && directMeta.aiAnalysis !== null ? directMeta.aiAnalysis : {}),
      ...(typeof incoming.aiAnalysis === 'object' && incoming.aiAnalysis !== null ? incoming.aiAnalysis : {})
    };
  }

  // Deep-merge outreachDrafts if present
  if (incoming.outreachDrafts !== undefined || directMeta.outreachDrafts !== undefined || current.outreachDrafts !== undefined) {
    merged.outreachDrafts = {
      ...(typeof current.outreachDrafts === 'object' && current.outreachDrafts !== null ? current.outreachDrafts : {}),
      ...(typeof directMeta.outreachDrafts === 'object' && directMeta.outreachDrafts !== null ? directMeta.outreachDrafts : {}),
      ...(typeof incoming.outreachDrafts === 'object' && incoming.outreachDrafts !== null ? incoming.outreachDrafts : {})
    };
  }

  // Normalize missing fields/info to guaranteed clean arrays
  if (Array.isArray(merged.missingFields)) {
    merged.missingFields = merged.missingFields.map(item =>
      (typeof item === 'object' && item !== null && item.field) ? item.field : String(item)
    );
  } else if (Array.isArray(merged.missingInfo)) {
    merged.missingFields = merged.missingInfo.map(item =>
      (typeof item === 'object' && item !== null && item.field) ? item.field : String(item)
    );
  } else {
    merged.missingFields = [];
  }

  if (Array.isArray(merged.missingInfo)) {
    // missingInfo is preserved as array of objects
  } else if (merged.scoringBreakdown) {
    merged.missingInfo = extractMissingInfoFromBreakdown(merged.scoringBreakdown);
  } else {
    merged.missingInfo = [];
  }

  return merged;
};

/**
 * Updates fields of an existing lead in Supabase PostgreSQL.
 * Safely fetches and merges metadata to ensure unrelated fields are never overwritten.
 * 
 * @param {string} leadId - UUID of lead record
 * @param {object} updates - Fields to update
 * @returns {Promise<{ data: object|null, error: object|null }>}
 */
export const updateLeadInDatabase = async (leadId, updates) => {
  if (!leadId) {
    return {
      data: null,
      error: {
        message: 'A valid leadId is required to update a lead in Supabase'
      }
    };
  }

  if (!isSupabaseConfigured || !supabase) {
    return {
      data: null,
      error: {
        message: supabaseConfigReason || 'Supabase credentials not configured',
        isConfigured: false
      }
    };
  }

  try {
    const dbUpdates = {};
    if (updates.businessName !== undefined) dbUpdates.business_name = updates.businessName;
    else if (updates.business_name !== undefined) dbUpdates.business_name = updates.business_name;

    if (updates.category !== undefined) dbUpdates.category = updates.category;

    if (updates.contactPerson !== undefined) dbUpdates.contact_person = updates.contactPerson;
    else if (updates.contact_person !== undefined) dbUpdates.contact_person = updates.contact_person;

    if (updates.email !== undefined) dbUpdates.email = updates.email ? updates.email.trim() : null;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone ? updates.phone.trim() : null;
    if (updates.website !== undefined) dbUpdates.website = updates.website ? updates.website.trim() : null;
    if (updates.location !== undefined) dbUpdates.location = updates.location;

    if (updates.latitude !== undefined) dbUpdates.latitude = updates.latitude !== null && !isNaN(updates.latitude) ? Number(updates.latitude) : null;
    else if (updates.lat !== undefined) dbUpdates.latitude = updates.lat !== null && !isNaN(updates.lat) ? Number(updates.lat) : null;

    if (updates.longitude !== undefined) dbUpdates.longitude = updates.longitude !== null && !isNaN(updates.longitude) ? Number(updates.longitude) : null;
    else if (updates.lng !== undefined) dbUpdates.longitude = updates.lng !== null && !isNaN(updates.lng) ? Number(updates.lng) : null;

    if (updates.recommendedService !== undefined) dbUpdates.recommended_service = updates.recommendedService;
    else if (updates.recommended_service !== undefined) dbUpdates.recommended_service = updates.recommended_service;

    const rawAiScore = updates.aiScore !== undefined ? updates.aiScore : updates.ai_score;
    if (rawAiScore !== undefined) {
      dbUpdates.ai_score = (rawAiScore !== null && !isNaN(rawAiScore)) ? Math.round(Number(rawAiScore)) : null;
    }

    if (updates.status !== undefined) dbUpdates.status = updates.status;

    if (updates.summary !== undefined) dbUpdates.description = updates.summary;
    else if (updates.description !== undefined) dbUpdates.description = updates.description;

    // Check if any metadata or metadata-bound properties are being updated
    const metadataKeys = [
      'isRealData',
      'scoreTier',
      'confidence',
      'qualificationLevel',
      'designation',
      'osmId',
      'osmType',
      'osmUrl',
      'socialMedia',
      'rating',
      'reviewCount',
      'address',
      'secondaryService',
      'aiAnalysis',
      'outreachDrafts',
      'whyThisLeadMatters',
      'businessOpportunity',
      'nextBestAction',
      'scoringBreakdown',
      'missingFields',
      'missingInfo',
      'lastEvaluatedAt'
    ];

    const hasDirectMetadata = updates.metadata !== undefined && typeof updates.metadata === 'object' && updates.metadata !== null;
    const hasFieldMetadata = metadataKeys.some(key => updates[key] !== undefined);

    if (hasDirectMetadata || hasFieldMetadata) {
      // Query the existing lead record to retrieve current metadata
      const { data: currentRecord } = await supabase
        .from('leads')
        .select('metadata')
        .eq('id', leadId)
        .maybeSingle();

      const existingMeta = currentRecord?.metadata || {};
      dbUpdates.metadata = mergeLeadMetadata(existingMeta, updates);
    }

    const { data, error } = await supabase
      .from('leads')
      .update(dbUpdates)
      .eq('id', leadId)
      .select()
      .single();

    if (error) {
      return { data: null, error };
    }

    return {
      data: mapDbRowToFrontendLead(data),
      error: null
    };
  } catch (err) {
    return {
      data: null,
      error: {
        message: err.message || 'Failed to update lead in Supabase'
      }
    };
  }
};

/**
 * Deletes a lead record from Supabase PostgreSQL by ID.
 * @param {string} leadId - UUID of lead record
 * @returns {Promise<{ success: boolean, error: object|null }>}
 */
export const deleteLeadFromDatabase = async (leadId) => {
  if (!isSupabaseConfigured || !supabase) {
    return {
      success: false,
      error: {
        message: supabaseConfigReason || 'Supabase credentials not configured',
        isConfigured: false
      }
    };
  }

  try {
    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', leadId);

    if (error) {
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (err) {
    return {
      success: false,
      error: {
        message: err.message || 'Failed to delete lead from Supabase'
      }
    };
  }
};

/**
 * Maps a database row from public.outreach_logs into a frontend outreach log object.
 * @param {object} row - Database row from Supabase
 * @returns {object|null}
 */
export const mapDbRowToFrontendOutreachLog = (row) => {
  if (!row) return null;
  const meta = (row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata))
    ? row.metadata
    : {};

  // If joined with leads table (via row.leads), prioritize up-to-date business attributes
  const leadJoin = row.leads || {};

  let defaultOpenStatus = 'Logged as Draft';
  if (row.status === 'Read') {
    defaultOpenStatus = 'Read by recipient (Blue ticks)';
  } else if (row.status === 'Delivered') {
    defaultOpenStatus = row.channel === 'WhatsApp' ? 'Delivered to WhatsApp' : 'Delivered to mail server';
  } else if (row.status === 'Sent') {
    defaultOpenStatus = row.channel === 'WhatsApp' ? 'Sent via Meta Cloud API' : 'Sent via Resend';
  } else if (row.status === 'Bounced') {
    defaultOpenStatus = 'Delivery Bounced';
  } else if (row.status === 'Complained') {
    defaultOpenStatus = 'Marked as Spam';
  } else if (row.status === 'Failed') {
    defaultOpenStatus = 'Dispatch Failed';
  } else if (row.status === 'Opened') {
    defaultOpenStatus = 'Opened by recipient';
  }

  return {
    id: row.id,
    leadId: row.lead_id,
    businessName: leadJoin.business_name || meta.businessName || 'Prospect',
    contactPerson: leadJoin.contact_person || meta.contactPerson || 'Decision Maker',
    channel: row.channel || 'Email',
    template: row.template || `${leadJoin.recommended_service || meta.service || 'Digital Modernization'} Outreach Draft`,
    messageContent: row.message_content || '',
    status: row.status || 'Logged',
    sentAt: row.sent_at
      ? new Date(row.sent_at).toLocaleString()
      : (row.created_at ? new Date(row.created_at).toLocaleString() : 'Just now'),
    deliveredAt: row.delivered_at ? new Date(row.delivered_at).toLocaleString() : null,
    readAt: row.read_at ? new Date(row.read_at).toLocaleString() : null,
    bouncedAt: row.bounced_at ? new Date(row.bounced_at).toLocaleString() : null,
    createdAt: row.created_at,
    openStatus: meta.openStatus || defaultOpenStatus,
    replyStatus: meta.replyStatus || (row.status === 'Bounced' || row.status === 'Failed' ? 'Undeliverable' : 'Awaiting Response'),
    service: leadJoin.recommended_service || meta.service || '',
    agent: row.operator_name || 'PRCBO Operator',
    recipientEmail: row.recipient_email || '',
    recipientPhone: row.recipient_phone || '',
    providerMessageId: row.provider_message_id || null,
    providerName: row.provider_name || null,
    idempotencyKey: row.idempotency_key || null,
    errorMessage: row.error_message || null,
    events: Array.isArray(meta.events) ? meta.events : []
  };
};

/**
 * Inserts a new outreach activity log into Supabase PostgreSQL.
 * @param {object} logEntry - Outreach log payload
 * @returns {Promise<{ data: object|null, error: object|null }>}
 */
export const insertOutreachLogInDatabase = async (logEntry) => {
  if (!logEntry || typeof logEntry !== 'object' || !logEntry.leadId) {
    return {
      data: null,
      error: {
        message: 'A valid leadId is required to record outreach.'
      }
    };
  }

  if (!isSupabaseConfigured || !supabase) {
    return {
      data: null,
      error: {
        message: supabaseConfigReason || 'Supabase credentials not configured',
        isConfigured: false
      }
    };
  }

  try {
    const payload = {
      lead_id: logEntry.leadId,
      channel: logEntry.channel || 'Email',
      template: logEntry.template || null,
      message_content: logEntry.messageContent || logEntry.messageSnippet || null,
      status: logEntry.status || 'Logged',
      operator_name: logEntry.agent || logEntry.operatorName || 'PRCBO Operator',
      metadata: {
        businessName: logEntry.businessName,
        contactPerson: logEntry.contactPerson,
        service: logEntry.service,
        openStatus: logEntry.openStatus || 'Logged as Draft',
        replyStatus: logEntry.replyStatus || 'Awaiting Response'
      }
    };

    const { data, error } = await supabase
      .from('outreach_logs')
      .insert(payload)
      .select()
      .single();

    if (error) {
      return { data: null, error };
    }

    return {
      data: mapDbRowToFrontendOutreachLog(data),
      error: null
    };
  } catch (err) {
    return {
      data: null,
      error: {
        message: err.message || 'Failed to insert outreach log into Supabase'
      }
    };
  }
};

/**
 * Fetches persisted outreach activity logs from Supabase PostgreSQL.
 * @returns {Promise<{ data: Array, error: object|null }>}
 */
export const fetchOutreachLogsFromDatabase = async () => {
  if (!isSupabaseConfigured || !supabase) {
    return {
      data: [],
      error: {
        message: supabaseConfigReason || 'Supabase credentials not configured',
        isConfigured: false
      }
    };
  }

  try {
    const { data, error } = await supabase
      .from('outreach_logs')
      .select('*, leads(business_name, contact_person, recommended_service)')
      .order('created_at', { ascending: false });

    if (error) {
      return { data: [], error };
    }

    return {
      data: (data || []).map(mapDbRowToFrontendOutreachLog),
      error: null
    };
  } catch (err) {
    return {
      data: [],
      error: {
        message: err.message || 'Failed to fetch outreach logs from Supabase'
      }
    };
  }
};

/**
 * Invokes the dedicated Supabase Edge Function `send-email` to dispatch real emails via Resend.
 * @param {object} params
 * @param {string} params.leadId - Unique lead ID
 * @param {string} params.to - Valid recipient email address
 * @param {string} params.subject - Email subject line
 * @param {string} params.body - Email plain text content
 * @param {string} [params.template] - Optional outreach template name
 * @param {string} [params.idempotencyKey] - Optional idempotency key to prevent double dispatches
 * @returns {Promise<{ data: object|null, error: object|null }>}
 */
export const sendEmailOutreachViaEdgeFunction = async ({
  leadId,
  to,
  subject,
  body,
  template,
  idempotencyKey
}) => {
  if (!leadId) {
    return { data: null, error: { message: 'A valid leadId is required to send email.' } };
  }
  if (!to || typeof to !== 'string' || !to.includes('@')) {
    return { data: null, error: { message: 'A valid recipient email address is required.' } };
  }
  if (!subject || !subject.trim()) {
    return { data: null, error: { message: 'Email subject cannot be empty.' } };
  }
  if (!body || !body.trim()) {
    return { data: null, error: { message: 'Email body cannot be empty.' } };
  }

  if (!isSupabaseConfigured || !supabase) {
    return {
      data: null,
      error: {
        message: supabaseConfigReason || 'Supabase credentials not configured in frontend/.env',
        isConfigured: false
      }
    };
  }

  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        leadId,
        to: to.trim(),
        subject: subject.trim(),
        body: body.trim(),
        template: template || 'Outreach Email',
        idempotencyKey: idempotencyKey || `email-${leadId}-${Date.now()}`
      }
    });

    if (error) {
      let extractedMessage = error.message || 'Failed to invoke send-email Edge Function';
      let errorDetails = null;
      let statusCode = 500;

      // Read response body stream exactly once
      if (error.context && typeof error.context.text === 'function') {
        try {
          const rawText = await error.context.text();
          if (rawText && rawText.trim()) {
            try {
              const errBody = JSON.parse(rawText);
              if (errBody) {
                extractedMessage = errBody.details || errBody.error || extractedMessage;
                errorDetails = errBody;
              }
            } catch {
              // Body is plain text, not JSON
              extractedMessage = rawText.trim();
            }
          }
        } catch {
          // Stream could not be read or was already consumed
        }
        if (error.context.status) {
          statusCode = error.context.status;
        }
      }

      return {
        data: null,
        error: {
          message: extractedMessage,
          status: statusCode,
          details: errorDetails ? (errorDetails.details || errorDetails.error || extractedMessage) : error.message
        }
      };
    }

    if (data && data.error) {
      return {
        data: null,
        error: {
          message: data.error,
          details: data.details || null,
          status: data.status || 'Failed'
        }
      };
    }

    return {
      data,
      error: null
    };
  } catch (err) {
    return {
      data: null,
      error: {
        message: err.message || 'Network exception while dispatching email via Edge Function'
      }
    };
  }
};

/**
 * Invokes the dedicated Supabase Edge Function `send-whatsapp` to dispatch real WhatsApp messages via Meta Cloud API.
 * @param {object} params
 * @param {string} params.leadId - Unique lead ID
 * @param {string} params.to - Valid recipient mobile number (E.164 digits)
 * @param {string} [params.templateName] - Optional Meta approved template name
 * @param {string} [params.languageCode] - Language code, defaults to 'en_US'
 * @param {Array<string>} [params.templateParameters] - Template variable values
 * @param {string} [params.message] - Direct message text (for active 24h customer window)
 * @param {string} [params.idempotencyKey] - Optional idempotency key to prevent double dispatches
 * @returns {Promise<{ data: object|null, error: object|null }>}
 */
export const sendWhatsAppOutreachViaEdgeFunction = async ({
  leadId,
  to,
  templateName,
  languageCode = 'en_US',
  templateParameters,
  message,
  idempotencyKey
}) => {
  if (!leadId) {
    return { data: null, error: { message: 'A valid leadId is required to dispatch WhatsApp outreach.' } };
  }
  if (!to || typeof to !== 'string' || !to.replace(/\D/g, '')) {
    return { data: null, error: { message: 'A valid recipient phone number is required.' } };
  }
  if (!templateName && (!message || !message.trim())) {
    return { data: null, error: { message: 'Either a templateName or message text is required.' } };
  }

  if (!isSupabaseConfigured || !supabase) {
    return {
      data: null,
      error: {
        message: supabaseConfigReason || 'Supabase credentials not configured in frontend/.env',
        isConfigured: false
      }
    };
  }

  try {
    const { data, error } = await supabase.functions.invoke('send-whatsapp', {
      body: {
        leadId,
        to: to.trim(),
        templateName: templateName || undefined,
        languageCode: languageCode || 'en_US',
        templateParameters: Array.isArray(templateParameters) ? templateParameters : undefined,
        message: message ? message.trim() : undefined,
        idempotencyKey: idempotencyKey || `wa-${leadId}-${to.trim().replace(/\D/g, '')}-${Math.floor(Date.now() / 120000)}`
      }
    });

    if (error) {
      let extractedMessage = error.message || 'Failed to invoke send-whatsapp Edge Function';
      let errorDetails = null;
      let statusCode = 500;

      // Extract the structured error JSON from the response if available (read stream exactly once)
      if (error.context && typeof error.context.text === 'function') {
        try {
          const rawText = await error.context.text();
          if (rawText && rawText.trim()) {
            try {
              const errBody = JSON.parse(rawText);
              if (errBody) {
                extractedMessage = errBody.details || errBody.error || extractedMessage;
                errorDetails = errBody;
              }
            } catch {
              // Body is plain text, not JSON
              extractedMessage = rawText.trim();
            }
          }
        } catch {
          // Stream could not be read or was already consumed
        }
        if (error.context.status) {
          statusCode = error.context.status;
        }
      }

      return {
        data: null,
        error: {
          message: extractedMessage,
          status: statusCode,
          details: errorDetails ? (errorDetails.details || errorDetails.error || extractedMessage) : error.message,
          metaStatus: errorDetails?.metaStatus || null,
          metaError: errorDetails?.metaError || null
        }
      };
    }

    if (data && data.error) {
      return {
        data: null,
        error: {
          message: data.details || data.error,
          details: data.details || null,
          status: data.status || 'Failed',
          metaStatus: data.metaStatus || null,
          metaError: data.metaError || null
        }
      };
    }

    return {
      data,
      error: null
    };
  } catch (err) {
    return {
      data: null,
      error: {
        message: err.message || 'Network exception while dispatching WhatsApp via Edge Function'
      }
    };
  }
};

