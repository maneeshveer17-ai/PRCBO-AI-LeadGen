import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { mockLeads as initialLeads, getKpiMetrics } from '../data/mockLeads';
import { mockDiscoveredBusinesses as initialDiscovery } from '../data/mockDiscovery';
import { mockOutreachLogs as initialOutreach } from '../data/mockOutreach';
import { isSupabaseConfigured, supabaseConfigReason } from '../services/supabaseClient';
import {
  fetchLeadsFromDatabase,
  insertLeadToDatabase,
  updateLeadStatusInDatabase,
  updateLeadInDatabase,
  deleteLeadFromDatabase,
  insertOutreachLogInDatabase,
  fetchOutreachLogsFromDatabase,
  sendEmailOutreachViaEdgeFunction,
  sendWhatsAppOutreachViaEdgeFunction
} from '../services/leadService';
import { useAuth } from './AuthContext';
import {
  calculateLeadScore,
  getScoreTier,
  scoreLead,
  enrichLeadWithScore
} from '../services/leadScoringService.js';
import {
  generateAnalysisForLead,
  generateOutreachForLead
} from '../services/aiOutreachService.js';

const LeadContext = createContext(null);

export const LeadProvider = ({ children }) => {
  const { user, isAuthenticated, isAuthorizedOperator } = useAuth();

  // Persistent leads state (starts empty; never silently populated with mock data)
  const [leads, setLeads] = useState([]);
  const [discoveryList, setDiscoveryList] = useState(initialDiscovery);
  const [outreachLogs, setOutreachLogs] = useState(initialOutreach);
  const [searchQuery, setSearchQuery] = useState('');
  const [toasts, setToasts] = useState([]);
  const inFlightWhatsAppRef = useRef(new Set());

  // Database Connection & Sync States
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);
  const [isDatabaseConnected, setIsDatabaseConnected] = useState(false);
  const [databaseError, setDatabaseError] = useState(
    isSupabaseConfigured ? null : (supabaseConfigReason || 'Supabase credentials not configured in frontend/.env')
  );

  // Authenticated operator profile derived dynamically from Supabase session
  const currentUser = useMemo(() => {
    if (!user) {
      return {
        id: null,
        name: "PRCBO Operator",
        role: "Lead Specialist",
        email: "operator@prcbo.in",
        avatar: "PO",
        organization: "PRCBO Tech"
      };
    }

    const email = user.email || '';
    const meta = user.user_metadata || {};
    const name = meta.full_name || meta.name || (email ? email.split('@')[0] : 'PRCBO Operator');
    const initials = name
      .split(' ')
      .filter(Boolean)
      .map(part => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'OP';

    return {
      id: user.id,
      name,
      role: meta.role || (isAuthorizedOperator ? "Lead Engineer" : "Pending Operator"),
      email,
      avatar: initials,
      organization: meta.organization || "PRCBO Tech"
    };
  }, [user, isAuthorizedOperator]);

  // Toast notification helper
  const addToast = useCallback((message, type = 'success', duration = 3500) => {
    const id = Date.now() + Math.random().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Fetch persistent leads from Supabase for authenticated authorized operator
  const refreshLeads = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setIsLoadingLeads(false);
      setIsDatabaseConnected(false);
      setDatabaseError(supabaseConfigReason || 'Supabase credentials not configured in frontend/.env');
      return;
    }

    if (!isAuthorizedOperator) {
      setIsLoadingLeads(false);
      setIsDatabaseConnected(false);
      setDatabaseError('Awaiting administrator operator approval to access lead records.');
      setLeads([]);
      return;
    }

    setIsLoadingLeads(true);
    setDatabaseError(null);

    try {
      const { data, error } = await fetchLeadsFromDatabase();

      if (error) {
        console.warn('Supabase fetch error:', error);
        setIsDatabaseConnected(false);
        const errMsg = error.code === '42501' || error.message?.toLowerCase().includes('policy')
          ? 'Access denied by Row Level Security: Your user lacks approved operator permissions.'
          : (error.message || 'Unable to connect to Supabase PostgreSQL table.');
        setDatabaseError(errMsg);
        // Do not silently fall back to mock data
        setLeads([]);
        addToast(`Supabase: ${errMsg}`, 'error', 5000);
      } else {
        setIsDatabaseConnected(true);
        setDatabaseError(null);
        setLeads(data || []);
      }
    } catch (err) {
      console.error('Lead fetch exception:', err);
      setIsDatabaseConnected(false);
      setDatabaseError(err.message || 'Network error fetching leads from Supabase');
      setLeads([]);
      addToast('Network error querying Supabase', 'error');
    } finally {
      setIsLoadingLeads(false);
    }
  }, [isAuthorizedOperator, addToast]);

  // Fetch persisted outreach activity logs from Supabase
  const refreshOutreachLogs = useCallback(async () => {
    if (!isSupabaseConfigured || !isAuthorizedOperator) {
      return;
    }
    try {
      const { data, error } = await fetchOutreachLogsFromDatabase();
      if (!error && Array.isArray(data)) {
        setOutreachLogs(data);
      }
    } catch (err) {
      console.warn('Failed to load outreach logs from Supabase:', err);
    }
  }, [isAuthorizedOperator]);

  // Trigger lead fetching whenever operator authorization is active
  useEffect(() => {
    if (isAuthenticated && isAuthorizedOperator && isSupabaseConfigured) {
      refreshLeads();
      refreshOutreachLogs();
    } else if (!isAuthenticated || !isAuthorizedOperator) {
      setLeads([]);
      setOutreachLogs([]);
      setIsDatabaseConnected(false);
      setIsLoadingLeads(false);
      if (isAuthenticated && !isAuthorizedOperator) {
        setDatabaseError('Awaiting administrator operator approval to access lead records.');
      }
    }
  }, [isAuthenticated, isAuthorizedOperator, refreshLeads, refreshOutreachLogs]);

  // Manual action to seed initial sample leads to Supabase PostgreSQL if table is empty
  const seedSampleLeadsToDatabase = useCallback(async () => {
    if (!isSupabaseConfigured) {
      addToast('Cannot seed: Supabase credentials are not configured in frontend/.env', 'error');
      return;
    }

    setIsLoadingLeads(true);
    let successCount = 0;
    try {
      for (const sample of initialLeads) {
        const { error } = await insertLeadToDatabase(sample);
        if (!error) successCount++;
      }
      addToast(`Seeded ${successCount} sample leads into Supabase PostgreSQL!`, 'success');
      await refreshLeads();
    } catch (err) {
      addToast(`Seeding error: ${err.message}`, 'error');
    } finally {
      setIsLoadingLeads(false);
    }
  }, [addToast, refreshLeads]);

  // Add new lead (persists to Supabase PostgreSQL)
  const addLead = useCallback(async (newLeadData) => {
    if (!isSupabaseConfigured) {
      addToast('Cannot create lead: Supabase database is not configured.', 'error');
      return null;
    }

    if (!isAuthorizedOperator) {
      addToast('Permission denied: You must be an approved operator to create leads.', 'error');
      return null;
    }

    const isReal = !!newLeadData.isRealData;
    // Calculate deterministic lead score from available attributes
    const deterministicEval = calculateLeadScore(newLeadData);
    const rawAiScore = newLeadData.aiScore;
    const aiScore = (rawAiScore !== undefined && rawAiScore !== null && !isNaN(rawAiScore))
      ? Number(rawAiScore)
      : deterministicEval.score;

    const scoreTier = getScoreTier(aiScore);
    const confidence = newLeadData.confidence || deterministicEval.confidence;
    const qualificationLevel = newLeadData.qualificationLevel || deterministicEval.qualificationLevel;
    const recommendedService = newLeadData.recommendedService || deterministicEval.recommendedService;
    const secondaryService = newLeadData.secondaryService || deterministicEval.secondaryService;
    const whyThisLeadMatters = newLeadData.whyThisLeadMatters || deterministicEval.whyThisLeadMatters;
    const businessOpportunity = newLeadData.businessOpportunity || deterministicEval.businessOpportunity;
    const nextBestAction = newLeadData.nextBestAction || deterministicEval.nextBestAction;
    const aiAnalysis = newLeadData.aiAnalysis || deterministicEval.aiAnalysis;
    const scoringBreakdown = deterministicEval.scoringBreakdown;
    const missingFields = deterministicEval.missingFields;
    const missingInfo = deterministicEval.missingInfo;

    const leadPayload = {
      businessName: newLeadData.businessName || "New Enterprise Prospect",
      category: newLeadData.category || "Commercial",
      location: newLeadData.location || "Madurai, Tamil Nadu",
      contactPerson: newLeadData.contactPerson || (isReal ? "Unassigned (OSM Data)" : "Lead Manager"),
      designation: newLeadData.designation || (isReal ? "Commercial Entity" : "Director"),
      email: newLeadData.email || (isReal ? "" : "contact@prospect.in"),
      phone: newLeadData.phone || (isReal ? "" : "+91 98400 00000"),
      website: newLeadData.website || "",
      socialMedia: newLeadData.socialMedia || {},
      source: newLeadData.source || (isReal ? "OpenStreetMap Live" : "Manual Entry"),
      sourceId: newLeadData.sourceId || null,
      osmId: newLeadData.osmId || null,
      osmType: newLeadData.osmType || null,
      osmUrl: newLeadData.osmUrl || null,
      isRealData: isReal,
      lat: newLeadData.lat ?? null,
      lng: newLeadData.lng ?? null,
      dateAdded: new Date().toISOString().split('T')[0],
      status: newLeadData.status || "New",
      aiScore: aiScore,
      scoreTier: scoreTier,
      confidence: confidence,
      qualificationLevel: qualificationLevel,
      recommendedService: recommendedService,
      secondaryService: secondaryService,
      summary: newLeadData.summary || deterministicEval.businessOpportunity,
      aiAnalysis: aiAnalysis,
      whyThisLeadMatters: whyThisLeadMatters,
      businessOpportunity: businessOpportunity,
      nextBestAction: nextBestAction,
      scoringBreakdown: scoringBreakdown,
      missingFields: missingFields,
      missingInfo: missingInfo,
      lastEvaluatedAt: deterministicEval.evaluatedAt,
      rating: newLeadData.rating !== undefined ? newLeadData.rating : null,
      reviewCount: newLeadData.reviewCount !== undefined ? newLeadData.reviewCount : null,
      outreachDrafts: newLeadData.outreachDrafts || {
        email: { subject: `Introducing PRCBO Tech solutions for ${newLeadData.businessName}`, body: "Hello,\n\nWe would love to introduce PRCBO Tech..." },
        whatsapp: { message: `Hello! Greetings from PRCBO Tech to ${newLeadData.businessName}...` },
        initialMessage: `Hi, let's explore collaborating on digital solutions for ${newLeadData.businessName}!`
      }
    };

    const { data, error } = await insertLeadToDatabase(leadPayload);

    if (error) {
      if (error.isDuplicate) {
        addToast(error.message, 'warning', 4500);
      } else {
        const isRls = error.code === '42501' || error.message?.toLowerCase().includes('policy');
        addToast(isRls ? 'Access denied: Only authorized operators can save leads.' : `Supabase save failed: ${error.message}`, 'error', 5000);
      }
      return null;
    }

    setLeads(prev => [data, ...prev]);
    addToast(`Persisted "${data.businessName}" to Supabase PostgreSQL!`, 'success');
    return data;
  }, [isAuthorizedOperator, addToast]);

  // Add lead from discovery engine (handles real OSM records & sample data with duplicate prevention)
  const addFromDiscovery = useCallback(async (discItem) => {
    // Check in-memory duplicates first
    const existing = leads.find(l => {
      if (discItem.sourceId && l.sourceId && discItem.sourceId === l.sourceId) return true;
      if (discItem.osmId && l.osmId && String(discItem.osmId) === String(l.osmId)) return true;
      return l.businessName.toLowerCase().trim() === (discItem.name || '').toLowerCase().trim();
    });

    if (existing) {
      addToast(`"${discItem.name}" is already in active leads.`, 'info');
      return null;
    }

    const created = await addLead({
      businessName: discItem.name,
      category: discItem.category,
      location: discItem.location,
      phone: discItem.phone || "",
      website: discItem.website || "",
      email: discItem.email || "",
      source: discItem.source || (discItem.isRealData ? "OpenStreetMap Live" : "Sample Discovery Record"),
      sourceId: discItem.sourceId || (discItem.osmId ? `osm-${discItem.osmType || 'node'}-${discItem.osmId}` : null),
      osmId: discItem.osmId || null,
      osmType: discItem.osmType || null,
      osmUrl: discItem.osmUrl || null,
      isRealData: !!discItem.isRealData,
      lat: discItem.lat,
      lng: discItem.lng,
      aiScore: discItem.aiPredictedScore ?? null,
      recommendedService: discItem.recommendedService || null,
      summary: discItem.opportunitySnippet
    });

    if (created) {
      // Mark as added in discovery list
      setDiscoveryList(prev =>
        prev.map(item => (item.id === discItem.id || item.name === discItem.name) ? { ...item, alreadyInLeads: true } : item)
      );
    }

    return created;
  }, [leads, addLead, addToast]);

  // Update lead status in Supabase PostgreSQL
  const updateLeadStatus = useCallback(async (leadId, newStatus) => {
    const prevLead = leads.find(l => l.id === leadId);
    if (!prevLead) return;

    if (!isSupabaseConfigured) {
      addToast('Cannot update status: Supabase database is not configured.', 'error');
      return;
    }

    if (!isAuthorizedOperator) {
      addToast('Permission denied: You must be an approved operator to update status.', 'error');
      return;
    }

    // Optimistically update local UI state
    setLeads(prev => prev.map(lead => (lead.id === leadId ? { ...lead, status: newStatus } : lead)));

    const { error } = await updateLeadStatusInDatabase(leadId, newStatus);
    if (error) {
      // Rollback state if database update failed
      setLeads(prev => prev.map(lead => (lead.id === leadId ? prevLead : lead)));
      const isRls = error.code === '42501' || error.message?.toLowerCase().includes('policy');
      addToast(isRls ? 'Access denied by RLS: Approved operator role required.' : `Failed to update status in Supabase: ${error.message}`, 'error', 4500);
      return;
    }
    addToast(`Status updated to "${newStatus}" in Supabase`, 'success');
  }, [leads, isAuthorizedOperator, addToast]);

  // Update lead fields in Supabase PostgreSQL
  const updateLead = useCallback(async (leadId, updates) => {
    const prevLead = leads.find(l => l.id === leadId);
    if (!prevLead) return;

    if (!isSupabaseConfigured) {
      addToast('Cannot update lead: Supabase database is not configured.', 'error');
      return;
    }

    if (!isAuthorizedOperator) {
      addToast('Permission denied: You must be an approved operator to edit leads.', 'error');
      return;
    }

    setLeads(prev => prev.map(lead => (lead.id === leadId ? { ...lead, ...updates } : lead)));

    const { error } = await updateLeadInDatabase(leadId, updates);
    if (error) {
      setLeads(prev => prev.map(lead => (lead.id === leadId ? prevLead : lead)));
      const isRls = error.code === '42501' || error.message?.toLowerCase().includes('policy');
      addToast(isRls ? 'Access denied by RLS: Approved operator role required.' : `Failed to update lead: ${error.message}`, 'error', 4500);
      return;
    }
    addToast('Lead details updated in Supabase', 'success');
  }, [leads, isAuthorizedOperator, addToast]);

  // Delete lead from Supabase PostgreSQL
  const deleteLead = useCallback(async (leadId) => {
    const leadToDelete = leads.find(l => l.id === leadId);
    if (!leadToDelete) return;

    if (!isSupabaseConfigured) {
      addToast('Cannot delete lead: Supabase database is not configured.', 'error');
      return;
    }

    if (!isAuthorizedOperator) {
      addToast('Permission denied: You must be an approved operator to delete leads.', 'error');
      return;
    }

    setLeads(prev => prev.filter(lead => lead.id !== leadId));

    const { error } = await deleteLeadFromDatabase(leadId);
    if (error) {
      setLeads(prev => [leadToDelete, ...prev]);
      const isRls = error.code === '42501' || error.message?.toLowerCase().includes('policy');
      addToast(isRls ? 'Access denied by RLS: Approved operator role required.' : `Failed to delete lead from Supabase: ${error.message}`, 'error', 4500);
      return;
    }
    addToast(`Deleted "${leadToDelete.businessName}" from Supabase`, 'success');
  }, [leads, isAuthorizedOperator, addToast]);

  // Record outreach action with persistent Supabase logging
  const recordOutreach = useCallback(async (lead, channel, messageSnippet) => {
    if (!lead || !lead.id) {
      addToast('Cannot record outreach: Invalid lead selected.', 'error');
      return { success: false, error: 'Invalid lead' };
    }

    const channelName = channel || 'Email';
    const draftContent = typeof messageSnippet === 'string' ? messageSnippet : '';

    const newLogPayload = {
      leadId: lead.id,
      businessName: lead.businessName,
      contactPerson: lead.contactPerson,
      channel: channelName,
      template: `${lead.recommendedService || 'Digital Modernization'} Outreach Draft`,
      messageContent: draftContent,
      status: "Logged",
      sentAt: "Just now",
      openStatus: "Logged as Draft",
      replyStatus: "Awaiting Response",
      service: lead.recommendedService,
      agent: currentUser.name
    };

    if (isSupabaseConfigured && isAuthorizedOperator) {
      // 1. Persist outreach log to Supabase
      const { data: savedLog, error: logError } = await insertOutreachLogInDatabase(newLogPayload);
      if (logError) {
        console.error('Failed to persist outreach log to Supabase:', logError);
        const isRls = logError.code === '42501' || logError.message?.toLowerCase().includes('policy');
        addToast(
          isRls
            ? 'Access denied by RLS: Approved operator role required to log outreach.'
            : `Failed to save outreach log: ${logError.message}`,
          'error',
          5000
        );
        // Do NOT update lead status if log insertion failed
        return { success: false, error: logError };
      }

      // 2. Only after outreach record successfully saves, update lead status to Contacted
      await updateLeadStatus(lead.id, "Contacted");

      setOutreachLogs(prev => [savedLog || newLogPayload, ...prev]);
      addToast(`Outreach draft recorded for "${lead.businessName}" (${channelName})`, 'success');
      return { success: true, data: savedLog };
    } else if (isSupabaseConfigured && !isAuthorizedOperator) {
      addToast('Permission denied: You must be an approved operator to log outreach.', 'error');
      return { success: false, error: 'Unauthorized operator' };
    } else {
      // Local fallback mode when database credentials are not configured
      const localLog = {
        ...newLogPayload,
        id: `out-${Date.now()}`
      };
      setOutreachLogs(prev => [localLog, ...prev]);
      setLeads(prev => prev.map(l => (l.id === lead.id ? { ...l, status: "Contacted" } : l)));
      addToast(`Outreach draft logged locally (${channelName})`, 'info');
      return { success: true, data: localLog };
    }
  }, [currentUser.name, isAuthorizedOperator, updateLeadStatus, addToast]);

  // Dispatches real outreach email via Supabase send-email Edge Function (Resend API)
  const sendOutreachEmail = useCallback(async (lead, emailData) => {
    if (!lead || !lead.id) {
      addToast('Cannot send email: Invalid lead selected.', 'error');
      return { success: false, error: 'Invalid lead' };
    }

    const recipient = (emailData?.to || lead.email || '').trim();
    if (!recipient || !recipient.includes('@')) {
      addToast('Cannot send email: A valid recipient email address is required.', 'error');
      return { success: false, error: 'Missing or invalid recipient email' };
    }

    const subject = (emailData?.subject || '').trim();
    const body = (emailData?.body || '').trim();
    if (!subject) {
      addToast('Cannot send email: Email subject cannot be empty.', 'error');
      return { success: false, error: 'Missing subject' };
    }
    if (!body) {
      addToast('Cannot send email: Email body cannot be empty.', 'error');
      return { success: false, error: 'Missing body' };
    }

    if (!isAuthorizedOperator) {
      addToast('Permission denied: You must be an approved operator to dispatch emails.', 'error');
      return { success: false, error: 'Unauthorized operator' };
    }

    if (!isSupabaseConfigured) {
      addToast('Cannot send email: Supabase credentials are not configured.', 'error');
      return { success: false, error: 'Supabase unconfigured' };
    }

    const idempotencyKey = emailData?.idempotencyKey || `email-${lead.id}-${Date.now()}`;
    const templateName = emailData?.template || `${lead.recommendedService || 'Digital Modernization'} Outreach`;

    const { data, error } = await sendEmailOutreachViaEdgeFunction({
      leadId: lead.id,
      to: recipient,
      subject,
      body,
      template: templateName,
      idempotencyKey
    });

    if (error) {
      console.error('Email dispatch error:', error);
      const errMsg = (typeof error.details === 'string' && error.details.trim())
        ? error.details
        : (error.message || 'Email delivery failed');
      // Provider error: DO NOT mark lead as Contacted and DO NOT mark outreach as Sent
      addToast(`Email delivery failed: ${errMsg}`, 'error', 6000);
      return { success: false, error };
    }

    // Success: Edge Function already saved status='Sent' in outreach_logs and updated lead to 'Contacted' in Supabase
    setLeads(prev => prev.map(l => (l.id === lead.id ? { ...l, status: 'Contacted' } : l)));

    const newLogEntry = {
      id: data?.logId || `out-${Date.now()}`,
      leadId: lead.id,
      businessName: lead.businessName,
      contactPerson: lead.contactPerson,
      channel: 'Email',
      template: templateName,
      messageContent: `Subject: ${subject}\n\n${body}`,
      status: 'Sent',
      sentAt: 'Just now',
      openStatus: 'Sent via Resend',
      replyStatus: 'Awaiting Response',
      service: lead.recommendedService,
      agent: currentUser.name,
      recipientEmail: recipient,
      providerMessageId: data?.messageId,
      providerName: 'resend',
      idempotencyKey
    };

    setOutreachLogs(prev => [newLogEntry, ...prev]);
    addToast(`Email successfully sent to ${recipient} via Resend (Status: Sent)`, 'success');
    return { success: true, data };
  }, [currentUser.name, isAuthorizedOperator, isSupabaseConfigured, addToast]);

  // Dispatches real outreach WhatsApp message via Supabase send-whatsapp Edge Function (Meta Cloud API)
  const sendOutreachWhatsApp = useCallback(async (lead, whatsAppData) => {
    if (!lead || !lead.id) {
      addToast('Cannot send WhatsApp: Invalid lead selected.', 'error');
      return { success: false, error: 'Invalid lead' };
    }

    const recipient = (whatsAppData?.to || lead.phone || '').trim();
    if (!recipient || !recipient.replace(/\D/g, '')) {
      addToast('Cannot send WhatsApp: A valid recipient phone number is required.', 'error');
      return { success: false, error: 'Missing or invalid recipient phone' };
    }

    const templateName = whatsAppData?.templateName || null;
    const message = (whatsAppData?.message || '').trim();

    if (!templateName && !message) {
      addToast('Cannot send WhatsApp: Either a template or message body is required.', 'error');
      return { success: false, error: 'Missing template or message' };
    }

    if (!isAuthorizedOperator) {
      addToast('Permission denied: You must be an approved operator to dispatch WhatsApp messages.', 'error');
      return { success: false, error: 'Unauthorized operator' };
    }

    if (!isSupabaseConfigured) {
      addToast('Cannot send WhatsApp: Supabase credentials are not configured.', 'error');
      return { success: false, error: 'Supabase unconfigured' };
    }

    const timeBucket = Math.floor(Date.now() / 120000);
    const normalizedPhoneDigits = recipient.replace(/\D/g, '');
    const idempotencyKey = whatsAppData?.idempotencyKey || `wa-${lead.id}-${normalizedPhoneDigits}-${timeBucket}`;
    const languageCode = whatsAppData?.languageCode || 'en_US';
    const templateParameters = whatsAppData?.templateParameters;

    if (inFlightWhatsAppRef.current.has(lead.id)) {
      console.warn(`[LeadContext] Duplicate dispatch blocked: WhatsApp outreach already in flight for lead: ${lead.id}`);
      return { success: false, error: 'A WhatsApp message is already being dispatched for this lead.' };
    }

    inFlightWhatsAppRef.current.add(lead.id);

    try {
      const { data, error } = await sendWhatsAppOutreachViaEdgeFunction({
        leadId: lead.id,
        to: recipient,
        templateName: templateName || undefined,
        languageCode,
        templateParameters,
        message: message || undefined,
        idempotencyKey
      });

      if (error) {
        console.error('WhatsApp dispatch error:', error);
        const errMsg = (typeof error.details === 'string' && error.details.trim())
          ? error.details
          : (error.message || 'WhatsApp delivery failed');
        // Provider error: DO NOT mark lead as Contacted and DO NOT mark outreach as Sent
        addToast(`WhatsApp delivery failed: ${errMsg}`, 'error', 6000);
        return { success: false, error };
      }

      // If duplicate send was suppressed by Edge Function deduplication window
      if (data?.isDuplicateSuppressed) {
        console.log('[LeadContext] Duplicate WhatsApp send suppressed by server:', data);
        addToast(`Notice: WhatsApp outreach was already dispatched to ${recipient} recently (duplicate send prevented).`, 'info', 5000);
        return { success: true, data, suppressed: true };
      }

      // If exact idempotency key replay was returned
      if (data?.isIdempotentReplay) {
        console.log('[LeadContext] Idempotent replay returned for key:', idempotencyKey);
        addToast(`Notice: WhatsApp message already dispatched with this key (idempotent replay).`, 'info', 5000);
        return { success: true, data, replayed: true };
      }

      // Success: Edge Function already saved status='Sent' in outreach_logs and updated lead to 'Contacted' in Supabase
      setLeads(prev => prev.map(l => (l.id === lead.id ? { ...l, status: 'Contacted' } : l)));

      const newLogEntry = {
        id: data?.logId || `out-${Date.now()}`,
        leadId: lead.id,
        businessName: lead.businessName,
        contactPerson: lead.contactPerson,
        channel: 'WhatsApp',
        template: templateName || 'WhatsApp Direct Outreach',
        messageContent: message || (templateName ? `Template: ${templateName}` : 'WhatsApp Outreach'),
        status: 'Sent',
        sentAt: 'Just now',
        openStatus: 'Sent via Meta Cloud API',
        replyStatus: 'Awaiting Response',
        service: lead.recommendedService,
        agent: currentUser.name,
        recipientPhone: recipient,
        providerMessageId: data?.messageId,
        providerName: 'whatsapp',
        idempotencyKey
      };

      setOutreachLogs(prev => [newLogEntry, ...prev]);
      addToast(`WhatsApp message sent to ${recipient} via Meta Cloud API (Status: Sent)`, 'success');
      return { success: true, data };
    } finally {
      inFlightWhatsAppRef.current.delete(lead.id);
    }
  }, [currentUser.name, isAuthorizedOperator, isSupabaseConfigured, addToast]);

  // Evaluates a single lead using the deterministic AI scoring engine
  const scoreLeadRecord = useCallback(async (leadId) => {
    const target = leads.find(l => l.id === leadId);
    if (!target) return null;

    const scored = enrichLeadWithScore(target);
    setLeads(prev => prev.map(l => l.id === leadId ? scored : l));

    if (isSupabaseConfigured && isAuthorizedOperator) {
      try {
        const delta = scoreLead(target);
        const { data, error } = await updateLeadInDatabase(leadId, delta);
        if (error) {
          console.error('Failed to persist scored lead to Supabase:', error);
          addToast(`Scored locally, but database persistence failed: ${error.message}`, 'error', 4500);
          return scored;
        }
        if (data) {
          setLeads(prev => prev.map(l => l.id === leadId ? data : l));
          addToast(`Evaluated "${target.businessName}": Score ${data.aiScore}/100 (${data.scoreTier}) - Saved to Supabase`, 'success');
          return data;
        }
      } catch (err) {
        console.error('Exception persisting scored lead to Supabase:', err);
        addToast(`Scored locally, but persistence error: ${err.message}`, 'error', 4500);
        return scored;
      }
    }

    addToast(`Evaluated "${target.businessName}": Score ${scored.aiScore}/100 (${scored.scoreTier})`, 'success');
    return scored;
  }, [leads, isSupabaseConfigured, isAuthorizedOperator, addToast]);

  // Performs complete AI opportunity analysis and outreach synthesis for a lead, persisting results to Supabase
  const analyzeLeadRecord = useCallback(async (leadId) => {
    const target = leads.find(l => l.id === leadId);
    if (!target) return null;

    addToast(`Analyzing "${target.businessName}" with AI engine...`, 'info', 2500);

    try {
      // 1. Generate technical business opportunity analysis
      const analysis = await generateAnalysisForLead(target);
      // 2. Generate channel-tailored outreach drafts
      const outreachDrafts = await generateOutreachForLead(target);

      const updates = {};
      if (analysis?.whyThisLeadMatters) updates.whyThisLeadMatters = analysis.whyThisLeadMatters;
      if (analysis?.businessOpportunity) {
        updates.businessOpportunity = analysis.businessOpportunity;
        updates.summary = analysis.businessOpportunity;
      }
      if (analysis?.nextBestAction) updates.nextBestAction = analysis.nextBestAction;
      if (analysis?.recommendedService) updates.recommendedService = analysis.recommendedService;
      if (analysis?.secondaryService) updates.secondaryService = analysis.secondaryService;
      if (analysis?.aiAnalysis) updates.aiAnalysis = analysis.aiAnalysis;
      if (outreachDrafts) updates.outreachDrafts = outreachDrafts;
      updates.lastEvaluatedAt = new Date().toISOString();

      let finalLead = {
        ...target,
        ...updates,
        metadata: {
          ...(target.metadata || {}),
          ...updates
        }
      };

      if (isSupabaseConfigured && isAuthorizedOperator && target.id) {
        try {
          const { data, error } = await updateLeadInDatabase(leadId, updates);
          if (error) {
            console.error('Failed to persist AI analysis to Supabase:', error);
            addToast(`Analysis generated, but database persistence failed: ${error.message}`, 'error', 4500);
          } else if (data) {
            finalLead = data;
          }
        } catch (dbErr) {
          console.error('Database update error for AI analysis:', dbErr);
          addToast(`Database error saving AI analysis: ${dbErr.message}`, 'error', 4500);
        }
      }

      setLeads(prev => prev.map(l => (l.id === leadId ? finalLead : l)));
      addToast(`AI Analysis completed for "${target.businessName}"!`, 'success');
      return { success: true, data: finalLead, analysis, outreachDrafts };
    } catch (err) {
      console.error('AI Analysis exception:', err);
      addToast(`AI Analysis error: ${err.message}`, 'error');
      return { success: false, error: err };
    }
  }, [leads, isSupabaseConfigured, isAuthorizedOperator, addToast]);

  // Batch recalculates deterministic AI qualification scores across all active leads
  const recalculateAllScores = useCallback(async () => {
    if (leads.length === 0) {
      addToast('No active leads to evaluate.', 'info');
      return { total: 0, scored: 0, persisted: 0, failed: 0 };
    }

    addToast(`Running autonomous evaluation engine across ${leads.length} records...`, 'info', 2500);
    setIsLoadingLeads(true);

    let scoredCount = 0;
    let persistedCount = 0;
    let failedPersistenceCount = 0;
    const persistenceErrors = [];
    const updatedLeads = [];

    try {
      for (const lead of leads) {
        const scored = enrichLeadWithScore(lead);
        let finalLead = scored;

        if (isSupabaseConfigured && isAuthorizedOperator && lead.id) {
          try {
            const delta = scoreLead(lead);
            const { data, error } = await updateLeadInDatabase(lead.id, delta);
            if (error) {
              failedPersistenceCount++;
              persistenceErrors.push({ id: lead.id, name: lead.businessName, error: error.message });
              console.warn(`Failed to persist score for lead ${lead.id}:`, error);
            } else if (data) {
              persistedCount++;
              finalLead = data;
            } else {
              persistedCount++;
            }
          } catch (persistErr) {
            failedPersistenceCount++;
            persistenceErrors.push({ id: lead.id, name: lead.businessName, error: persistErr.message });
            console.error(`Exception persisting score for lead ${lead.id}:`, persistErr);
          }
        }

        updatedLeads.push(finalLead);
        scoredCount++;
      }

      setLeads(updatedLeads);

      if (isSupabaseConfigured && isAuthorizedOperator) {
        if (failedPersistenceCount === 0) {
          addToast(`Evaluated and saved ${scoredCount} leads to Supabase!`, 'success');
        } else if (persistedCount > 0) {
          addToast(`Evaluated ${scoredCount} leads (${persistedCount} saved to Supabase, ${failedPersistenceCount} failed to persist)`, 'warning', 5000);
        } else {
          addToast(`Evaluated ${scoredCount} leads locally (${failedPersistenceCount} failed database persistence)`, 'error', 5000);
        }
      } else {
        addToast(`Evaluated ${scoredCount} leads!`, 'success');
      }

      return {
        total: leads.length,
        scored: scoredCount,
        persisted: persistedCount,
        failed: failedPersistenceCount,
        errors: persistenceErrors
      };
    } catch (err) {
      console.error('Scoring calculation exception:', err);
      if (updatedLeads.length > 0) {
        setLeads(prev => {
          const updatedMap = new Map(updatedLeads.map(l => [l.id, l]));
          return prev.map(l => updatedMap.get(l.id) || l);
        });
      }
      addToast(`Scoring error: ${err.message}`, 'error');
      return {
        total: leads.length,
        scored: scoredCount,
        persisted: persistedCount,
        failed: failedPersistenceCount,
        error: err,
        errors: persistenceErrors
      };
    } finally {
      setIsLoadingLeads(false);
    }
  }, [leads, isSupabaseConfigured, isAuthorizedOperator, addToast]);

  // Compute dynamic KPI metrics based on live lead state
  const metrics = useMemo(() => {
    const base = getKpiMetrics();
    const total = leads.length;
    const newL = leads.filter(l => l.status === "New").length;
    const hotL = leads.filter(l => l.scoreTier === "HOT").length;
    const contactedL = leads.filter(l => l.status === "Contacted" || l.status === "Follow-up").length;
    const convertedL = leads.filter(l => l.status === "Converted").length;

    return {
      ...base,
      totalLeads: { ...base.totalLeads, value: total.toLocaleString() },
      newLeads: { ...base.newLeads, value: newL.toLocaleString() },
      hotLeads: { ...base.hotLeads, value: hotL.toLocaleString() },
      contacted: { ...base.contacted, value: contactedL.toLocaleString() },
      converted: { ...base.converted, value: convertedL.toLocaleString() }
    };
  }, [leads]);

  return (
    <LeadContext.Provider value={{
      leads,
      discoveryList,
      outreachLogs,
      searchQuery,
      setSearchQuery,
      toasts,
      addToast,
      removeToast,
      currentUser,
      addLead,
      addFromDiscovery,
      updateLeadStatus,
      updateLead,
      deleteLead,
      recordOutreach,
      sendOutreachEmail,
      sendOutreachWhatsApp,
      metrics,
      // Supabase & Persistence State
      isSupabaseConfigured,
      isDatabaseConnected,
      isLoadingLeads,
      databaseError,
      refreshLeads,
      refreshOutreachLogs,
      seedSampleLeadsToDatabase,
      // Deterministic AI Scoring & Evaluation
      scoreLeadRecord,
      recalculateAllScores,
      analyzeLeadRecord
    }}>
      {children}
    </LeadContext.Provider>
  );
};

export const useLeads = () => {
  const context = useContext(LeadContext);
  if (!context) {
    throw new Error('useLeads must be used within a LeadProvider');
  }
  return context;
};

export default LeadContext;
