import React, { useState } from 'react';
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
  Sparkles
} from 'lucide-react';
import { useLeads } from '../context/LeadContext';
import StatCard from '../components/common/StatCard';
import { mockOutreachMetrics } from '../data/mockOutreach';

export const Outreach = () => {
  const navigate = useNavigate();
  const { outreachLogs, leads, addToast } = useLeads();
  const [activeTab, setActiveTab] = useState('all');

  const filteredLogs = outreachLogs.filter(log => {
    if (activeTab === 'email') return log.channel === 'Email';
    if (activeTab === 'whatsapp') return log.channel === 'WhatsApp';
    if (activeTab === 'pending') return log.status === 'Pending';
    if (activeTab === 'completed') return log.status === 'Completed' || log.status === 'Replied';
    return true;
  });

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-header-title">Omnichannel Outreach Hub</h1>
          <p className="page-header-subtitle">
            Track, dispatch and optimize personalized WhatsApp and Email communication across active prospects.
          </p>
        </div>

        <div className="page-header-actions">
          <button
            className="btn btn-outline"
            onClick={() => addToast("Syncing WhatsApp Business webhook status...", "info")}
          >
            <RotateCcw size={15} /> Refresh Delivery Status
          </button>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/leads?view=new')}
          >
            <Send size={15} /> Launch Campaign on New Leads
          </button>
        </div>
      </div>

      {/* Outreach Funnel KPI Cards */}
      <div className="stat-grid">
        <StatCard
          label={mockOutreachMetrics.totalOutreach.label}
          value={mockOutreachMetrics.totalOutreach.value}
          change={mockOutreachMetrics.totalOutreach.change}
          positive={true}
          comparison="dispatched volume"
          icon={Send}
          iconColor="#FF7A00"
          iconBg="#FFF7ED"
        />

        <StatCard
          label={mockOutreachMetrics.sent.label}
          value={mockOutreachMetrics.sent.value}
          change={mockOutreachMetrics.sent.change}
          positive={true}
          comparison="92% delivery rate"
          icon={CheckCircle2}
          iconColor="#3B82F6"
          iconBg="#EFF6FF"
        />

        <StatCard
          label={mockOutreachMetrics.opened.label}
          value={mockOutreachMetrics.opened.value}
          change={mockOutreachMetrics.opened.change}
          positive={true}
          comparison="read velocity"
          icon={Eye}
          iconColor="#8B5CF6"
          iconBg="#F5F3FF"
        />

        <StatCard
          label={mockOutreachMetrics.replied.label}
          value={mockOutreachMetrics.replied.value}
          change={mockOutreachMetrics.replied.change}
          positive={true}
          comparison="warm inquiries"
          icon={MessageSquare}
          iconColor="#10B981"
          iconBg="#ECFDF5"
        />

        <StatCard
          label={mockOutreachMetrics.converted.label}
          value={mockOutreachMetrics.converted.value}
          change={mockOutreachMetrics.converted.change}
          positive={true}
          comparison="signed contracts"
          icon={Sparkles}
          iconColor="#EA580C"
          iconBg="#FFEDD5"
        />
      </div>

      {/* Channel Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--color-slate-200)', marginBottom: '1.5rem', overflowX: 'auto' }}>
        {[
          { id: 'all', label: 'All Activities', count: outreachLogs.length },
          { id: 'whatsapp', label: 'WhatsApp Dispatches', count: outreachLogs.filter(o => o.channel === 'WhatsApp').length },
          { id: 'email', label: 'Email Campaigns', count: outreachLogs.filter(o => o.channel === 'Email').length },
          { id: 'pending', label: 'Pending Queue', count: outreachLogs.filter(o => o.status === 'Pending').length },
          { id: 'completed', label: 'Replied & Closed', count: outreachLogs.filter(o => o.status === 'Replied' || o.status === 'Completed').length }
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
                <th>Prospect & Business</th>
                <th>Channel</th>
                <th>Outreach Template</th>
                <th>Dispatch Time</th>
                <th>Open Status</th>
                <th>Response State</th>
                <th>Assigned Agent</th>
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
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-400)', marginTop: '2px' }}>
                      {log.contactPerson}
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
                    <span style={{ fontSize: '0.8125rem', color: 'var(--color-slate-700)', fontWeight: 500 }}>
                      {log.template}
                    </span>
                  </td>

                  <td>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)' }}>
                      {log.sentAt}
                    </span>
                  </td>

                  <td>
                    <span style={{ fontSize: '0.75rem', color: '#10B981', fontWeight: 600 }}>
                      {log.openStatus}
                    </span>
                  </td>

                  <td>
                    <span
                      className={
                        log.replyStatus.includes('Signed') || log.replyStatus.includes('Demo') || log.replyStatus.includes('Scheduled')
                          ? 'badge badge-converted'
                          : 'badge badge-contacted'
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
