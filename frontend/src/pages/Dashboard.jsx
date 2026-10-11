import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Flame,
  UserPlus,
  PhoneCall,
  CheckCircle2,
  Percent,
  RefreshCw,
  Calendar,
  Download,
  Plus,
  Eye,
  Send,
  MoreVertical,
  Filter,
  ArrowUpRight,
  ExternalLink,
  MapPin,
  Sparkles
} from 'lucide-react';
import { useLeads } from '../context/LeadContext';
import StatCard from '../components/common/StatCard';
import ChartCard from '../components/common/ChartCard';
import StatusBadge from '../components/common/StatusBadge';
import ScoreBadge from '../components/common/ScoreBadge';
import Pagination from '../components/common/Pagination';
import Modal from '../components/common/Modal';
import LineTrendChart from '../components/charts/LineTrendChart';
import DonutStatusChart from '../components/charts/DonutStatusChart';
import BarServiceChart from '../components/charts/BarServiceChart';
import ScoreHistogramChart from '../components/charts/ScoreHistogramChart';
import LocationDemandChart from '../components/charts/LocationDemandChart';
import {
  mockTrendData,
  mockStatusDistribution,
  mockServiceDistribution,
  mockScoreDistribution,
  mockLocationDistribution
} from '../data/mockAnalytics';

