import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Send,
  Mail,
  MessageSquare,
  CheckCircle2,
  Clock,
  ExternalLink,
  Plus,
  Filter,
  Eye,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  XCircle,
  FileText,
  AlertCircle,
  CheckCheck
} from 'lucide-react';
import { useLeads } from '../context/LeadContext';
import StatCard from '../components/common/StatCard';

export const Outreach = () => {
  const navigate = useNavigate();
  const { outreachLogs, leads, addToast, refreshOutreachLogs } = useLeads();
  const [activeTab, setActiveTab] = useState('all');

  // Compute live analytics derived strictly from actual outreach_logs records
  const analytics = useMemo(() => {
    const total = outreachLogs.length;
    const sent = outreachLogs.filter(o => o.status === 'Sent' || o.status === 'Dispatched').length;
    const delivered = outreachLogs.filter(o => o.status === 'Delivered').length;
    const read = outreachLogs.filter(o => o.status === 'Read').length;
    const bounced = outreachLogs.filter(o => o.status === 'Bounced').length;
    const complained = outreachLogs.filter(o => o.status === 'Complained').length;
    const failed = outreachLogs.filter(o => o.status === 'Failed').length;
    const opened = outreachLogs.filter(o => o.status === 'Opened' || o.openStatus?.toLowerCase().includes('opened')).length;
    const replied = outreachLogs.filter(o => o.status === 'Replied' || o.replyStatus?.toLowerCase().includes('replied') || o.replyStatus?.toLowerCase().includes('demo') || o.replyStatus?.toLowerCase().includes('scheduled')).length;
    const drafts = outreachLogs.filter(o => o.status === 'Logged' || o.status === 'Drafted' || o.status === 'Pending').length;

    // Delivery rate calculation: confirmed delivered or read vs total attempted dispatches
    const confirmedDelivered = delivered + read;
    const attemptedDispatches = confirmedDelivered + sent + bounced + failed + complained;
    const deliveryRate = attemptedDispatches > 0
      ? Math.round((confirmedDelivered / attemptedDispatches) * 100)
      : (confirmedDelivered > 0 ? 100 : 0);

    return {
      total,
      sent,
      delivered,
      read,
      confirmedDelivered,
      bounced,
      complained,
      failed,
      opened,
      replied,
      drafts,
      attemptedDispatches,
      deliveryRate
    };
  }, [outreachLogs]);

  const filteredLogs = outreachLogs.filter(log => {
    if (activeTab === 'delivered') return log.status === 'Delivered' || log.status === 'Read';
    if (activeTab === 'read') return log.status === 'Read';
    if (activeTab === 'sent') return log.status === 'Sent' || log.status === 'Dispatched';
    if (activeTab === 'bounced') return log.status === 'Bounced' || log.status === 'Failed' || log.status === 'Complained';
    if (activeTab === 'email') return log.channel === 'Email';
    if (activeTab === 'whatsapp') return log.channel === 'WhatsApp';
    if (activeTab === 'pending') return log.status === 'Pending' || log.status === 'Drafted' || log.status === 'Logged';
    if (activeTab === 'completed') return log.status === 'Completed' || log.status === 'Replied';
    return true;
  });

  const renderDeliveryBadge = (status, errorMessage) => {
    switch (status) {
      case 'Read':
        return (
          <span
            title="Read by prospect (Verified WhatsApp double blue ticks)"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '0.2rem 0.6rem',
              borderRadius: '9999px',
              backgroundColor: '#E0F2FE',
              color: '#0284C7'
            }}
          >
            <CheckCheck size={12} /> Read (Blue Ticks)
          </span>
        );
      case 'Delivered':
        return (
          <span
            title="Confirmed delivered by recipient server/device"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '0.2rem 0.6rem',
              borderRadius: '9999px',
              backgroundColor: '#DCFCE7',
              color: '#15803D'
            }}
          >
            <CheckCircle2 size={12} /> Delivered
          </span>
        );
      case 'Sent':
      case 'Dispatched':
        return (
          <span
            title="Accepted by provider (Resend). Awaiting recipient delivery confirmation webhook"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '0.2rem 0.6rem',
              borderRadius: '9999px',
              backgroundColor: '#EFF6FF',
              color: '#1D4ED8'
            }}
          >
            <Clock size={12} /> Sent (In-Transit)
          </span>
        );
      case 'Bounced':
        return (
          <span
            title={errorMessage || 'Mail server permanently rejected recipient address'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '0.2rem 0.6rem',
              borderRadius: '9999px',
              backgroundColor: '#FEE2E2',
              color: '#B91C1C'
            }}
          >
            <AlertTriangle size={12} /> Bounced
          </span>
        );
      case 'Complained':
        return (
          <span
            title="Recipient registered spam/abuse complaint"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '0.2rem 0.6rem',
              borderRadius: '9999px',
              backgroundColor: '#FEF2F2',
              color: '#991B1B'
            }}
          >
            <AlertCircle size={12} /> Spam Complaint
          </span>
        );
      case 'Failed':
        return (
          <span
            title={errorMessage || 'Provider rejected email dispatch'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '0.2rem 0.6rem',
              borderRadius: '9999px',
              backgroundColor: '#FEF2F2',
              color: '#DC2626'
            }}
          >
            <XCircle size={12} /> Failed
          </span>
        );
      case 'Opened':
        return (
          <span
            title="Email opened by prospect"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '0.2rem 0.6rem',
              borderRadius: '9999px',
              backgroundColor: '#F5F3FF',
              color: '#6D28D9'
            }}
          >
            <Eye size={12} /> Opened
          </span>
        );
      default:
        return (
          <span
            title="Draft or logged outreach record"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.75rem',
              fontWeight: 600,
              padding: '0.2rem 0.6rem',
              borderRadius: '9999px',
              backgroundColor: '#F1F5F9',
              color: '#64748B'
            }}
          >
            <FileText size={12} /> {status || 'Logged'}
          </span>
        );
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-header-title">Omnichannel Outreach Hub</h1>
          <p className="page-header-subtitle">
            Track real-time Resend email and Meta WhatsApp Cloud API delivery webhooks, delivery statuses, and multi-channel campaign activity.
          </p>
        </div>

        <div className="page-header-actions">
          <button
            className="btn btn-outline"
            onClick={async () => {
              if (refreshOutreachLogs) {
                await refreshOutreachLogs();
                addToast("Refreshed outreach activity logs from Supabase", "success");
              } else {
                addToast("Outreach logs synced", "info");
              }
            }}
          >
            <RotateCcw size={15} /> Refresh Outreach Logs
          </button>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/leads?view=new')}
          >
            <Send size={15} /> Launch Campaign on New Leads
          </button>
        </div>
      </div>

      {/* Outreach Funnel KPI Cards (Derived from real outreach_logs database records) */}
      <div className="stat-grid">
        <StatCard
          label="Total Activity"
          value={analytics.total.toLocaleString()}
          change={`${analytics.attemptedDispatches} sent`}
          positive={true}
          comparison="outreach logs"
          icon={Send}
          iconColor="#FF7A00"
          iconBg="#FFF7ED"
        />

        <StatCard
          label="Confirmed Delivered"
          value={analytics.confirmedDelivered.toLocaleString()}
          change={`${analytics.deliveryRate}% rate`}
          positive={analytics.deliveryRate >= 80}
          comparison={analytics.read > 0 ? `${analytics.read} read (blue ticks)` : "verified by provider"}
          icon={CheckCircle2}
          iconColor="#10B981"
          iconBg="#ECFDF5"
        />

        <StatCard
          label="Sent (In-Transit)"
          value={analytics.sent.toLocaleString()}
          change="Awaiting webhook"
          positive={true}
          comparison="accepted by Resend"
          icon={Clock}
          iconColor="#3B82F6"
          iconBg="#EFF6FF"
        />

        <StatCard
          label="Bounces & Failures"
          value={(analytics.bounced + analytics.failed + analytics.complained).toLocaleString()}
          change={`${analytics.bounced} bounced`}
          positive={analytics.bounced === 0 && analytics.failed === 0}
          comparison={analytics.complained > 0 ? `${analytics.complained} spam reports` : "delivery issues"}
          icon={AlertTriangle}
          iconColor="#EF4444"
          iconBg="#FEF2F2"
        />

        <StatCard
          label="Engaged / Replied"
          value={analytics.replied.toLocaleString()}
          change={`${analytics.opened} opened`}
          positive={true}
          comparison="warm inquiries"
          icon={MessageSquare}
          iconColor="#8B5CF6"
          iconBg="#F5F3FF"
        />
      </div>

      {/* Channel & Delivery Status Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--color-slate-200)', marginBottom: '1.5rem', overflowX: 'auto' }}>
        {[
          { id: 'all', label: 'All Activities', count: outreachLogs.length },
          { id: 'delivered', label: 'Delivered (Verified)', count: analytics.confirmedDelivered },
          { id: 'read', label: 'Read (Blue Ticks)', count: analytics.read },
          { id: 'sent', label: 'Sent (In-Transit)', count: analytics.sent },
          { id: 'bounced', label: 'Bounces & Issues', count: analytics.bounced + analytics.complained + analytics.failed },
          { id: 'email', label: 'Email Campaigns', count: outreachLogs.filter(o => o.channel === 'Email').length },
          { id: 'whatsapp', label: 'WhatsApp', count: outreachLogs.filter(o => o.channel === 'WhatsApp').length },
          { id: 'pending', label: 'Drafts', count: analytics.drafts },
          { id: 'completed', label: 'Replied & Closed', count: analytics.replied }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '0.625rem 1rem',
              fontSize: '0.875rem',
              fontWeight: activeTab === tab.id ? 600 : 500,
              borderBottom: activeTab === tab.id ? '3px solid var(--color-primary)' : '3px solid transparent',
              color: activeTab === tab.id ? 'var(--color-slate-900)' : 'var(--color-slate-500)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            <span>{tab.label}</span>
            <span style={{ fontSize: '0.6875rem', padding: '0.15rem 0.45rem', borderRadius: '9999px', backgroundColor: activeTab === tab.id ? 'var(--color-primary-light)' : 'var(--color-slate-100)', color: activeTab === tab.id ? 'var(--color-primary)' : 'var(--color-slate-600)', fontWeight: 700 }}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Outreach Activity Table */}
      <div className="table-container">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Prospect & Recipient</th>
                <th>Channel</th>
                <th>Delivery Status</th>
                <th>Outreach Pitch</th>
                <th>Dispatch Time</th>
                <th>Provider Details</th>
                <th>Response State</th>
                <th>Agent</th>
                <th style={{ textAlign: 'right' }}>Follow-up</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--color-slate-900)' }}>
                      {log.businessName}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)', marginTop: '2px' }}>
                      {log.contactPerson} {log.recipientEmail ? `• ${log.recipientEmail}` : (log.recipientPhone ? `• ${log.recipientPhone}` : '')}
                    </div>
                  </td>

                  <td>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        backgroundColor: log.channel === 'WhatsApp' ? '#DCFCE7' : '#EFF6FF',
                        color: log.channel === 'WhatsApp' ? '#166534' : '#1E40AF'
                      }}
                    >
                      {log.channel === 'WhatsApp' ? <MessageSquare size={12} /> : <Mail size={12} />}
                      {log.channel}
                    </span>
                  </td>

                  <td>
                    {renderDeliveryBadge(log.status, log.errorMessage)}
                  </td>

                  <td>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--color-slate-700)', fontWeight: 500 }}>
                      {log.template}
                    </span>
                  </td>

                  <td>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)' }}>
                      {log.sentAt}
                    </span>
                    {log.deliveredAt && (
                      <div style={{ fontSize: '0.6875rem', color: '#15803D', marginTop: '2px' }}>
                        Delivered: {log.deliveredAt}
                      </div>
                    )}
                    {log.readAt && (
                      <div style={{ fontSize: '0.6875rem', color: '#0284C7', marginTop: '2px', fontWeight: 600 }}>
                        Read: {log.readAt}
                      </div>
                    )}
                    {log.bouncedAt && (
                      <div style={{ fontSize: '0.6875rem', color: '#B91C1C', marginTop: '2px' }}>
                        Bounced: {log.bouncedAt}
                      </div>
                    )}
                  </td>

                  <td>
                    {log.providerMessageId ? (
                      <div style={{ fontSize: '0.6875rem', fontFamily: 'monospace', color: 'var(--color-slate-500)' }} title={log.providerMessageId}>
                        {log.channel === 'WhatsApp' || log.providerName === 'whatsapp' ? 'WhatsApp' : 'Resend'}: {log.providerMessageId.slice(0, 10)}...
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-slate-400)' }}>-</span>
                    )}
                    {log.errorMessage && (
                      <div style={{ fontSize: '0.6875rem', color: '#DC2626', marginTop: '2px', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.errorMessage}>
                        {log.errorMessage}
                      </div>
                    )}
                  </td>

                  <td>
                    <span
                      className={
                        log.replyStatus?.includes('Signed') || log.replyStatus?.includes('Demo') || log.replyStatus?.includes('Scheduled')
                          ? 'badge badge-converted'
                          : (log.status === 'Bounced' || log.status === 'Failed' ? 'badge badge-hot' : 'badge badge-contacted')
                      }
                      style={{ fontSize: '0.6875rem' }}
                    >
                      {log.replyStatus}
                    </span>
                  </td>

                  <td>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--color-slate-600)' }}>
                      {log.agent}
                    </span>
                  </td>

                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => navigate(`/leads/${log.leadId}`)}
                    >
                      View Thread &rarr;
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Outreach;

