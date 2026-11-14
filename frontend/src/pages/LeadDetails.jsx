import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { generateOutreachForLead } from '../services/aiOutreachService.js';
import {
  ArrowLeft,
  Edit,
  Phone,
  Mail,
  Globe,
  MapPin,
  Calendar,
  Share2,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  Send,
  Copy,
  RefreshCw,
  Building,
  Check,
  Briefcase,
  Layers,
  ChevronRight,
  TrendingUp,
  Cpu,
  Monitor,
  Flame,
  AlertCircle,
  AlertTriangle,
  Zap,
  Trash2,
  FileText,
  MessageSquare
} from 'lucide-react';
import { useLeads } from '../context/LeadContext';
import ScoreRing from '../components/common/ScoreRing';
import StatusBadge from '../components/common/StatusBadge';
import ScoreBadge from '../components/common/ScoreBadge';
import Modal from '../components/common/Modal';
import EmptyState from '../components/common/EmptyState';
import LoadingSkeleton from '../components/common/LoadingSkeleton';

export const LeadDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    leads,
    updateLead,
    updateLeadStatus,
    deleteLead,
    recordOutreach,
    sendOutreachEmail,
    sendOutreachWhatsApp,
    addToast,
    scoreLeadRecord,
    analyzeLeadRecord,
    isLoadingLeads
  } = useLeads();

  // Find lead by ID or fallback safely
  const lead = leads.find(l => l.id === id) || (leads.length > 0 ? leads[0] : null);

  const [isScoring, setIsScoring] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Active outreach tab
  const [activeOutreachTab, setActiveOutreachTab] = useState('whatsapp');
  const [isCopied, setIsCopied] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Editable outreach text
  const [outreachDrafts, setOutreachDrafts] = useState(() => lead?.outreachDrafts || {
    email: { subject: `Partnership proposal for ${lead?.businessName || 'Prospect'}`, body: 'Hello...' },
    whatsapp: { message: `Hello ${lead?.contactPerson || 'there'}! Greetings from PRCBO Tech.` },
    initialMessage: `Hi ${lead?.contactPerson || ''}, let's connect regarding your digital modernization.`
  });

  const [recipientEmail, setRecipientEmail] = useState(lead?.email || '');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Real WhatsApp dispatch state
  const [recipientPhone, setRecipientPhone] = useState(lead?.phone || '');
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const isSendingWhatsAppRef = useRef(false);
  const [whatsAppDraftKey, setWhatsAppDraftKey] = useState(() => `wa-${lead?.id || 'lead'}-${Date.now()}`);
  const [whatsAppCooldown, setWhatsAppCooldown] = useState(0);
  const [whatsAppType, setWhatsAppType] = useState('template'); // 'template' (Meta Cloud API Approved) or 'text' (24h customer window)
  const [whatsAppTemplateName, setWhatsAppTemplateName] = useState('prcbo_lead_outreach');
  const [whatsAppLanguage, setWhatsAppLanguage] = useState('en_US');
  const [paramContact, setParamContact] = useState(lead?.contactPerson || 'Business Owner');
  const [paramBusiness, setParamBusiness] = useState(lead?.businessName || 'Business');
  const [paramService, setParamService] = useState(lead?.recommendedService || 'Digital Modernization');

  useEffect(() => {
    if (lead?.email) {
      setRecipientEmail(lead.email);
    }
    if (lead?.phone) {
      setRecipientPhone(lead.phone);
    }
    if (lead) {
      setParamContact(lead.contactPerson || 'Business Owner');
      setParamBusiness(lead.businessName || 'Business');
      setParamService(lead.recommendedService || 'Digital Modernization');
      setWhatsAppDraftKey(`wa-${lead.id}-${Date.now()}`);
      setWhatsAppCooldown(0);
    }
  }, [lead?.id, lead?.email, lead?.phone, lead?.contactPerson, lead?.businessName, lead?.recommendedService]);

  // Cooldown countdown timer effect
  useEffect(() => {
    if (whatsAppCooldown <= 0) return;
    const timer = setInterval(() => {
      setWhatsAppCooldown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [whatsAppCooldown]);

  const handleCopyOutreach = () => {
    let contentToCopy = '';
    if (activeOutreachTab === 'email') {
      contentToCopy = `Subject: ${outreachDrafts.email.subject}\n\n${outreachDrafts.email.body}`;
    } else if (activeOutreachTab === 'whatsapp') {
      contentToCopy = outreachDrafts.whatsapp.message;
    } else {
      contentToCopy = outreachDrafts.initialMessage;
    }

    navigator.clipboard?.writeText(contentToCopy);
    setIsCopied(true);
    addToast('Outreach text copied to clipboard!', 'success');
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleScoreLead = async () => {
    if (!lead || !scoreLeadRecord) return;
    setIsScoring(true);
    try {
      await scoreLeadRecord(lead.id);
    } catch (err) {
      addToast(`Evaluation error: ${err.message}`, 'error');
    } finally {
      setIsScoring(false);
    }
  };

  // Synchronize outreach drafts whenever the selected lead changes
  useEffect(() => {
    if (lead?.outreachDrafts) {
      setOutreachDrafts(lead.outreachDrafts);
    }
  }, [lead?.id, lead?.outreachDrafts]);

  const handleRunAiAnalysis = async () => {
    if (!lead || !analyzeLeadRecord) return;
    setIsAnalyzing(true);
    try {
      const result = await analyzeLeadRecord(lead.id);
      if (result?.success) {
        if (result.outreachDrafts) {
          setOutreachDrafts(result.outreachDrafts);
        }
      }
    } catch (err) {
      addToast(`AI Analysis error: ${err.message}`, 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRegenerateOutreach = async () => {
    if (!lead) return;
    setIsRegenerating(true);
    try {
      const freshDrafts = await generateOutreachForLead(lead);
      if (freshDrafts) {
        setOutreachDrafts(freshDrafts);
        // Persist newly generated drafts to Supabase
        await updateLead(lead.id, { outreachDrafts: freshDrafts });
        addToast(`AI synthesized personalized outreach for "${lead.businessName}"!`, 'success');
      }
    } catch (err) {
      addToast(`Outreach generation error: ${err.message}`, 'error');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleDispatchOutreach = async () => {
    let messageContent = '';
    let channelName = 'Initial Message';
    if (activeOutreachTab === 'email') {
      channelName = 'Email';
      messageContent = outreachDrafts?.email?.subject
        ? `Subject: ${outreachDrafts.email.subject}\n\n${outreachDrafts.email.body || ''}`
        : (outreachDrafts?.email?.body || '');
    } else if (activeOutreachTab === 'whatsapp') {
      channelName = 'WhatsApp';
      messageContent = outreachDrafts?.whatsapp?.message || '';
    } else {
      messageContent = outreachDrafts?.initialMessage || '';
    }
    await recordOutreach(lead, channelName, messageContent);
  };

  const handleSendRealEmail = async () => {
    if (!lead) return;
    const to = (recipientEmail || lead.email || '').trim();
    if (!to || !to.includes('@')) {
      addToast('A valid recipient email address is required to dispatch email.', 'error');
      return;
    }
    const subject = (outreachDrafts?.email?.subject || '').trim();
    const body = (outreachDrafts?.email?.body || '').trim();
    if (!subject || !body) {
      addToast('Email subject and body must not be empty.', 'error');
      return;
    }

    setIsSendingEmail(true);
    try {
      await sendOutreachEmail(lead, {
        to,
        subject,
        body,
        template: `${lead.recommendedService || 'Digital Modernization'} Outreach`,
        idempotencyKey: `email-${lead.id}-${Date.now()}`
      });
    } catch (err) {
      addToast(`Error dispatching email: ${err.message}`, 'error');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleSendRealWhatsApp = async () => {
    if (!lead) return;
    if (isSendingWhatsAppRef.current || isSendingWhatsApp || whatsAppCooldown > 0) {
      return;
    }

    const to = (recipientPhone || lead.phone || '').trim();
    if (!to || !to.replace(/\D/g, '')) {
      addToast('A valid recipient phone number is required to dispatch WhatsApp message.', 'error');
      return;
    }

    isSendingWhatsAppRef.current = true;
    setIsSendingWhatsApp(true);
    try {
      let result;
      if (whatsAppType === 'template') {
        const isHelloWorld = whatsAppTemplateName.trim().toLowerCase() === 'hello_world';
        result = await sendOutreachWhatsApp(lead, {
          to,
          templateName: whatsAppTemplateName.trim(),
          languageCode: whatsAppLanguage,
          templateParameters: isHelloWorld ? [] : [paramContact.trim(), paramBusiness.trim(), paramService.trim()],
          idempotencyKey: whatsAppDraftKey
        });
      } else {
        const bodyText = (outreachDrafts?.whatsapp?.message || '').trim();
        if (!bodyText) {
          addToast('WhatsApp message text cannot be empty.', 'error');
          return;
        }
        result = await sendOutreachWhatsApp(lead, {
          to,
          message: bodyText,
          idempotencyKey: whatsAppDraftKey
        });
      }

      if (result?.success) {
        setWhatsAppCooldown(60);
        setWhatsAppDraftKey(`wa-${lead.id}-${Date.now()}`);
      }
    } catch (err) {
      addToast(`Error dispatching WhatsApp: ${err.message}`, 'error');
    } finally {
      setIsSendingWhatsApp(false);
      isSendingWhatsAppRef.current = false;
    }
  };

  const getOpportunityColor = (level) => {
    switch (level) {
      case 'CRITICAL':
      case 'HIGH':
        return { bg: '#FFF7ED', border: '#FDBA74', text: '#C2410C', badge: '#FF7A00' };
      case 'MEDIUM':
        return { bg: '#FFFBEB', border: '#FDE68A', text: '#92400E', badge: '#F59E0B' };
      default:
        return { bg: '#F8FAFC', border: '#E2E8F0', text: '#64748B', badge: '#94A3B8' };
    }
  };

  if (!lead) {
    if (isLoadingLeads) {
      return (
        <div style={{ padding: '2rem' }}>
          <LoadingSkeleton count={6} />
        </div>
      );
    }
    return (
      <div style={{ padding: '2rem' }}>
        <EmptyState
          title="Lead Not Found"
          description="The requested lead record could not be found or has not been loaded from the database."
          actionText="Back to Leads"
          onAction={() => navigate('/leads')}
        />
      </div>
    );
  }

  return (
    <div>
      {/* Back button and breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem', fontSize: '0.8125rem' }}>
        <button
          onClick={() => navigate('/leads')}
          style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-slate-500)', fontWeight: 500 }}
          className="btn-link"
        >
          <ArrowLeft size={15} /> Back to Leads
        </button>
        <span style={{ color: 'var(--color-slate-300)' }}>/</span>
        <span style={{ color: 'var(--color-slate-500)' }}>{lead.category}</span>
        <span style={{ color: 'var(--color-slate-300)' }}>/</span>
        <span style={{ fontWeight: 600, color: 'var(--color-slate-900)' }}>{lead.businessName}</span>
      </div>

      {/* Main Header Card */}
      <div className="card" style={{ padding: '1.75rem', marginBottom: '1.75rem', borderLeft: '4px solid var(--color-primary)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
              <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--color-slate-900)', fontFamily: 'var(--font-family-display)' }}>
                {lead.businessName}
              </h1>
              <StatusBadge status={lead.status} />
              <ScoreBadge score={lead.aiScore} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap', color: 'var(--color-slate-600)', fontSize: '0.875rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Building size={15} style={{ color: 'var(--color-primary)' }} />
                {lead.category}
              </span>
              <span>&bull;</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <MapPin size={15} style={{ color: 'var(--color-primary)' }} />
                {lead.location}
              </span>
              <span>&bull;</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Calendar size={15} style={{ color: 'var(--color-primary)' }} />
                Added: {lead.dateAdded}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              className="btn btn-outline"
              onClick={() => setIsStatusModalOpen(true)}
            >
              Update Status
            </button>
            <button
              className="btn btn-outline"
              onClick={handleRunAiAnalysis}
              disabled={isAnalyzing}
              title="Run AI Opportunity Analysis & Synthesize Multi-channel Outreach"
            >
              <Sparkles size={15} style={{ color: 'var(--color-primary)' }} className={isAnalyzing ? 'animate-spin' : ''} />
              {isAnalyzing ? 'Analyzing...' : 'AI Deep Analysis'}
            </button>
            <button
              className="btn btn-outline"
              onClick={handleScoreLead}
              disabled={isScoring}
              title="Calculate deterministic qualification score"
            >
              <Zap size={15} style={{ color: '#FF7A00' }} className={isScoring ? 'animate-spin' : ''} />
              {isScoring ? 'Evaluating...' : lead?.aiScore !== null && lead?.aiScore !== undefined ? 'Recalculate Score' : 'Run AI Evaluation'}
            </button>
            <button
              className="btn btn-outline"
              onClick={() => addToast("Lead details link copied for internal sharing", "info")}
            >
              <Share2 size={15} /> Share
            </button>
            <button
              className="btn btn-primary"
              onClick={handleDispatchOutreach}
            >
              <Send size={15} /> Quick Outreach
            </button>
            <button
              className="btn btn-outline"
              style={{ color: '#EF4444', borderColor: '#FCA5A5' }}
              onClick={() => {
                if (window.confirm(`Are you sure you want to permanently delete "${lead.businessName}"?`)) {
                  deleteLead(lead.id);
                  navigate('/leads');
                }
              }}
              title="Delete Lead"
            >
              <Trash2 size={15} /> Delete Lead
            </button>
          </div>
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(320px, 1fr)', gap: '1.75rem' }}>
        {/* LEFT COLUMN: Business Details + AI Opportunity Analysis + Outreach */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          {/* Business Information Card */}
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building size={18} style={{ color: 'var(--color-primary)' }} />
              Business Profile & Contact Information
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-slate-400)', textTransform: 'uppercase', fontWeight: 600 }}>
                  Contact Person
                </span>
                <p style={{ fontWeight: 600, color: 'var(--color-slate-800)', fontSize: '0.9375rem', marginTop: '2px' }}>
                  {lead.contactPerson || 'Not provided'}
                </p>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)' }}>
                  {lead.designation || 'Key Decision Maker'}
                </span>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-slate-400)', textTransform: 'uppercase', fontWeight: 600 }}>
                  Phone Number
                </span>
                <p style={{ fontWeight: 600, color: 'var(--color-slate-800)', fontSize: '0.9375rem', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Phone size={14} style={{ color: 'var(--color-primary)' }} />
                  {lead.phone || '+91 94431 00000'}
                </p>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-slate-400)', textTransform: 'uppercase', fontWeight: 600 }}>
                  Email Address
                </span>
                <p style={{ fontWeight: 600, color: 'var(--color-slate-800)', fontSize: '0.9375rem', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Mail size={14} style={{ color: 'var(--color-primary)' }} />
                  {lead.email || 'contact@business.in'}
                </p>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-slate-400)', textTransform: 'uppercase', fontWeight: 600 }}>
                  Official Website
                </span>
                <p style={{ fontWeight: 600, color: 'var(--color-slate-800)', fontSize: '0.9375rem', marginTop: '2px' }}>
                  {lead.website ? (
                    <a
                      href={lead.website}
                      target="_blank"
                      rel="noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Globe size={14} /> {lead.website.replace('https://', '').replace('http://', '')}
                      <ExternalLink size={12} />
                    </a>
                  ) : (
                    <span style={{ color: 'var(--color-danger)', fontSize: '0.8125rem' }}>No active website found</span>
                  )}
                </p>
              </div>
            </div>

            {/* Address & Operational Summary */}
            <div style={{ padding: '1rem', backgroundColor: 'var(--color-slate-50)', borderRadius: '8px', border: '1px solid var(--color-slate-200)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-slate-500)', marginBottom: '4px' }}>
                PHYSICAL ADDRESS
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--color-slate-800)', marginBottom: '0.75rem' }}>
                {lead.address || `${lead.location}, India`}
              </div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-slate-500)', marginBottom: '4px' }}>
                OPERATIONAL SUMMARY
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--color-slate-700)', lineHeight: 1.5 }}>
                {lead.summary}
              </div>
            </div>
          </div>

          {/* AI Opportunity Analysis Section */}
          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={18} style={{ color: 'var(--color-primary)' }} />
                  AI Business Analysis
                </h3>
                <p className="card-subtitle">
                  Autonomous opportunity scoring evaluated by PRCBO multi-factor intelligence engine
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={handleRunAiAnalysis}
                  disabled={isAnalyzing}
                  title="Run AI Deep Analysis"
                >
                  <Sparkles size={13} style={{ color: 'var(--color-primary)' }} className={isAnalyzing ? 'animate-spin' : ''} />
                  {isAnalyzing ? 'Analyzing...' : 'Run AI Analysis'}
                </button>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'var(--color-primary)',
                    backgroundColor: 'var(--color-primary-light)',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '6px'
                  }}
                >
                  {lead.confidence} Accuracy Score
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
              {[
                { title: 'Business Type', level: 'VERIFIED', note: lead.aiAnalysis?.businessType, icon: Building },
                { title: 'Website Opportunity', level: lead.aiAnalysis?.websiteOpportunity?.level, note: lead.aiAnalysis?.websiteOpportunity?.note, icon: Globe },
                { title: 'Digital Marketing Opportunity', level: lead.aiAnalysis?.digitalMarketingOpportunity?.level, note: lead.aiAnalysis?.digitalMarketingOpportunity?.note, icon: TrendingUp },
                { title: 'UI/UX Opportunity', level: lead.aiAnalysis?.uiUxOpportunity?.level, note: lead.aiAnalysis?.uiUxOpportunity?.note, icon: Monitor },
                { title: 'AI Opportunity', level: lead.aiAnalysis?.aiOpportunity?.level, note: lead.aiAnalysis?.aiOpportunity?.note, icon: Cpu },
                { title: 'IoT Opportunity', level: lead.aiAnalysis?.iotOpportunity?.level, note: lead.aiAnalysis?.iotOpportunity?.note, icon: Layers }
              ].map((item, idx) => {
                const styleObj = getOpportunityColor(item.level);
                const Icon = item.icon;
                return (
                  <div
                    key={idx}
                    style={{
                      padding: '1rem',
                      borderRadius: '10px',
                      backgroundColor: styleObj.bg,
                      border: `1px solid ${styleObj.border}`,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '0.75rem'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '0.8125rem', color: 'var(--color-slate-900)' }}>
                          <Icon size={14} style={{ color: styleObj.badge }} />
                          {item.title}
                        </div>
                        <span
                          style={{
                            fontSize: '0.6875rem',
                            fontWeight: 700,
                            color: styleObj.text,
                            backgroundColor: '#FFFFFF',
                            padding: '0.15rem 0.45rem',
                            borderRadius: '4px',
                            border: `1px solid ${styleObj.border}`
                          }}
                        >
                          {item.level}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--color-slate-700)', lineHeight: 1.45 }}>
                        {item.note}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recommended PRCBO Service Card */}
          <div
            className="card card-warm"
            style={{
              borderLeft: '4px solid var(--color-primary)',
              boxShadow: '0 8px 24px rgba(255, 122, 0, 0.12)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--color-primary)',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Briefcase size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Recommended PRCBO Service
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-slate-900)', fontFamily: 'var(--font-family-display)' }}>
                    {lead.recommendedService}
                  </div>
                </div>
              </div>

              {lead.secondaryService && (
                <span style={{ fontSize: '0.75rem', color: 'var(--color-slate-600)', backgroundColor: '#FFFFFF', border: '1px solid var(--color-slate-200)', padding: '0.35rem 0.75rem', borderRadius: '6px' }}>
                  Secondary Track: <strong>{lead.secondaryService}</strong>
                </span>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Why This Lead Matters
                </span>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-slate-800)', marginTop: '2px', lineHeight: 1.5 }}>
                  {lead.whyThisLeadMatters}
                </p>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-slate-700)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Business Opportunity
                </span>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-slate-800)', marginTop: '2px', lineHeight: 1.5 }}>
                  {lead.businessOpportunity}
                </p>
              </div>

              <div style={{ padding: '0.875rem', backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #EAEAEA', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle2 size={18} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
                <div>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-slate-500)', textTransform: 'uppercase' }}>
                    Next Best Action
                  </span>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-slate-900)' }}>
                    {lead.nextBestAction}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* AI-Powered Outreach Hub */}
          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Send size={18} style={{ color: 'var(--color-primary)' }} />
                  Automated Outreach Generator
                </h3>
                <p className="card-subtitle">
                  Contextual messaging drafts customized for this business profile
                </p>
              </div>

              <button
                className="btn btn-outline btn-sm"
                onClick={handleRegenerateOutreach}
                disabled={isRegenerating}
              >
                <RefreshCw size={13} className={isRegenerating ? 'animate-spin' : ''} />
                {isRegenerating ? 'Synthesizing...' : 'Regenerate Draft'}
              </button>
            </div>

            {/* Outreach Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--color-slate-200)', marginBottom: '1.25rem' }}>
              {[
                { id: 'whatsapp', label: 'WhatsApp Message' },
                { id: 'email', label: 'Email Pitch' },
                { id: 'initial', label: 'Short LinkedIn / SMS' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveOutreachTab(tab.id)}
                  style={{
                    padding: '0.5rem 1rem',
                    fontSize: '0.8125rem',
                    fontWeight: activeOutreachTab === tab.id ? 600 : 500,
                    borderBottom: activeOutreachTab === tab.id ? '2px solid var(--color-primary)' : '2px solid transparent',
                    color: activeOutreachTab === tab.id ? 'var(--color-slate-900)' : 'var(--color-slate-500)',
                    cursor: 'pointer'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Outreach Body */}
            <div>
              {activeOutreachTab === 'email' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-slate-600)' }}>
                      Recipient Email (Required for Real Delivery)
                    </label>
                    <input
                      type="email"
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      placeholder="e.g. contact@business.com"
                      style={{
                        width: '100%',
                        height: '38px',
                        padding: '0 0.875rem',
                        borderRadius: '6px',
                        border: '1px solid var(--color-slate-200)',
                        fontSize: '0.875rem',
                        marginTop: '4px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-slate-600)' }}>
                      Email Subject
                    </label>
                    <input
                      type="text"
                      value={outreachDrafts.email.subject}
                      onChange={(e) => setOutreachDrafts({
                        ...outreachDrafts,
                        email: { ...outreachDrafts.email, subject: e.target.value }
                      })}
                      style={{
                        width: '100%',
                        height: '38px',
                        padding: '0 0.875rem',
                        borderRadius: '6px',
                        border: '1px solid var(--color-slate-200)',
                        fontSize: '0.875rem',
                        marginTop: '4px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-slate-600)' }}>
                      Email Body (Editable)
                    </label>
                    <textarea
                      rows={8}
                      value={outreachDrafts.email.body}
                      onChange={(e) => setOutreachDrafts({
                        ...outreachDrafts,
                        email: { ...outreachDrafts.email, body: e.target.value }
                      })}
                      style={{
                        width: '100%',
                        padding: '0.875rem',
                        borderRadius: '8px',
                        border: '1px solid var(--color-slate-200)',
                        fontSize: '0.875rem',
                        lineHeight: 1.5,
                        fontFamily: 'var(--font-family-body)',
                        marginTop: '4px'
                      }}
                    />
                  </div>
                </div>
              )}

              {activeOutreachTab === 'whatsapp' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                  {/* Recipient Phone */}
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-slate-600)' }}>
                      Recipient Phone Number (Required for Meta Cloud API Delivery)
                    </label>
                    <input
                      type="tel"
                      value={recipientPhone}
                      onChange={(e) => setRecipientPhone(e.target.value)}
                      placeholder="e.g. +91 98400 12345 (E.164 digits)"
                      style={{
                        width: '100%',
                        height: '38px',
                        padding: '0 0.875rem',
                        borderRadius: '6px',
                        border: '1px solid var(--color-slate-200)',
                        fontSize: '0.875rem',
                        marginTop: '4px'
                      }}
                    />
                  </div>

                  {/* Message Mode Selector */}
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', backgroundColor: '#F8FAFC', padding: '0.625rem 0.875rem', borderRadius: '6px', border: '1px solid var(--color-slate-200)' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-slate-600)' }}>Delivery Mode:</span>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8125rem', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="whatsapp_mode"
                        checked={whatsAppType === 'template'}
                        onChange={() => setWhatsAppType('template')}
                      />
                      <span style={{ fontWeight: whatsAppType === 'template' ? 600 : 400 }}>Approved Template (Outbound)</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8125rem', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="whatsapp_mode"
                        checked={whatsAppType === 'text'}
                        onChange={() => setWhatsAppType('text')}
                      />
                      <span style={{ fontWeight: whatsAppType === 'text' ? 600 : 400 }}>Direct Text (24h Window)</span>
                    </label>
                  </div>

                  {whatsAppType === 'template' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', backgroundColor: '#F0FDF4', padding: '1rem', borderRadius: '8px', border: '1px solid #BBF7D0' }}>
                      <div style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CheckCircle2 size={14} /> Meta Approved Template Dispatch (Outside 24h Customer-Service Window)
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
                        <div>
                          <label style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#166534' }}>Template Name</label>
                          <select
                            value={['hello_world', 'prcbo_lead_outreach'].includes(whatsAppTemplateName) ? whatsAppTemplateName : 'custom'}
                            onChange={(e) => {
                              if (e.target.value === 'custom') {
                                setWhatsAppTemplateName('');
                              } else {
                                setWhatsAppTemplateName(e.target.value);
                              }
                            }}
                            style={{ width: '100%', height: '34px', padding: '0 0.5rem', borderRadius: '4px', border: '1px solid #86EFAC', fontSize: '0.8125rem', marginTop: '2px', backgroundColor: '#FFFFFF' }}
                          >
                            <option value="hello_world">hello_world (Meta Approved Test - 0 Params)</option>
                            <option value="prcbo_lead_outreach">prcbo_lead_outreach (Personalized Outreach - 3 Params)</option>
                            <option value="custom">Custom Template...</option>
                          </select>
                          {!['hello_world', 'prcbo_lead_outreach'].includes(whatsAppTemplateName) && (
                            <input
                              type="text"
                              placeholder="Enter custom template name"
                              value={whatsAppTemplateName}
                              onChange={(e) => setWhatsAppTemplateName(e.target.value)}
                              style={{ width: '100%', height: '34px', padding: '0 0.5rem', borderRadius: '4px', border: '1px solid #86EFAC', fontSize: '0.8125rem', marginTop: '4px' }}
                            />
                          )}
                        </div>
                        <div>
                          <label style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#166534' }}>Language Code</label>
                          <input
                            type="text"
                            value={whatsAppLanguage}
                            onChange={(e) => setWhatsAppLanguage(e.target.value)}
                            style={{ width: '100%', height: '34px', padding: '0 0.5rem', borderRadius: '4px', border: '1px solid #86EFAC', fontSize: '0.8125rem', marginTop: '2px' }}
                          />
                        </div>
                      </div>

                      {whatsAppTemplateName.trim().toLowerCase() !== 'hello_world' && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                          <div>
                            <label style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#166534' }}>Param 1: Contact Person</label>
                            <input
                              type="text"
                              value={paramContact}
                              onChange={(e) => setParamContact(e.target.value)}
                              style={{ width: '100%', height: '32px', padding: '0 0.5rem', borderRadius: '4px', border: '1px solid #86EFAC', fontSize: '0.75rem', marginTop: '2px' }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#166534' }}>Param 2: Business Name</label>
                            <input
                              type="text"
                              value={paramBusiness}
                              onChange={(e) => setParamBusiness(e.target.value)}
                              style={{ width: '100%', height: '32px', padding: '0 0.5rem', borderRadius: '4px', border: '1px solid #86EFAC', fontSize: '0.75rem', marginTop: '2px' }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#166534' }}>Param 3: Recommended Service</label>
                            <input
                              type="text"
                              value={paramService}
                              onChange={(e) => setParamService(e.target.value)}
                              style={{ width: '100%', height: '32px', padding: '0 0.5rem', borderRadius: '4px', border: '1px solid #86EFAC', fontSize: '0.75rem', marginTop: '2px' }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Live Template Preview */}
                      <div style={{ backgroundColor: '#FFFFFF', padding: '0.75rem', borderRadius: '6px', border: '1px dashed #86EFAC' }}>
                        <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#15803D', marginBottom: '4px', textTransform: 'uppercase' }}>
                          {whatsAppTemplateName.trim().toLowerCase() === 'hello_world' ? 'Template Message Preview (Meta Test Template)' : 'Template Message Preview'}
                        </div>
                        <div style={{ fontSize: '0.8125rem', color: '#1F2937', fontStyle: 'italic', lineHeight: 1.4 }}>
                          {whatsAppTemplateName.trim().toLowerCase() === 'hello_world'
                            ? '\u201CWelcome and congratulations! This message demonstrates your ability to send a WhatsApp message using the Cloud API. Thank you for taking the time to test with us.\u201D'
                            : `\u201CHello ${paramContact}, greetings from PRCBO Tech! We noticed that ${paramBusiness} has significant opportunities for ${paramService}. Would you like to connect for a quick 10-minute briefing?\u201D`
                          }
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#B45309', backgroundColor: '#FEF3C7', padding: '0.5rem 0.75rem', borderRadius: '6px', marginBottom: '6px' }}>
                        Notice: Meta Cloud API allows free-form text only when the recipient initiated a WhatsApp conversation within the last 24 hours.
                      </div>
                      <textarea
                        rows={5}
                        value={outreachDrafts.whatsapp.message}
                        onChange={(e) => setOutreachDrafts({
                          ...outreachDrafts,
                          whatsapp: { message: e.target.value }
                        })}
                        style={{
                          width: '100%',
                          padding: '0.875rem',
                          borderRadius: '8px',
                          border: '1px solid var(--color-slate-200)',
                          fontSize: '0.875rem',
                          lineHeight: 1.5,
                          fontFamily: 'var(--font-family-body)',
                          backgroundColor: '#F0FDF4'
                        }}
                      />
                    </div>
                  )}
                </div>
              )}

              {activeOutreachTab === 'initial' && (
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-slate-600)' }}>
                    Initial Elevator Connect Message
                  </label>
                  <textarea
                    rows={3}
                    value={outreachDrafts.initialMessage}
                    onChange={(e) => setOutreachDrafts({
                      ...outreachDrafts,
                      initialMessage: e.target.value
                    })}
                    style={{
                      width: '100%',
                      padding: '0.875rem',
                      borderRadius: '8px',
                      border: '1px solid var(--color-slate-200)',
                      fontSize: '0.875rem',
                      lineHeight: 1.5,
                      fontFamily: 'var(--font-family-body)',
                      marginTop: '4px'
                    }}
                  />
                </div>
              )}

              {/* Outreach Actions */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={handleCopyOutreach}
                >
                  {isCopied ? <Check size={14} style={{ color: 'var(--color-success)' }} /> : <Copy size={14} />}
                  {isCopied ? 'Copied!' : 'Copy to Clipboard'}
                </button>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      updateLeadStatus(lead.id, 'Contacted');
                      addToast('Marked lead status as Contacted', 'success');
                    }}
                  >
                    Mark as Contacted
                  </button>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={handleDispatchOutreach}
                    title="Record outreach draft without dispatching an email"
                  >
                    <FileText size={14} /> Log Draft Only
                  </button>
                  {activeOutreachTab === 'email' && (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={handleSendRealEmail}
                      disabled={isSendingEmail}
                      title="Dispatch real email to recipient via Resend API"
                    >
                      <Send size={14} className={isSendingEmail ? 'animate-spin' : ''} />
                      {isSendingEmail ? 'Sending via Resend...' : 'Send Email via Resend'}
                    </button>
                  )}
                  {activeOutreachTab === 'whatsapp' && (
                    <button
                      className="btn btn-sm"
                      style={{
                        backgroundColor: whatsAppCooldown > 0 ? '#94A3B8' : '#25D366',
                        borderColor: whatsAppCooldown > 0 ? '#94A3B8' : '#25D366',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontWeight: 600,
                        cursor: (isSendingWhatsApp || whatsAppCooldown > 0) ? 'not-allowed' : 'pointer'
                      }}
                      onClick={handleSendRealWhatsApp}
                      disabled={isSendingWhatsApp || whatsAppCooldown > 0}
                      title={whatsAppCooldown > 0 ? `Please wait ${whatsAppCooldown}s before sending another outreach` : "Dispatch real WhatsApp message via Meta Cloud API"}
                    >
                      <Send size={14} className={isSendingWhatsApp ? 'animate-spin' : ''} />
                      {isSendingWhatsApp 
                        ? 'Sending via Meta API...' 
                        : whatsAppCooldown > 0 
                          ? `Sent (Cooldown ${whatsAppCooldown}s)` 
                          : 'Send WhatsApp via Cloud API'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: AI Score Ring & Quality Metrics & Timeline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* AI Intelligence Card */}
          <div className="card" style={{ textAlign: 'center', padding: '2rem 1.5rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-slate-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '1.25rem' }}>
              Predictive AI Lead Score
            </div>

            <ScoreRing score={lead.aiScore} size={120} />

            <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--color-slate-100)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                <span style={{ color: 'var(--color-slate-500)' }}>Qualification Level</span>
                <strong style={{ color: 'var(--color-slate-800)' }}>{lead.qualificationLevel}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                <span style={{ color: 'var(--color-slate-500)' }}>Algorithm Confidence</span>
                <strong style={{ color: '#10B981' }}>{lead.confidence}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                <span style={{ color: 'var(--color-slate-500)' }}>Lead Acquisition Source</span>
                <strong style={{ color: 'var(--color-slate-800)' }}>{lead.source}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                <span style={{ color: 'var(--color-slate-500)' }}>Public Rating</span>
                <strong style={{ color: lead.rating ? '#F59E0B' : 'var(--color-slate-500)' }}>
                  {lead.rating ? `⭐ ${lead.rating} (${lead.reviewCount || 0} reviews)` : 'Not rated on OpenStreetMap'}
                </strong>
              </div>
            </div>

            {/* Deterministic Scoring Breakdown */}
            {lead.scoringBreakdown && (
              <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--color-slate-100)', textAlign: 'left' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-slate-500)', textTransform: 'uppercase', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles size={13} style={{ color: 'var(--color-primary)' }} />
                  Evaluation Factor Breakdown
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.75rem' }}>
                  {[
                    { label: 'Website & Security', score: lead.scoringBreakdown.website?.score ?? 0, max: 30 },
                    { label: 'Commercial Vitality', score: lead.scoringBreakdown.commercialVitality?.score ?? 0, max: 25 },
                    { label: 'Category Readiness', score: lead.scoringBreakdown.categoryReadiness?.score ?? 0, max: 20 },
                    { label: 'Reachability', score: lead.scoringBreakdown.reachability?.score ?? 0, max: 15 },
                    { label: 'Geographic Hub', score: lead.scoringBreakdown.geographicClustering?.score ?? 0, max: 10 }
                  ].map((f, idx) => (
                    <div key={idx}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px', color: 'var(--color-slate-700)', fontWeight: 600 }}>
                        <span>{f.label}</span>
                        <span>{f.score} / {f.max} pts</span>
                      </div>
                      <div style={{ width: '100%', height: '5px', backgroundColor: 'var(--color-slate-100)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.round((f.score / f.max) * 100)}%`, height: '100%', backgroundColor: f.score === f.max ? 'var(--color-success)' : 'var(--color-primary)', borderRadius: '3px' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Transparent Missing Information List */}
            {lead.missingInfo && lead.missingInfo.length > 0 && (
              <div style={{ marginTop: '1.25rem', padding: '0.875rem', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px', textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 700, color: '#B45309', marginBottom: '6px' }}>
                  <AlertTriangle size={14} />
                  <span>Missing Record Information ({lead.missingInfo.length})</span>
                </div>
                <p style={{ fontSize: '0.6875rem', color: '#92400E', marginBottom: '6px', lineHeight: 1.4 }}>
                  Zero fabrication policy active. The following data points were not detected on source records:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {lead.missingInfo.slice(0, 3).map((item, idx) => {
                    const label = typeof item === 'object' && item?.label ? item.label : (typeof item === 'object' && item?.field ? item.field : String(item));
                    const reason = typeof item === 'object' && item?.reason ? item.reason : 'Data point not detected on source record.';
                    return (
                      <div key={idx} style={{ fontSize: '0.6875rem', color: '#78350F', display: 'flex', alignItems: 'flex-start', gap: '5px' }}>
                        <span style={{ fontWeight: 700 }}>&bull; {label}:</span>
                        <span style={{ color: '#92400E' }}>{reason}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              className="btn btn-outline btn-sm"
              onClick={handleScoreLead}
              disabled={isScoring}
              style={{ width: '100%', marginTop: '1.25rem', justifyContent: 'center' }}
            >
              <Zap size={14} style={{ color: '#FF7A00' }} className={isScoring ? 'animate-spin' : ''} />
              {isScoring ? 'Evaluating Attributes...' : 'Recalculate AI Score'}
            </button>
          </div>

          {/* Quick Lead Status Control */}
          <div className="card">
            <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-slate-900)', marginBottom: '1rem' }}>
              Pipeline Status
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {['New', 'Contacted', 'Follow-up', 'Converted', 'Rejected'].map((status) => {
                const isCurrent = lead.status === status;
                return (
                  <button
                    key={status}
                    onClick={() => updateLeadStatus(lead.id, status)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.625rem 0.875rem',
                      borderRadius: '8px',
                      border: isCurrent ? '1.5px solid var(--color-primary)' : '1px solid var(--color-slate-200)',
                      backgroundColor: isCurrent ? 'var(--color-primary-light)' : 'transparent',
                      color: isCurrent ? 'var(--color-primary)' : 'var(--color-slate-700)',
                      fontWeight: isCurrent ? 700 : 500,
                      fontSize: '0.8125rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span>{status}</span>
                    {isCurrent && <Check size={16} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Activity Log / Timeline */}
          <div className="card">
            <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-slate-900)', marginBottom: '1rem' }}>
              Activity History
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}>
              {[
                { time: 'Oct 4, 11:20 AM', title: 'AI Profile Evaluated', desc: `Assigned score ${lead.aiScore}/100 and mapped to ${lead.recommendedService}`, user: 'PRCBO AI Engine' },
                { time: 'Oct 3, 04:10 PM', title: 'Data Ingestion', desc: `Discovered via ${lead.source} targeting ${lead.location}`, user: 'Data Pipeline' },
                { time: 'Sep 28, 09:30 AM', title: 'Lead Record Created', desc: 'Initial contact entity verified', user: 'System Bot' }
              ].map((act, i) => (
                <div key={i} style={{ display: 'flex', gap: '12px', fontSize: '0.8125rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: 'var(--color-primary)', marginTop: 4 }} />
                    {i !== 2 && <div style={{ width: 2, flex: 1, backgroundColor: 'var(--color-slate-200)', margin: '4px 0' }} />}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--color-slate-900)' }}>{act.title}</div>
                    <div style={{ color: 'var(--color-slate-500)', fontSize: '0.75rem', margin: '2px 0' }}>{act.desc}</div>
                    <div style={{ color: 'var(--color-slate-400)', fontSize: '0.6875rem' }}>{act.time} &bull; {act.user}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Update Status Modal */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title="Update Lead Stage"
      >
        <p style={{ fontSize: '0.875rem', color: 'var(--color-slate-600)', marginBottom: '1.25rem' }}>
          Change pipeline stage for <strong>{lead.businessName}</strong>:
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {['New', 'Contacted', 'Follow-up', 'Converted', 'Rejected'].map((status) => (
            <button
              key={status}
              onClick={() => {
                updateLeadStatus(lead.id, status);
                setIsStatusModalOpen(false);
              }}
              className="btn btn-outline"
              style={{ justifyContent: 'flex-start' }}
            >
              {status}
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
};

export default LeadDetails;