export const Dashboard = () => {
  const navigate = useNavigate();
  const { leads, metrics, addLead, addToast, recordOutreach, currentUser, refreshLeads } = useLeads();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('All');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New lead form state
  const [newLeadForm, setNewLeadForm] = useState({
    businessName: '',
    category: 'Manufacturing',
    location: 'Madurai, Tamil Nadu',
    contactPerson: '',
    email: '',
    phone: '',
    website: '',
    recommendedService: 'Web Development',
    aiScore: 85
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshLeads();
    setIsRefreshing(false);
    addToast("Lead metrics and database stream synchronized.", "success");
  };

  const handleExport = () => {
    addToast("Exporting lead dataset to CSV (PRCBO_Leads_2026.csv)...", "info");
  };

  const handleCreateLead = (e) => {
    e.preventDefault();
    if (!newLeadForm.businessName) {
      addToast("Please enter a business name", "error");
      return;
    }
    addLead(newLeadForm);
    setIsAddModalOpen(false);
    setNewLeadForm({
      businessName: '',
      category: 'Manufacturing',
      location: 'Madurai, Tamil Nadu',
      contactPerson: '',
      email: '',
      phone: '',
      website: '',
      recommendedService: 'Web Development',
      aiScore: 85
    });
  };

  // Filter leads for recent leads table
  const filteredLeads = statusFilter === 'All'
    ? leads
    : leads.filter(l => l.status.toLowerCase() === statusFilter.toLowerCase());

  const pageSize = 6;
  const totalPages = Math.ceil(filteredLeads.length / pageSize) || 1;
  const paginatedLeads = filteredLeads.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-header-title">Good morning, {currentUser?.name || 'Operator'} 👋</h1>
          <p className="page-header-subtitle">
            Here's what's happening with your leads and business intelligence today.
          </p>
        </div>

        <div className="page-header-actions">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--color-slate-200)',
              padding: '0.45rem 0.875rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8125rem',
              color: 'var(--color-slate-600)',
              fontWeight: 500
            }}
          >
            <Calendar size={15} style={{ color: 'var(--color-primary)' }} />
            Sunday, Oct 4, 2026
          </div>

          <button
            className="btn btn-outline"
            onClick={handleRefresh}
            title="Synchronize Lead Stream"
          >
            <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
            {isRefreshing ? 'Syncing...' : 'Sync Pipeline'}
          </button>

          <button className="btn btn-secondary" onClick={handleExport}>
            <Download size={15} />
            Export
          </button>

          <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
            <Plus size={16} />
            Add Lead
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="stat-grid">
        <StatCard
          label="Total Leads"
          value={metrics.totalLeads.value}
          change={metrics.totalLeads.change}
          positive={metrics.totalLeads.positive}
          comparison={metrics.totalLeads.comparison}
          icon={Users}
          iconColor="#FF7A00"
          iconBg="#FFF7ED"
        />

        <StatCard
          label="New Leads"
          value={metrics.newLeads.value}
          change={metrics.newLeads.change}
          positive={metrics.newLeads.positive}
          comparison={metrics.newLeads.comparison}
          icon={UserPlus}
          iconColor="#3B82F6"
          iconBg="#EFF6FF"
        />

        <StatCard
          label="Hot Leads"
          value={metrics.hotLeads.value}
          change={metrics.hotLeads.change}
          positive={metrics.hotLeads.positive}
          comparison={metrics.hotLeads.comparison}
          icon={Flame}
          iconColor="#EA580C"
          iconBg="#FFEDD5"
        />

        <StatCard
          label="Contacted"
          value={metrics.contacted.value}
          change={metrics.contacted.change}
          positive={metrics.contacted.positive}
          comparison={metrics.contacted.comparison}
          icon={PhoneCall}
          iconColor="#8B5CF6"
          iconBg="#F5F3FF"
        />

        <StatCard
          label="Converted"
          value={metrics.converted.value}
          change={metrics.converted.change}
          positive={metrics.converted.positive}
          comparison={metrics.converted.comparison}
          icon={CheckCircle2}
          iconColor="#10B981"
          iconBg="#ECFDF5"
        />

        <StatCard
          label="Conversion Rate"
          value={metrics.conversionRate.value}
          change={metrics.conversionRate.change}
          positive={metrics.conversionRate.positive}
          comparison={metrics.conversionRate.comparison}
          icon={Percent}
          iconColor="#06B6D4"
          iconBg="#ECFEFF"
        />
      </div>

      {/* Primary Charts Row: Trend & Donut Status */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Lead Acquisition Trend */}
        <div style={{ flex: 1.6 }}>
          <ChartCard
            title="Lead Acquisition Trend"
            subtitle="Daily incoming business leads & qualified hot tier over the last 30 days"
            action={
              <button
                className="btn btn-outline btn-sm"
                onClick={() => navigate('/analytics')}
              >
                Deep Dive <ArrowUpRight size={14} />
              </button>
            }
          >
            <LineTrendChart data={mockTrendData} height={230} />
          </ChartCard>
        </div>

        {/* Lead Status Distribution */}
        <div style={{ flex: 1 }}>
          <ChartCard
            title="Lead Status Distribution"
            subtitle="Real-time pipeline segmentation across active outreach stages"
          >
            <DonutStatusChart data={mockStatusDistribution} size={190} />
          </ChartCard>
        </div>
      </div>

      {/* Secondary Charts Row: Services & Score Histogram */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Leads by PRCBO Service */}
        <ChartCard
          title="Leads by Recommended Service"
          subtitle="AI-classified client demand mapped to PRCBO engineering tracks"
        >
          <BarServiceChart data={mockServiceDistribution} />
        </ChartCard>

        {/* AI Score Distribution */}
        <ChartCard
          title="AI Score Distribution"
          subtitle="Confidence distribution evaluated by PRCBO scoring algorithms"
        >
          <ScoreHistogramChart data={mockScoreDistribution} height={180} />
        </ChartCard>
      </div>

      {/* Geographic Distribution Banner */}
      <div style={{ marginBottom: '2rem' }}>
        <ChartCard
          title="Regional Business Concentration"
          subtitle="Lead density across core Tamil Nadu, Karnataka & Telangana hubs"
        >
          <LocationDemandChart data={mockLocationDistribution} />
        </ChartCard>
      </div>

      {/* Recent Leads CRM Table */}
      <div className="table-container">
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--color-slate-200)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem'
          }}
        >
          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-slate-900)' }}>
              Recent Leads & Opportunities
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-slate-500)', marginTop: '2px' }}>
              Showing {filteredLeads.length} leads prioritized by AI intelligence scoring
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* Status Quick Filter Tabs */}
            <div style={{ display: 'flex', backgroundColor: 'var(--color-slate-100)', padding: '3px', borderRadius: '8px' }}>
              {['All', 'New', 'Contacted', 'Follow-up', 'Converted'].map((st) => (
                <button
                  key={st}
                  onClick={() => {
                    setStatusFilter(st);
                    setCurrentPage(1);
                  }}
                  style={{
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    borderRadius: '6px',
                    backgroundColor: statusFilter === st ? '#FFFFFF' : 'transparent',
                    color: statusFilter === st ? 'var(--color-slate-900)' : 'var(--color-slate-600)',
                    boxShadow: statusFilter === st ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {st}
                </button>
              ))}
            </div>

            <button
              className="btn btn-primary btn-sm"
              onClick={() => navigate('/leads')}
            >
              Open Full CRM <ArrowUpRight size={14} />
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Business Name</th>
                <th>Category</th>
                <th>Location</th>
                <th>AI Score</th>
                <th>Recommended Service</th>
                <th>Status</th>
                <th>Source</th>
                <th>Date Added</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedLeads.map((lead) => (
                <tr key={lead.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--color-slate-900)' }}>
                      <span
                        onClick={() => navigate(`/leads/${lead.id}`)}
                        style={{ cursor: 'pointer', transition: 'color 0.15s ease' }}
                        onMouseEnter={(e) => e.target.style.color = 'var(--color-primary)'}
                        onMouseLeave={(e) => e.target.style.color = 'var(--color-slate-900)'}
                      >
                        {lead.businessName}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-400)', marginTop: '2px' }}>
                      {lead.contactPerson || 'Direct Entity'}
                    </div>
                  </td>

                  <td>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--color-slate-700)', fontWeight: 500 }}>
                      {lead.category}
                    </span>
                  </td>

                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8125rem', color: 'var(--color-slate-600)' }}>
                      <MapPin size={12} style={{ color: 'var(--color-slate-400)' }} />
                      {lead.location}
                    </div>
                  </td>

                  <td>
                    <ScoreBadge score={lead.aiScore} size="sm" />
                  </td>

                  <td>
                    <span
                      style={{
                        padding: '0.2rem 0.55rem',
                        borderRadius: '6px',
                        backgroundColor: 'var(--color-primary-light)',
                        color: 'var(--color-primary)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        border: '1px solid var(--color-primary-border)'
                      }}
                    >
                      {lead.recommendedService}
                    </span>
                  </td>

                  <td>
                    <StatusBadge status={lead.status} />
                  </td>

                  <td>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)' }}>
                      {lead.source}
                    </span>
                  </td>

                  <td>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)' }}>
                      {lead.dateAdded}
                    </span>
                  </td>

                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <button
                        className="btn btn-outline btn-sm"
                        style={{ padding: '0.35rem 0.6rem' }}
                        onClick={() => navigate(`/leads/${lead.id}`)}
                        title="View Full Profile"
                      >
                        <Eye size={13} /> View
                      </button>
                      <button
                        className="btn btn-primary btn-sm"
                        style={{ padding: '0.35rem 0.6rem' }}
                        onClick={() => {
                          recordOutreach(lead, 'WhatsApp', lead.outreachDrafts?.whatsapp?.message);
                        }}
                        title="Quick Dispatch WhatsApp"
                      >
                        <Send size={13} /> Reach
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={filteredLeads.length}
          pageSize={pageSize}
        />
      </div>

      {/* Add Lead Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Enterprise Lead"
      >
        <form onSubmit={handleCreateLead} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-slate-700)', marginBottom: '0.3rem' }}>
              Business Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Royal Pandyan Logistics"
              value={newLeadForm.businessName}
              onChange={(e) => setNewLeadForm({ ...newLeadForm, businessName: e.target.value })}
              style={{
                width: '100%',
                height: '40px',
                padding: '0 0.875rem',
                borderRadius: '8px',
                border: '1px solid var(--color-slate-200)',
                fontSize: '0.875rem'
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-slate-700)', marginBottom: '0.3rem' }}>
                Category
              </label>
              <select
                className="custom-select"
                style={{ width: '100%' }}
                value={newLeadForm.category}
                onChange={(e) => setNewLeadForm({ ...newLeadForm, category: e.target.value })}
              >
                <option value="Manufacturing">Manufacturing</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Hotel">Hotel</option>
                <option value="Restaurant">Restaurant</option>
                <option value="Education">Education</option>
                <option value="Retail">Retail</option>
                <option value="Real Estate">Real Estate</option>
                <option value="Startup">Startup</option>
                <option value="E-commerce">E-commerce</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-slate-700)', marginBottom: '0.3rem' }}>
                Location
              </label>
              <input
                type="text"
                value={newLeadForm.location}
                onChange={(e) => setNewLeadForm({ ...newLeadForm, location: e.target.value })}
                style={{
                  width: '100%',
                  height: '38px',
                  padding: '0 0.875rem',
                  borderRadius: '8px',
                  border: '1px solid var(--color-slate-200)',
                  fontSize: '0.875rem'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-slate-700)', marginBottom: '0.3rem' }}>
                Contact Person
              </label>
              <input
                type="text"
                placeholder="e.g. S. Meenakshisundaram"
                value={newLeadForm.contactPerson}
                onChange={(e) => setNewLeadForm({ ...newLeadForm, contactPerson: e.target.value })}
                style={{
                  width: '100%',
                  height: '38px',
                  padding: '0 0.875rem',
                  borderRadius: '8px',
                  border: '1px solid var(--color-slate-200)',
                  fontSize: '0.875rem'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-slate-700)', marginBottom: '0.3rem' }}>
                Phone Number
              </label>
              <input
                type="text"
                placeholder="+91 94431 00000"
                value={newLeadForm.phone}
                onChange={(e) => setNewLeadForm({ ...newLeadForm, phone: e.target.value })}
                style={{
                  width: '100%',
                  height: '38px',
                  padding: '0 0.875rem',
                  borderRadius: '8px',
                  border: '1px solid var(--color-slate-200)',
                  fontSize: '0.875rem'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-slate-700)', marginBottom: '0.3rem' }}>
                Recommended PRCBO Service
              </label>
              <select
                className="custom-select"
                style={{ width: '100%' }}
                value={newLeadForm.recommendedService}
                onChange={(e) => setNewLeadForm({ ...newLeadForm, recommendedService: e.target.value })}
              >
                <option value="Web Development">Web Development</option>
                <option value="AI Development">AI Development</option>
                <option value="IoT Solutions">IoT Solutions</option>
                <option value="UI/UX Design">UI/UX Design</option>
                <option value="Digital Marketing">Digital Marketing</option>
                <option value="Graphic Design">Graphic Design</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-slate-700)', marginBottom: '0.3rem' }}>
                AI Score (0-100)
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={newLeadForm.aiScore}
                onChange={(e) => setNewLeadForm({ ...newLeadForm, aiScore: parseInt(e.target.value) || 75 })}
                style={{
                  width: '100%',
                  height: '38px',
                  padding: '0 0.875rem',
                  borderRadius: '8px',
                  border: '1px solid var(--color-slate-200)',
                  fontSize: '0.875rem'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <Plus size={16} /> Save Lead
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Dashboard;
