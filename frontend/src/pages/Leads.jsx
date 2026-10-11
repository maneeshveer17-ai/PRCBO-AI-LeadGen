import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Plus,
  Download,
  Upload,
  Search,
  Filter,
  RotateCcw,
  Eye,
  Send,
  MoreVertical,
  CheckSquare,
  Square,
  MapPin,
  Briefcase,
  Phone,
  Mail,
  ExternalLink,
  Flame,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Database,
  AlertCircle,
  Trash2
} from 'lucide-react';
import { useLeads } from '../context/LeadContext';
import StatusBadge from '../components/common/StatusBadge';
import ScoreBadge from '../components/common/ScoreBadge';
import Pagination from '../components/common/Pagination';
import EmptyState from '../components/common/EmptyState';
import Modal from '../components/common/Modal';

export const Leads = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const {
    leads,
    addLead,
    updateLeadStatus,
    deleteLead,
    recordOutreach,
    addToast,
    isSupabaseConfigured,
    isDatabaseConnected,
    isLoadingLeads,
    databaseError,
    refreshLeads,
    seedSampleLeadsToDatabase
  } = useLeads();

  // Filters state
  const viewParam = searchParams.get('view') || 'all';
  const [activeTab, setActiveTab] = useState(viewParam);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedLocation, setSelectedLocation] = useState('All');
  const [selectedService, setSelectedService] = useState('All');
  const [selectedScoreTier, setSelectedScoreTier] = useState('All');
  const [selectedSource, setSelectedSource] = useState('All');

  // Multi-select state
  const [selectedLeadIds, setSelectedLeadIds] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Add lead modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newLeadForm, setNewLeadForm] = useState({
    businessName: '',
    category: 'Healthcare',
    location: 'Chennai, Tamil Nadu',
    contactPerson: '',
    phone: '',
    email: '',
    website: '',
    recommendedService: 'Web Development',
    aiScore: 88
  });

  // Sync tab with URL search parameter
  useEffect(() => {
    if (viewParam) {
      setActiveTab(viewParam.toLowerCase());
      setCurrentPage(1);
    }
  }, [viewParam]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ view: tab });
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('All');
    setSelectedLocation('All');
    setSelectedService('All');
    setSelectedScoreTier('All');
    setSelectedSource('All');
    handleTabChange('all');
    addToast('Filters reset to default view', 'info');
  };

  // Filter application logic
  const filteredLeads = leads.filter(lead => {
    // Tab filter
    if (activeTab === 'hot' && lead.scoreTier !== 'HOT') return false;
    if (activeTab === 'new' && lead.status !== 'New') return false;
    if (activeTab === 'contacted' && lead.status !== 'Contacted') return false;
    if (activeTab === 'followup' && lead.status !== 'Follow-up') return false;
    if (activeTab === 'converted' && lead.status !== 'Converted') return false;
    if (activeTab === 'rejected' && lead.status !== 'Rejected') return false;

    // Search query
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const match =
        lead.businessName.toLowerCase().includes(q) ||
        lead.contactPerson?.toLowerCase().includes(q) ||
        lead.location.toLowerCase().includes(q) ||
        lead.email?.toLowerCase().includes(q);
      if (!match) return false;
    }

    // Dropdown filters
    if (selectedCategory !== 'All' && lead.category !== selectedCategory) return false;
    if (selectedLocation !== 'All' && !lead.location.toLowerCase().includes(selectedLocation.toLowerCase())) return false;
    if (selectedService !== 'All' && lead.recommendedService !== selectedService) return false;
    if (selectedScoreTier !== 'All' && lead.scoreTier !== selectedScoreTier) return false;
    if (selectedSource !== 'All' && lead.source !== selectedSource) return false;

    return true;
  });

  const totalPages = Math.ceil(filteredLeads.length / pageSize) || 1;
  const paginatedLeads = filteredLeads.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Bulk actions
  const toggleSelectAll = () => {
    if (selectedLeadIds.length === paginatedLeads.length) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(paginatedLeads.map(l => l.id));
    }
  };

  const toggleSelectLead = (id) => {
    if (selectedLeadIds.includes(id)) {
      setSelectedLeadIds(selectedLeadIds.filter(item => item !== id));
    } else {
      setSelectedLeadIds([...selectedLeadIds, id]);
    }
  };

  const handleBulkStatusChange = (status) => {
    selectedLeadIds.forEach(id => updateLeadStatus(id, status));
    setSelectedLeadIds([]);
    addToast(`Updated status for ${selectedLeadIds.length} selected leads`, 'success');
  };

  const handleCreateLead = (e) => {
    e.preventDefault();
    if (!newLeadForm.businessName) return;
    addLead(newLeadForm);
    setIsAddModalOpen(false);
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-header-title">Leads Management</h1>
          <p className="page-header-subtitle">
            Discover, qualify and manage your business opportunities across India.
          </p>
        </div>

        <div className="page-header-actions">
          <button className="btn btn-outline" onClick={() => navigate('/data-imports')}>
            <Upload size={15} /> Import Leads
          </button>
          <button className="btn btn-secondary" onClick={() => addToast("Exporting filtered dataset to CSV...", "info")}>
            <Download size={15} /> Export
          </button>
          <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
            <Plus size={16} /> Add Lead
          </button>
        </div>
      </div>

      {/* Supabase Connection Status Banner */}
      {!isSupabaseConfigured ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '0.75rem 1rem',
            backgroundColor: '#EFF6FF',
            border: '1px solid #BFDBFE',
            borderRadius: '10px',
            marginBottom: '1.25rem',
            fontSize: '0.8125rem',
            color: '#1E40AF'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={16} style={{ color: '#2563EB', flexShrink: 0 }} />
            <span>
              <strong>Supabase PostgreSQL Required:</strong> Environment variables (<code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>) are unconfigured. Configure your credentials in <code>frontend/.env</code> to connect to live Supabase leads storage.
            </span>
          </div>
        </div>
      ) : databaseError ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '0.75rem 1rem',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: '10px',
            marginBottom: '1.25rem',
            fontSize: '0.8125rem',
            color: '#991B1B'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} style={{ color: '#DC2626', flexShrink: 0 }} />
            <span>
              <strong>Supabase Error:</strong> {databaseError}
            </span>
          </div>
          <button
            className="btn btn-outline btn-sm"
            style={{ fontSize: '0.75rem', borderColor: '#FCA5A5' }}
            onClick={() => refreshLeads()}
          >
            Retry Connection
          </button>
        </div>
      ) : isDatabaseConnected && leads.length === 0 ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '0.75rem 1rem',
            backgroundColor: '#F0FDF4',
            border: '1px solid #BBF7D0',
            borderRadius: '10px',
            marginBottom: '1.25rem',
            fontSize: '0.8125rem',
            color: '#166534'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={16} style={{ color: '#16A34A', flexShrink: 0 }} />
            <span>
              <strong>Supabase PostgreSQL Connected:</strong> Leads table is ready and currently contains 0 records. Add leads from Discovery or seed initial sample data.
            </span>
          </div>
          <button
            className="btn btn-primary btn-sm"
            style={{ fontSize: '0.75rem' }}
            onClick={() => seedSampleLeadsToDatabase()}
          >
            Seed Sample Data
          </button>
        </div>
      ) : isDatabaseConnected ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '0.4rem 0.875rem',
            backgroundColor: '#F0FDF4',
            border: '1px solid #BBF7D0',
            borderRadius: '8px',
            marginBottom: '1.25rem',
            fontSize: '0.75rem',
            color: '#166534'
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#16A34A', display: 'inline-block' }} />
          <span>
            Connected to <strong>Supabase PostgreSQL</strong> &bull; {leads.length} persistent records active
          </span>
        </div>
      ) : null}

      {/* CRM Views Tabs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          borderBottom: '1px solid var(--color-slate-200)',
          marginBottom: '1.5rem',
          overflowX: 'auto',
          paddingBottom: '2px'
        }}
      >
        {[
          { key: 'all', label: 'All Leads', count: leads.length },
          { key: 'hot', label: 'Hot Leads', count: leads.filter(l => l.scoreTier === 'HOT').length, icon: Flame, color: '#FF7A00' },
          { key: 'new', label: 'New', count: leads.filter(l => l.status === 'New').length },
          { key: 'contacted', label: 'Contacted', count: leads.filter(l => l.status === 'Contacted').length },
          { key: 'followup', label: 'Follow-up', count: leads.filter(l => l.status === 'Follow-up').length },
          { key: 'converted', label: 'Converted', count: leads.filter(l => l.status === 'Converted').length, color: '#10B981' },
          { key: 'rejected', label: 'Rejected', count: leads.filter(l => l.status === 'Rejected').length, color: '#EF4444' }
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0.625rem 1rem',
                borderBottom: isActive ? '3px solid var(--color-primary)' : '3px solid transparent',
                color: isActive ? 'var(--color-slate-900)' : 'var(--color-slate-500)',
                fontWeight: isActive ? 600 : 500,
                fontSize: '0.875rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              {Icon && <Icon size={15} style={{ color: tab.color || 'inherit' }} />}
              <span>{tab.label}</span>
              <span
                style={{
                  fontSize: '0.6875rem',
                  padding: '0.15rem 0.45rem',
                  borderRadius: '9999px',
                  backgroundColor: isActive ? 'var(--color-primary-light)' : 'var(--color-slate-100)',
                  color: isActive ? 'var(--color-primary)' : 'var(--color-slate-600)',
                  fontWeight: 700
                }}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Comprehensive Filter Bar */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div className="filter-bar" style={{ marginBottom: 0 }}>
          <div className="filter-group" style={{ flex: 1 }}>
            {/* Search Input */}
            <div className="search-input-wrapper">
              <Search className="search-icon-inside" size={16} />
              <input
                type="text"
                placeholder="Filter by business, contact person, or email..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            {/* Category Select */}
            <select
              className="custom-select"
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="All">All Categories</option>
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

            {/* Location Select */}
            <select
              className="custom-select"
              value={selectedLocation}
              onChange={(e) => {
                setSelectedLocation(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="All">All Locations</option>
              <option value="Madurai">Madurai</option>
              <option value="Chennai">Chennai</option>
              <option value="Coimbatore">Coimbatore</option>
              <option value="Trichy">Trichy</option>
              <option value="Bengaluru">Bengaluru</option>
              <option value="Hyderabad">Hyderabad</option>
            </select>

            {/* Recommended Service Select */}
            <select
              className="custom-select"
              value={selectedService}
              onChange={(e) => {
                setSelectedService(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="All">All Services</option>
              <option value="Web Development">Web Development</option>
              <option value="AI Development">AI Development</option>
              <option value="IoT Solutions">IoT Solutions</option>
              <option value="UI/UX Design">UI/UX Design</option>
              <option value="Graphic Design">Graphic Design</option>
              <option value="Digital Marketing">Digital Marketing</option>
            </select>

            {/* AI Score Tier */}
            <select
              className="custom-select"
              value={selectedScoreTier}
              onChange={(e) => {
                setSelectedScoreTier(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="All">All Score Tiers</option>
              <option value="HOT">Hot Leads (88+)</option>
              <option value="HIGH">High (70-87)</option>
              <option value="MEDIUM">Medium (50-69)</option>
              <option value="LOW">Low (&lt;50)</option>
            </select>
          </div>

          <button
            className="btn btn-outline btn-sm"
            onClick={handleResetFilters}
            title="Reset Filters"
          >
            <RotateCcw size={14} /> Reset
          </button>
        </div>
      </div>

      {/* Bulk Action Banner when leads selected */}
      {selectedLeadIds.length > 0 && (
        <div
          style={{
            backgroundColor: '#0F172A',
            color: '#FFFFFF',
            borderRadius: '10px',
            padding: '0.75rem 1.25rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>
            {selectedLeadIds.length} lead(s) selected
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8125rem', color: '#94A3B8' }}>Mark as:</span>
            <button className="btn btn-secondary btn-sm" onClick={() => handleBulkStatusChange('Contacted')}>
              Contacted
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => handleBulkStatusChange('Follow-up')}>
              Follow-up
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => handleBulkStatusChange('Converted')}>
              Converted
            </button>
            <button
              className="btn btn-outline btn-sm"
              style={{ color: '#FCA5A5', borderColor: '#EF4444' }}
              onClick={() => {
                if (window.confirm(`Are you sure you want to delete ${selectedLeadIds.length} lead(s)?`)) {
                  selectedLeadIds.forEach(id => deleteLead(id));
                  setSelectedLeadIds([]);
                }
              }}
            >
              <Trash2 size={13} /> Delete
            </button>
            <button className="btn btn-outline btn-sm" style={{ color: '#FFFFFF', borderColor: '#475569' }} onClick={() => setSelectedLeadIds([])}>
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* Main Leads Table */}
      <div className="table-container">
        {filteredLeads.length === 0 ? (
          <EmptyState
            title="No leads match your criteria"
            description="Try loosening your search query or reset the category/location filters to see all available business leads."
            actionLabel="Reset All Filters"
            onAction={handleResetFilters}
          />
        ) : (
          <>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>
                      <button onClick={toggleSelectAll} style={{ display: 'flex', color: 'var(--color-slate-400)' }}>
                        {selectedLeadIds.length === paginatedLeads.length && paginatedLeads.length > 0 ? (
                          <CheckSquare size={17} style={{ color: 'var(--color-primary)' }} />
                        ) : (
                          <Square size={17} />
                        )}
                      </button>
                    </th>
                    <th>Business</th>
                    <th>Location & Contact</th>
                    <th>Category</th>
                    <th>AI Score</th>
                    <th>Recommended Service</th>
                    <th>Status</th>
                    <th>Source</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedLeads.map((lead) => {
                    const isSelected = selectedLeadIds.includes(lead.id);

                    return (
                      <tr key={lead.id} style={{ backgroundColor: isSelected ? 'var(--color-primary-light)' : 'transparent' }}>
                        <td>
                          <button onClick={() => toggleSelectLead(lead.id)} style={{ display: 'flex', color: 'var(--color-slate-400)' }}>
                            {isSelected ? (
                              <CheckSquare size={17} style={{ color: 'var(--color-primary)' }} />
                            ) : (
                              <Square size={17} />
                            )}
                          </button>
                        </td>

                        <td>
                          <div>
                            <span
                              onClick={() => navigate(`/leads/${lead.id}`)}
                              style={{ fontWeight: 600, color: 'var(--color-slate-900)', cursor: 'pointer' }}
                              onMouseEnter={(e) => e.target.style.color = 'var(--color-primary)'}
                              onMouseLeave={(e) => e.target.style.color = 'var(--color-slate-900)'}
                            >
                              {lead.businessName}
                            </span>
                            {lead.website && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                <a
                                  href={lead.website}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{ fontSize: '0.6875rem', color: 'var(--color-slate-400)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                                >
                                  {lead.website.replace('https://', '').replace('http://', '')} <ExternalLink size={10} />
                                </a>
                              </div>
                            )}
                          </div>
                        </td>

                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8125rem', color: 'var(--color-slate-700)' }}>
                              <MapPin size={12} style={{ color: 'var(--color-slate-400)' }} />
                              {lead.location}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)' }}>
                              {lead.contactPerson || 'General Desk'} &bull; {lead.phone}
                            </span>
                          </div>
                        </td>

                        <td>
                          <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-slate-700)' }}>
                            {lead.category}
                          </span>
                        </td>

                        <td>
                          <ScoreBadge score={lead.aiScore} size="sm" />
                        </td>

                        <td>
                          <span
                            style={{
                              padding: '0.2rem 0.6rem',
                              borderRadius: '6px',
                              backgroundColor: 'var(--color-primary-light)',
                              color: 'var(--color-primary)',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              border: '1px solid var(--color-primary-border)',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {lead.recommendedService}
                          </span>
                        </td>

                        <td>
                          <StatusBadge status={lead.status} />
                        </td>

                        <td>
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)', whiteSpace: 'nowrap' }}>
                            {lead.source}
                          </span>
                        </td>

                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <button
                              className="btn btn-outline btn-sm"
                              style={{ padding: '0.35rem 0.65rem' }}
                              onClick={() => navigate(`/leads/${lead.id}`)}
                              title="View Lead Details"
                            >
                              <Eye size={13} /> View
                            </button>
                            <button
                              className="btn btn-primary btn-sm"
                              style={{ padding: '0.35rem 0.65rem' }}
                              onClick={() => {
                                recordOutreach(lead, 'WhatsApp', lead.outreachDrafts?.whatsapp?.message);
                              }}
                              title="Dispatch Outreach"
                            >
                              <Send size={13} /> Contact
                            </button>
                            <button
                              className="btn btn-outline btn-sm"
                              style={{ padding: '0.35rem 0.5rem', color: '#EF4444', borderColor: '#FCA5A5' }}
                              onClick={() => {
                                if (window.confirm(`Are you sure you want to delete "${lead.businessName}"?`)) {
                                  deleteLead(lead.id);
                                }
                              }}
                              title="Delete Lead"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={filteredLeads.length}
              pageSize={pageSize}
            />
          </>
        )}
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
              placeholder="e.g. Coimbatore Textile Exporters"
              value={newLeadForm.businessName}
              onChange={(e) => setNewLeadForm({ ...newLeadForm, businessName: e.target.value })}
              style={{ width: '100%', height: '40px', padding: '0 0.875rem', borderRadius: '8px', border: '1px solid var(--color-slate-200)', fontSize: '0.875rem' }}
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
                style={{ width: '100%', height: '38px', padding: '0 0.875rem', borderRadius: '8px', border: '1px solid var(--color-slate-200)', fontSize: '0.875rem' }}
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
                placeholder="e.g. S. Ramesh"
                value={newLeadForm.contactPerson}
                onChange={(e) => setNewLeadForm({ ...newLeadForm, contactPerson: e.target.value })}
                style={{ width: '100%', height: '38px', padding: '0 0.875rem', borderRadius: '8px', border: '1px solid var(--color-slate-200)', fontSize: '0.875rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-slate-700)', marginBottom: '0.3rem' }}>
                Phone Number
              </label>
              <input
                type="text"
                placeholder="+91 94432 00000"
                value={newLeadForm.phone}
                onChange={(e) => setNewLeadForm({ ...newLeadForm, phone: e.target.value })}
                style={{ width: '100%', height: '38px', padding: '0 0.875rem', borderRadius: '8px', border: '1px solid var(--color-slate-200)', fontSize: '0.875rem' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-slate-700)', marginBottom: '0.3rem' }}>
                Recommended Service
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
                onChange={(e) => setNewLeadForm({ ...newLeadForm, aiScore: parseInt(e.target.value) || 85 })}
                style={{ width: '100%', height: '38px', padding: '0 0.875rem', borderRadius: '8px', border: '1px solid var(--color-slate-200)', fontSize: '0.875rem' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <button type="button" className="btn btn-outline" onClick={() => setIsAddModalOpen(false)}>
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

export default Leads;
