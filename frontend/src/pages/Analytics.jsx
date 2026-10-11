import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Calendar,
  Download,
  TrendingUp,
  Percent,
  MapPin,
  Flame,
  CheckCircle2,
  Users,
  Compass,
  ArrowUpRight,
  Filter,
  RefreshCw,
  Box,
  Layers,
  Sparkles,
  FileSpreadsheet,
  FileText,
  X,
  Search,
  RotateCcw,
  Info,
  ShieldAlert,
  Database
} from 'lucide-react';
import { useLeads } from '../context/LeadContext';
import StatCard from '../components/common/StatCard';
import ChartCard from '../components/common/ChartCard';
import EmptyState from '../components/common/EmptyState';
import LineTrendChart from '../components/charts/LineTrendChart';
import DonutStatusChart from '../components/charts/DonutStatusChart';
import BarServiceChart from '../components/charts/BarServiceChart';
import LocationDemandChart from '../components/charts/LocationDemandChart';
import ScoreHistogramChart from '../components/charts/ScoreHistogramChart';
import DepthPillar3DChart from '../components/charts/DepthPillar3DChart';
import ConversionFunnelChart from '../components/charts/ConversionFunnelChart';
import {
  getUniqueLeads,
  filterLeads,
  calculateKpiMetrics,
  calculateGrowthTrend,
  calculateFunnelData,
  calculateServiceDistribution,
  calculateLocationDistribution,
  calculateScoreDistribution,
  calculate3DPipelineData,
  calculateStatusDistribution,
  calculateChannelPerformance
} from '../services/leadAnalyticsService';
import { exportToExcel, exportToPDF } from '../services/leadExportService';

