import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { mockLeads as initialLeads, getKpiMetrics } from '../data/mockLeads';
import { mockDiscoveredBusinesses as initialDiscovery } from '../data/mockDiscovery';
import { mockOutreachLogs as initialOutreach } from '../data/mockOutreach';
import { isSupabaseConfigured, supabaseConfigReason } from '../services/supabaseClient';
import {
  fetchLeadsFromDatabase,
  insertLeadToDatabase,
  updateLeadStatusInDatabase,
  updateLeadInDatabase,
  deleteLeadFromDatabase
} from '../services/leadService';
import { useAuth } from './AuthContext';

const LeadContext = createContext(null);

export const LeadProvider = ({ children }) => {
  const { user, isAuthenticated, isAuthorizedOperator } = useAuth();

  // Persistent leads state (starts empty; never silently populated with mock data)
  const [leads, setLeads] = useState([]);
  const [discoveryList, setDiscoveryList] = useState(initialDiscovery);
  const [outreachLogs, setOutreachLogs] = useState(initialOutreach);
  const [searchQuery, setSearchQuery] = useState('');
  const [toasts, setToasts] = useState([]);

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

  // Trigger lead fetching whenever operator authorization is active
  useEffect(() => {
    if (isAuthenticated && isAuthorizedOperator && isSupabaseConfigured) {
      refreshLeads();
    } else if (!isAuthenticated || !isAuthorizedOperator) {
      setLeads([]);
      setIsDatabaseConnected(false);
      setIsLoadingLeads(false);
      if (isAuthenticated && !isAuthorizedOperator) {
        setDatabaseError('Awaiting administrator operator approval to access lead records.');
      }
    }
  }, [isAuthenticated, isAuthorizedOperator, refreshLeads]);

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
    const rawAiScore = newLeadData.aiScore;
    const aiScore = (rawAiScore !== undefined && rawAiScore !== null && !isNaN(rawAiScore)) ? Number(rawAiScore) : (isReal ? null : 85);

    let scoreTier = "UNSCORED";
    if (aiScore !== null) {
      scoreTier = aiScore >= 88 ? "HOT" : aiScore >= 70 ? "HIGH" : "MEDIUM";
    }

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
      confidence: isReal ? "Pending AI Run" : "90%",
      qualificationLevel: isReal ? "Unqualified • Needs AI Scan" : "Qualified Lead",
      recommendedService: newLeadData.recommendedService || (isReal ? "Service Unassigned" : "Web Development"),
      summary: newLeadData.summary || (isReal ? `Discovered via OpenStreetMap POI. Real coordinates preserved.` : "Newly acquired business lead ready for qualification."),
      aiAnalysis: isReal ? {
        businessType: newLeadData.category || "Commercial Entity",
        websiteOpportunity: { level: newLeadData.website ? "MEDIUM" : "HIGH", note: newLeadData.website ? "Website modernization evaluation pending." : "No web presence detected on OSM." },
        digitalMarketingOpportunity: { level: "PENDING", note: "Pending regional competition scan." },
        uiUxOpportunity: { level: "PENDING", note: "Pending interface analysis." },
        aiOpportunity: { level: "PENDING", note: "Automated qualification pipeline not yet executed." },
        iotOpportunity: { level: "LOW", note: "Standard telemetry evaluation." }
      } : {
        businessType: newLeadData.category || "General Enterprise",
        websiteOpportunity: { level: "HIGH", note: "Modern web presence and conversion optimization potential." },
        digitalMarketingOpportunity: { level: "MEDIUM", note: "Targeted digital visibility and regional campaigns." },
        uiUxOpportunity: { level: "MEDIUM", note: "Customer interface enhancements." },
        aiOpportunity: { level: "HIGH", note: "Automated business workflow & intelligence." },
        iotOpportunity: { level: "LOW", note: "Standard telemetry evaluation." }
      },
      whyThisLeadMatters: isReal
        ? `Authentic spatial business entity located in ${newLeadData.location || 'regional cluster'}. Ready for initial outbound qualification.`
        : "High local search engagement with immediate opportunity for digital expansion.",
      businessOpportunity: isReal
        ? "Raw prospect mapped from OpenStreetMap. Pending qualification triage."
        : "Full service offering across web and digital transformation.",
      nextBestAction: isReal ? "Verify phone/email contact and run AI qualification scan." : "Initiate introductory outreach via WhatsApp or Email.",
      outreachDrafts: {
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

  // Record outreach action
  const recordOutreach = useCallback((lead, channel, messageSnippet) => {
    updateLeadStatus(lead.id, "Contacted");
    const newLog = {
      id: `out-${Date.now()}`,
      leadId: lead.id,
      businessName: lead.businessName,
      contactPerson: lead.contactPerson,
      channel,
      template: `${lead.recommendedService || 'Digital Modernization'} Outreach Draft`,
      status: "Delivered",
      sentAt: "Just now",
      openStatus: "Delivered",
      replyStatus: "Awaiting Response",
      service: lead.recommendedService,
      agent: currentUser.name
    };
    setOutreachLogs(prev => [newLog, ...prev]);
    addToast(`Outreach successfully dispatched via ${channel}!`, 'success');
  }, [currentUser.name, updateLeadStatus, addToast]);

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
      metrics,
      // Supabase & Persistence State
      isSupabaseConfigured,
      isDatabaseConnected,
      isLoadingLeads,
      databaseError,
      refreshLeads,
      seedSampleLeadsToDatabase
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
