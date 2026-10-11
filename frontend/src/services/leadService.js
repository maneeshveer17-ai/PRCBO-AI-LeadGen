import { supabase, isSupabaseConfigured, supabaseConfigReason } from './supabaseClient';

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
    rating: meta.rating || null,
    reviewCount: meta.reviewCount || null,
    address: meta.address || row.location,
    summary: row.description || '',
    description: row.description || '',
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
      rating: lead.rating,
      reviewCount: lead.reviewCount,
      address: lead.address,
      secondaryService: lead.secondaryService,
      aiAnalysis: lead.aiAnalysis,
      outreachDrafts: lead.outreachDrafts,
      whyThisLeadMatters: lead.whyThisLeadMatters,
      businessOpportunity: lead.businessOpportunity,
      nextBestAction: lead.nextBestAction
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
 * Updates fields of an existing lead in Supabase PostgreSQL.
 * @param {string} leadId - UUID of lead record
 * @param {object} updates - Fields to update
 * @returns {Promise<{ data: object|null, error: object|null }>}
 */
export const updateLeadInDatabase = async (leadId, updates) => {
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
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.contactPerson !== undefined) dbUpdates.contact_person = updates.contactPerson;
    if (updates.email !== undefined) dbUpdates.email = updates.email;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.website !== undefined) dbUpdates.website = updates.website;
    if (updates.location !== undefined) dbUpdates.location = updates.location;
    if (updates.recommendedService !== undefined) dbUpdates.recommended_service = updates.recommendedService;
    if (updates.aiScore !== undefined) dbUpdates.ai_score = updates.aiScore;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.summary !== undefined) dbUpdates.description = updates.summary;

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