export const Analytics = () => {
  const { leads, addToast, isSupabaseConfigured, isDatabaseConnected, isLoadingLeads, databaseError } = useLeads();

  // Filter States
  const [dateRange, setDateRange] = useState('30days');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedService, setSelectedService] = useState('All');
  const [selectedLocation, setSelectedLocation] = useState('All');
  const [selectedCity, setSelectedCity] = useState(null);
  const [customStartDate, setCustomStartDate] = useState('2026-09-01');
  const [customEndDate, setCustomEndDate] = useState('2026-10-31');

  // UI Interactive States
  const [isLoading, setIsLoading] = useState(false);
  const [channelSearch, setChannelSearch] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // 1. Deduplicate Source Leads from LeadContext
  const uniqueLeads = useMemo(() => {
    return getUniqueLeads(leads);
  }, [leads]);

  // 2. Apply Active Filters
  const filteredLeads = useMemo(() => {
    return filterLeads(uniqueLeads, {
      dateRange,
      customStartDate,
      customEndDate,
      status: selectedStatus,
      service: selectedService,
      location: selectedLocation,
      selectedCity
    });
  }, [uniqueLeads, dateRange, customStartDate, customEndDate, selectedStatus, selectedService, selectedLocation, selectedCity]);

  // 3. Compute Real Metrics from Filtered Leads
  const kpiMetrics = useMemo(() => {
    return calculateKpiMetrics(filteredLeads);
  }, [filteredLeads]);

  // 4. Compute Dynamic Chart Datasets
  const growthTrend = useMemo(() => {
    return calculateGrowthTrend(filteredLeads);
  }, [filteredLeads]);

  const funnelData = useMemo(() => {
    return calculateFunnelData(filteredLeads);
  }, [filteredLeads]);

  const serviceDistribution = useMemo(() => {
    return calculateServiceDistribution(filteredLeads);
  }, [filteredLeads]);

  const locationDistribution = useMemo(() => {
    return calculateLocationDistribution(filteredLeads);
  }, [filteredLeads]);

  const scoreDistribution = useMemo(() => {
    return calculateScoreDistribution(filteredLeads);
  }, [filteredLeads]);

  const pipeline3DData = useMemo(() => {
    return calculate3DPipelineData(filteredLeads);
  }, [filteredLeads]);

  const statusDistribution = useMemo(() => {
    return calculateStatusDistribution(filteredLeads);
  }, [filteredLeads]);

  const channelPerformance = useMemo(() => {
    return calculateChannelPerformance(filteredLeads);
  }, [filteredLeads]);

  // Filter acquisition channels by search term
  const filteredChannels = useMemo(() => {
    const term = channelSearch.trim().toLowerCase();
    if (!term) return channelPerformance;
    return channelPerformance.filter(s =>
      s.source.toLowerCase().includes(term) || s.quality.toLowerCase().includes(term)
    );
  }, [channelPerformance, channelSearch]);

  // Handle date range change
  const handleRangeChange = (rangeKey, label) => {
    setIsLoading(true);
    setDateRange(rangeKey);
    setTimeout(() => {
      setIsLoading(false);
      addToast(`Analytics updated for ${label}`, 'info');
    }, 200);
  };

  // Reset all filters to default
  const handleResetFilters = () => {
    setDateRange('30days');
    setSelectedStatus('All');
    setSelectedService('All');
    setSelectedLocation('All');
    setSelectedCity(null);
    setChannelSearch('');
    addToast('All filters reset to default 30-day view', 'info');
  };

  const hasActiveFilters = dateRange !== '30days' ||
    selectedStatus !== 'All' ||
    selectedService !== 'All' ||
    selectedLocation !== 'All' ||
    selectedCity !== null;

  // Export Active Leads & Analytics to Excel (.xlsx)
  const handleExportExcel = () => {
    if (isExporting) return;
    if (!filteredLeads || filteredLeads.length === 0) {
      addToast('No lead records match the active filters. Adjust filters before exporting.', 'error');
      return;
    }

    setIsExporting(true);
    try {
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `PRCBO_LeadGen_Report_${dateRange}_${dateStr}.xlsx`;
      const filterSummary = {
        dateRangeLabel: dateRange === 'all' ? 'All Time' : dateRange,
        status: selectedStatus,
        service: selectedService,
        location: selectedLocation,
        selectedCity
      };

      exportToExcel(filteredLeads, kpiMetrics, filterSummary, filename);
      setShowExportModal(false);
      addToast(`Excel report downloaded successfully (${filteredLeads.length} leads included)`, 'success');
    } catch (err) {
      console.error('Failed to export Excel report:', err);
      addToast(`Excel export failed: ${err.message || 'Unknown error'}`, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Export Active Leads & Analytics to PDF (.pdf)
  const handleExportPDF = () => {
    if (isExporting) return;
    if (!filteredLeads || filteredLeads.length === 0) {
      addToast('No lead records match the active filters. Adjust filters before exporting.', 'error');
      return;
    }

    setIsExporting(true);
    try {
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `PRCBO_LeadGen_Report_${dateRange}_${dateStr}.pdf`;
      const filterSummary = {
        dateRangeLabel: dateRange === 'all' ? 'All Time' : dateRange,
        status: selectedStatus,
        service: selectedService,
        location: selectedLocation,
        selectedCity
      };

      exportToPDF(filteredLeads, kpiMetrics, filterSummary, filename);
      setShowExportModal(false);
      addToast(`Executive PDF report downloaded successfully (${filteredLeads.length} leads included)`, 'success');
    } catch (err) {
      console.error('Failed to export PDF report:', err);
      addToast(`PDF export failed: ${err.message || 'Unknown error'}`, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 8px',
                borderRadius: '6px',
                backgroundColor: 'rgba(255, 122, 0, 0.1)',
                color: 'var(--color-primary)',
                fontSize: '0.6875rem',
                fontWeight: 700,
                letterSpacing: '0.08em'
              }}
            >
              <Sparkles size={12} /> LIVE PIPELINE TELEMETRY
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.75rem',
                color: isDatabaseConnected ? '#059669' : '#D97706',
                backgroundColor: isDatabaseConnected ? '#ECFDF5' : '#FEF3C7',
                padding: '2px 8px',
                borderRadius: '6px',
                fontWeight: 600
              }}
            >
              <Database size={11} /> {uniqueLeads.length} {isDatabaseConnected ? 'Supabase PostgreSQL Records' : 'Local Session Records'}
            </span>
          </div>
          <h1 className="page-header-title">Executive Analytics & Pipeline Intelligence</h1>
          <p className="page-header-subtitle">
            Dynamic telemetry calculated from active application leads, 3D pipeline velocity, conversion funnels, and vertical demand.
          </p>
        </div>

        <div className="page-header-actions" style={{ flexWrap: 'wrap', gap: '0.625rem' }}>
          {/* Date Range Selector */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'var(--color-slate-100)',
              padding: '3px',
              borderRadius: '8px',
              border: '1px solid var(--color-slate-200)'
            }}
          >
            {[
              { id: 'today', label: 'Today' },
              { id: '7days', label: '7 Days' },
              { id: '30days', label: '30 Days' },
              { id: '90days', label: '90 Days' },
              { id: 'all', label: 'All Time' },
              { id: 'custom', label: 'Custom' }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'custom') {
                    setShowCustomDateModal(true);
                  } else {
                    handleRangeChange(item.id, item.label);
                  }
                }}
                style={{
                  padding: '0.4rem 0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  borderRadius: '6px',
                  backgroundColor: dateRange === item.id ? '#FFFFFF' : 'transparent',
                  color: dateRange === item.id ? 'var(--color-slate-900)' : 'var(--color-slate-600)',
                  boxShadow: dateRange === item.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Quick Refresh Button */}
          <button
            className="btn btn-secondary"
            onClick={() => handleRangeChange(dateRange, 'Refreshed metrics')}
            title="Refresh live analytics telemetry"
            style={{ padding: '0.45rem 0.75rem' }}
          >
            <RefreshCw size={14} className={isLoading ? 'spin-animation' : ''} />
          </button>

          {/* Export Report Action */}
          <button className="btn btn-primary" onClick={() => setShowExportModal(true)}>
            <Download size={14} /> Export Report
          </button>
        </div>
      </div>

      {/* Database Error Banner */}
      {databaseError && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '0.75rem 1rem',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: '10px',
            fontSize: '0.8125rem',
            color: '#991B1B'
          }}
        >
          <AlertCircle size={16} style={{ color: '#DC2626', flexShrink: 0 }} />
          <span>
            <strong>Supabase Persistence Notice:</strong> {databaseError}
          </span>
        </div>
      )}

      {/* Persistence & Data Integrity Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          padding: '0.875rem 1.25rem',
          borderRadius: '10px',
          backgroundColor: '#F8FAFC',
          border: '1px solid var(--color-slate-200)',
          fontSize: '0.75rem',
          color: 'var(--color-slate-600)',
          lineHeight: 1.5
        }}
      >
        <Info size={18} style={{ color: 'var(--color-primary)', flexShrink: 0, marginTop: '2px' }} />
        <div style={{ flex: 1 }}>
          <strong style={{ color: 'var(--color-slate-900)' }}>Telemetry Data Source: </strong>
          Analytics metrics and charts compute in real-time from {isDatabaseConnected ? 'persistent Supabase PostgreSQL leads' : 'active application state'}.
          Additions via <strong>Business Discovery</strong> and CRM status edits immediately update all telemetry.
        </div>
      </div>

      {/* Filter Control Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.875rem',
          padding: '0.875rem 1.25rem',
          borderRadius: '10px',
          backgroundColor: '#FFFFFF',
          border: '1px solid var(--color-slate-200)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-slate-700)' }}>
            <Filter size={14} style={{ color: 'var(--color-primary)' }} />
            <span>Filters:</span>
          </div>

          {/* Status Filter Dropdown */}
          <select
            className="custom-select"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
          >
            <option value="All">All Statuses ({uniqueLeads.length})</option>
            <option value="New">New</option>
            <option value="Contacted">Contacted</option>
            <option value="Follow-up">Follow-up</option>
            <option value="Converted">Converted</option>
            <option value="Rejected">Rejected</option>
          </select>

          {/* Service Vertical Filter Dropdown */}
          <select
            className="custom-select"
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
            style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
          >
            <option value="All">All Services</option>
            <option value="Web Development">Web Development</option>
            <option value="AI Development">AI Development</option>
            <option value="IoT Solutions">IoT Solutions</option>
            <option value="UI/UX Design">UI/UX Design</option>
            <option value="Digital Marketing">Digital Marketing</option>
            <option value="Graphic Design">Graphic Design</option>
          </select>

          {/* Location Filter Dropdown */}
          <select
            className="custom-select"
            value={selectedLocation}
            onChange={(e) => {
              setSelectedLocation(e.target.value);
              setSelectedCity(null);
            }}
            style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
          >
            <option value="All">All Locations</option>
            <option value="Madurai">Madurai</option>
            <option value="Chennai">Chennai</option>
            <option value="Coimbatore">Coimbatore</option>
            <option value="Trichy">Trichy</option>
            <option value="Bengaluru">Bengaluru</option>
            <option value="Hyderabad">Hyderabad</option>
          </select>

          {/* Selected City Pill from LocationDemandChart */}
          {selectedCity && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '0.25rem 0.6rem',
                borderRadius: '6px',
                backgroundColor: 'var(--color-primary-light)',
                color: 'var(--color-primary)',
                fontSize: '0.6875rem',
                fontWeight: 600,
                border: '1px solid var(--color-primary-border)'
              }}
            >
              City: {selectedCity}
              <button
                onClick={() => setSelectedCity(null)}
                style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', display: 'flex' }}
                title="Remove city filter"
              >
                <X size={12} />
              </button>
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)' }}>
            Showing <strong>{filteredLeads.length}</strong> of <strong>{uniqueLeads.length}</strong> leads
          </span>

          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '0.3rem 0.6rem',
                borderRadius: '6px',
                backgroundColor: 'var(--color-slate-100)',
                color: 'var(--color-slate-700)',
                fontSize: '0.6875rem',
                fontWeight: 600,
                border: '1px solid var(--color-slate-300)',
                cursor: 'pointer'
              }}
            >
              <RotateCcw size={11} /> Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Loading Skeleton / Live Content */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', opacity: 0.7 }}>
          <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))' }}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
              <div key={n} className="card skeleton-shimmer" style={{ height: '110px' }} />
            ))}
          </div>
          <div className="card skeleton-shimmer" style={{ height: '340px' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
            <div className="card skeleton-shimmer" style={{ height: '320px' }} />
            <div className="card skeleton-shimmer" style={{ height: '320px' }} />
          </div>
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="card" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
          <EmptyState
            title="No leads match the current filters"
            description={`No lead records were found for date range "${dateRange}", status "${selectedStatus}", and service "${selectedService}". Try clearing filters to review the full pipeline.`}
            actionLabel="Reset All Filters"
            onAction={handleResetFilters}
          />
        </div>
      ) : (
        <>
          {/* Analytics KPI Row - 8 Key Performance Metrics Calculated from Actual Leads */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1rem'
            }}
          >
            {/* 1. Total Leads */}
            <StatCard
              label="Total Leads"
              value={kpiMetrics.totalLeads.toLocaleString()}
              change={`of ${uniqueLeads.length}`}
              positive={true}
              comparison="active in session"
              icon={Users}
              iconColor="#FF7A00"
              iconBg="#FFF7ED"
            />

            {/* 2. New Leads */}
            <StatCard
              label="New Leads"
              value={kpiMetrics.newLeads.toLocaleString()}
              change={`${Math.round(kpiMetrics.totalLeads > 0 ? (kpiMetrics.newLeads / kpiMetrics.totalLeads) * 100 : 0)}%`}
              positive={true}
              comparison="awaiting SDR triage"
              icon={Sparkles}
              iconColor="#3B82F6"
              iconBg="#EFF6FF"
            />

            {/* 3. Hot Leads */}
            <StatCard
              label="Hot Leads"
              value={kpiMetrics.hotLeads.toLocaleString()}
              change={`${Math.round(kpiMetrics.totalLeads > 0 ? (kpiMetrics.hotLeads / kpiMetrics.totalLeads) * 100 : 0)}%`}
              positive={true}
              comparison="score ≥ 80 or HOT tier"
              icon={Flame}
              iconColor="#EA580C"
              iconBg="#FFEDD5"
            />

            {/* 4. Contacted Leads */}
            <StatCard
              label="Contacted Leads"
              value={kpiMetrics.contactedLeads.toLocaleString()}
              change={`${Math.round(kpiMetrics.totalLeads > 0 ? (kpiMetrics.contactedLeads / kpiMetrics.totalLeads) * 100 : 0)}%`}
              positive={true}
              comparison="outreach dispatched"
              icon={TrendingUp}
              iconColor="#8B5CF6"
              iconBg="#F5F3FF"
            />

            {/* 5. Converted Leads */}
            <StatCard
              label="Converted Leads"
              value={kpiMetrics.convertedLeads.toLocaleString()}
              change={`${kpiMetrics.convertedLeads > 0 ? `+${kpiMetrics.convertedLeads}` : '0'}`}
              positive={true}
              comparison="closed won contracts"
              icon={CheckCircle2}
              iconColor="#10B981"
              iconBg="#ECFDF5"
            />

            {/* 6. Rejected Leads */}
            <StatCard
              label="Rejected Leads"
              value={kpiMetrics.rejectedLeads.toLocaleString()}
              change={`${Math.round(kpiMetrics.totalLeads > 0 ? (kpiMetrics.rejectedLeads / kpiMetrics.totalLeads) * 100 : 0)}%`}
              positive={false}
              comparison="unqualified / archived"
              icon={X}
              iconColor="#EF4444"
              iconBg="#FEF2F2"
            />

            {/* 7. Conversion Rate */}
            <StatCard
              label="Conversion Rate"
              value={kpiMetrics.conversionRate}
              change={`${kpiMetrics.convertedLeads}/${kpiMetrics.totalLeads}`}
              positive={kpiMetrics.conversionRateNum >= 10}
              comparison="win rate in scope"
              icon={Percent}
              iconColor="#10B981"
              iconBg="#ECFDF5"
            />

            {/* 8. Average AI Score */}
            <StatCard
              label="Average AI Score"
              value={kpiMetrics.avgAiScore !== 'N/A' ? `${kpiMetrics.avgAiScore} / 100` : 'Pending'}
              change={`${kpiMetrics.validScoresCount} scored`}
              positive={Number(kpiMetrics.avgAiScore) >= 75}
              comparison={kpiMetrics.unscoredCount > 0 ? `${kpiMetrics.unscoredCount} pending scan` : 'valid scores only'}
              icon={Sparkles}
              iconColor="#FF7A00"
              iconBg="#FFF7ED"
            />
          </div>

          {/* Featured: 3D Depth Pipeline Matrix */}
          <ChartCard
            title="3D Pipeline Value & Deal Velocity Matrix"
            subtitle="Isometric depth visualization of live lead volume and estimated capital value at each pipeline progression stage"
          >
            <DepthPillar3DChart data={pipeline3DData} height={260} />
          </ChartCard>

          {/* Primary Trend & Conversion Funnel Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
            <ChartCard
              title="Lead Volume Growth Trajectory"
              subtitle="Cumulative progression of total leads, HOT tier, and closed won deals across time"
            >
              <LineTrendChart data={growthTrend} height={240} />
            </ChartCard>

            <ChartCard
              title="Conversion Funnel & Drop-Off Retention"
              subtitle="Progression retention from discovery through qualification, outreach, and closed deals"
            >
              <ConversionFunnelChart data={funnelData} />
            </ChartCard>
          </div>

          {/* AI Score Distribution & PRCBO Vertical Performance */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
            <ChartCard
              title="AI Lead Score Distribution"
              subtitle="Score brackets from rule-based and AI qualification with HOT threshold (80+)"
            >
              <ScoreHistogramChart data={scoreDistribution} height={180} />
            </ChartCard>

            <ChartCard
              title="PRCBO Service Vertical Demand"
              subtitle="Distribution of active leads, HOT prospects, and estimated benchmark deal sizes per vertical"
            >
              <BarServiceChart data={serviceDistribution} />
            </ChartCard>
          </div>

          {/* Geographic Hub Traction & Status Distribution */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
            <ChartCard
              title="Geographic Hub Performance"
              subtitle="Regional lead volume, hot prospect counts, and average AI scores (click city to filter)"
              action={
                selectedCity && (
                  <button
                    onClick={() => setSelectedCity(null)}
                    style={{ fontSize: '0.6875rem', color: 'var(--color-primary)', fontWeight: 600, cursor: 'pointer', background: 'none', border: 'none' }}
                  >
                    Clear Filter ({selectedCity})
                  </button>
                )
              }
            >
              <LocationDemandChart
                data={locationDistribution}
                selectedCity={selectedCity}
                onSelectLocation={(city) => {
                  setSelectedCity(selectedCity === city ? null : city);
                  addToast(selectedCity === city ? 'Cleared regional filter' : `Filtered analytics to ${city}`, 'info');
                }}
              />
            </ChartCard>

            <ChartCard
              title="Pipeline Stage Status Distribution"
              subtitle="Current operational lead state across active SDR and engineering queues"
            >
              <DonutStatusChart data={statusDistribution} size={200} />
            </ChartCard>
          </div>

          {/* Acquisition Channel Performance Table */}
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
                  Lead Acquisition Channel Effectiveness
                </h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-slate-500)', marginTop: '2px' }}>
                  Comparison of lead volume, quality scores and conversion rates computed by source
                </p>
              </div>

              {/* Table search filter */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: 'var(--color-slate-100)',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-slate-200)',
                  width: '240px'
                }}
              >
                <Search size={14} style={{ color: 'var(--color-slate-400)' }} />
                <input
                  type="text"
                  placeholder="Filter channels..."
                  value={channelSearch}
                  onChange={(e) => setChannelSearch(e.target.value)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    outline: 'none',
                    fontSize: '0.75rem',
                    width: '100%',
                    color: 'var(--color-slate-800)'
                  }}
                />
                {channelSearch && (
                  <button onClick={() => setChannelSearch('')} style={{ background: 'none', border: 'none', color: 'var(--color-slate-400)', cursor: 'pointer' }}>
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

            {filteredChannels.length === 0 ? (
              <EmptyState
                title="No matching acquisition channels"
                description={`No channels matched "${channelSearch}". Try adjusting your search query.`}
                actionLabel="Clear Search"
                onAction={() => setChannelSearch('')}
              />
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Acquisition Channel</th>
                      <th>Volume Captured</th>
                      <th>Average AI Score</th>
                      <th>Conversion Rate</th>
                      <th>Quality Rating</th>
                      <th style={{ textAlign: 'right' }}>ROI Benchmark</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredChannels.map((src) => (
                      <tr key={src.source}>
                        <td>
                          <strong style={{ color: 'var(--color-slate-900)' }}>{src.source}</strong>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, color: 'var(--color-slate-700)' }}>
                            {src.count.toLocaleString()} {src.count === 1 ? 'lead' : 'leads'}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                            {src.avgScore} / 100
                          </span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, color: '#10B981' }}>{src.conversionRate}</span>
                        </td>
                        <td>
                          <span
                            className="badge"
                            style={{
                              backgroundColor: src.quality === 'High Yield' ? '#ECFDF5' : '#F1F5F9',
                              color: src.quality === 'High Yield' ? '#065F46' : '#475569'
                            }}
                          >
                            {src.quality}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span style={{ fontWeight: 700, color: 'var(--color-slate-900)' }}>
                            {src.roiIndex}
                          </span>
                          <span style={{ fontSize: '0.625rem', color: 'var(--color-slate-400)', display: 'block' }}>
                            (est.)
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Export Report Modal */}
      {showExportModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
            backdropFilter: 'blur(4px)'
          }}
          onClick={() => setShowExportModal(false)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '14px',
              padding: '1.75rem',
              maxWidth: '460px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: 36, height: 36, borderRadius: '8px', backgroundColor: '#FFF7ED', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Download size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-slate-900)' }}>
                    Export Executive Report
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)' }}>
                    Download live data calculated from {filteredLeads.length} active leads
                  </p>
                </div>
              </div>
              <button onClick={() => setShowExportModal(false)} style={{ background: 'none', border: 'none', color: 'var(--color-slate-400)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', margin: '1.25rem 0' }}>
              <button
                onClick={handleExportExcel}
                disabled={isExporting}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem',
                  borderRadius: '10px',
                  border: '1px solid var(--color-slate-200)',
                  backgroundColor: isExporting ? 'var(--color-slate-50)' : '#FFFFFF',
                  cursor: isExporting ? 'not-allowed' : 'pointer',
                  opacity: isExporting ? 0.7 : 1,
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <FileSpreadsheet size={24} style={{ color: '#10B981' }} />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-slate-900)' }}>
                      Excel Workbook (.xlsx)
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)' }}>
                      Multi-sheet workbook with KPI summary & all {filteredLeads.length} lead records
                    </div>
                  </div>
                </div>
                <ArrowUpRight size={16} style={{ color: 'var(--color-slate-400)' }} />
              </button>

              <button
                onClick={handleExportPDF}
                disabled={isExporting}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem',
                  borderRadius: '10px',
                  border: '1px solid var(--color-slate-200)',
                  backgroundColor: isExporting ? 'var(--color-slate-50)' : '#FFFFFF',
                  cursor: isExporting ? 'not-allowed' : 'pointer',
                  opacity: isExporting ? 0.7 : 1,
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <FileText size={24} style={{ color: '#FF7A00' }} />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-slate-900)' }}>
                      Executive PDF Report (.pdf)
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)' }}>
                      Multi-page executive brief with KPI cards & formatted lead table
                    </div>
                  </div>
                </div>
                <ArrowUpRight size={16} style={{ color: 'var(--color-slate-400)' }} />
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
              <button className="btn btn-secondary" onClick={() => setShowExportModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Date Filter Modal */}
      {showCustomDateModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
            backdropFilter: 'blur(4px)'
          }}
          onClick={() => setShowCustomDateModal(false)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '14px',
              padding: '1.75rem',
              maxWidth: '420px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-slate-900)' }}>
                Custom Date Range
              </h3>
              <button onClick={() => setShowCustomDateModal(false)} style={{ background: 'none', border: 'none', color: 'var(--color-slate-400)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', margin: '1rem 0' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-slate-700)', marginBottom: '4px' }}>
                  Start Date
                </label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1px solid var(--color-slate-300)',
                    fontSize: '0.8125rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-slate-700)', marginBottom: '4px' }}>
                  End Date
                </label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1px solid var(--color-slate-300)',
                    fontSize: '0.8125rem'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
              <button className="btn btn-secondary" onClick={() => setShowCustomDateModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setShowCustomDateModal(false);
                  handleRangeChange('custom', `${customStartDate} to ${customEndDate}`);
                }}
              >
                Apply Custom Range
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;
