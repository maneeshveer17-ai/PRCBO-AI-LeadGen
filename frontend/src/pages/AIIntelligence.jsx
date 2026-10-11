import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Brain,
  Sparkles,
  Flame,
  TrendingUp,
  Cpu,
  Layers,
  Globe,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Filter,
  BarChart2,
  Zap,
  Lightbulb,
  SlidersHorizontal
} from 'lucide-react';
import { useLeads } from '../context/LeadContext';
import StatCard from '../components/common/StatCard';
import ChartCard from '../components/common/ChartCard';
import ScoreHistogramChart from '../components/charts/ScoreHistogramChart';
import BarServiceChart from '../components/charts/BarServiceChart';
import {
  mockScoreDistribution,
  mockServiceDistribution,
  mockAiInsights
} from '../data/mockAnalytics';

export const AIIntelligence = () => {
  const navigate = useNavigate();
  const { leads, addToast } = useLeads();
  const [activeModelTab, setActiveModelTab] = useState('insights');

  // Compute metrics from active leads
  const total = leads.length;
  const avgScore = total > 0 ? Math.round(leads.reduce((a, b) => a + (b.aiScore || 0), 0) / total) : 84;
  const hotLeads = leads.filter(l => l.scoreTier === 'HOT').length;
  const highPotential = leads.filter(l => l.scoreTier === 'HIGH').length;
  const mediumPotential = leads.filter(l => l.scoreTier === 'MEDIUM').length;
  const lowPotential = leads.filter(l => l.scoreTier === 'LOW').length;

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '0.25rem 0.65rem', borderRadius: '9999px', backgroundColor: 'rgba(139, 92, 246, 0.1)', color: '#8B5CF6', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            <Brain size={14} /> Autonomous Evaluation Engine v2.4
          </div>
          <h1 className="page-header-title">AI Lead Intelligence</h1>
          <p className="page-header-subtitle">
            Autonomous lead scoring, intent qualification and algorithmic market demand insights.
          </p>
        </div>

        <div className="page-header-actions">
          <button
            className="btn btn-outline"
            onClick={() => addToast("Re-scoring algorithm queued across 2,486 records", "info")}
          >
            <Zap size={15} style={{ color: '#FF7A00' }} />
            Recalculate AI Scores
          </button>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/leads?view=hot')}
          >
            <Flame size={15} /> View All {hotLeads} Hot Leads
          </button>
        </div>
      </div>

      {/* Top AI Metric Cards */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <StatCard
          label="Average AI Score"
          value={`${avgScore}/100`}
          change="+3.4 pts"
          positive={true}
          comparison="vs previous batch"
          icon={Brain}
          iconColor="#8B5CF6"
          iconBg="#F5F3FF"
        />

        <StatCard
          label="Hot Leads (88+)"
          value={hotLeads.toString()}
          change="+24.2%"
          positive={true}
          comparison="high readiness"
          icon={Flame}
          iconColor="#FF7A00"
          iconBg="#FFF7ED"
        />

        <StatCard
          label="High Potential (70-87)"
          value={highPotential.toString()}
          change="+12.8%"
          positive={true}
          comparison="actionable leads"
          icon={Sparkles}
          iconColor="#10B981"
          iconBg="#ECFDF5"
        />

        <StatCard
          label="Medium (50-69)"
          value={mediumPotential.toString()}
          change="-4.1%"
          positive={true}
          comparison="nurture pipeline"
          icon={SlidersHorizontal}
          iconColor="#F59E0B"
          iconBg="#FFFBEB"
        />

        <StatCard
          label="Low Potential (<50)"
          value={lowPotential.toString()}
          change="-8.5%"
          positive={true}
          comparison="unqualified leads"
          icon={AlertTriangle}
          iconColor="#EF4444"
          iconBg="#FEF2F2"
        />
      </div>

      {/* AI Algorithmic Insights Section */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-slate-900)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lightbulb size={20} style={{ color: '#FF7A00' }} />
              Algorithmic Market Intelligence & Signals
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-slate-500)' }}>
              Real-time anomaly detection and strategic recommendations generated from current lead stream
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {mockAiInsights.map((insight) => {
            let borderColor = 'var(--color-primary)';
            let badgeBg = '#FFF7ED';
            let badgeColor = '#C2410C';

            if (insight.type === 'warning') {
              borderColor = '#EF4444';
              badgeBg = '#FEF2F2';
              badgeColor = '#B91C1C';
            } else if (insight.type === 'success') {
              borderColor = '#10B981';
              badgeBg = '#ECFDF5';
              badgeColor = '#047857';
            } else if (insight.type === 'info') {
              borderColor = '#3B82F6';
              badgeBg = '#EFF6FF';
              badgeColor = '#1D4ED8';
            }

            return (
              <div
                key={insight.id}
                className="card card-warm"
                style={{
                  borderLeft: `4px solid ${borderColor}`,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '4px', backgroundColor: badgeBg, color: badgeColor, textTransform: 'uppercase' }}>
                      {insight.tag}
                    </span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-slate-500)' }}>
                      {insight.impact}
                    </span>
                  </div>

                  <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-slate-900)', marginBottom: '0.5rem', lineHeight: 1.3 }}>
                    {insight.title}
                  </h4>

                  <p style={{ fontSize: '0.8125rem', color: 'var(--color-slate-600)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                    {insight.description}
                  </p>
                </div>

                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => {
                    if (insight.type === 'warning') navigate('/leads?view=new');
                    else if (insight.id === 'ins-4') navigate('/outreach');
                    else navigate('/leads');
                  }}
                  style={{ width: '100%', justifyContent: 'space-between' }}
                >
                  <span>{insight.action}</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Charts Grid: Score Distribution & Opportunity Categories */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Score Distribution */}
        <ChartCard
          title="Predictive Score Frequency Distribution"
          subtitle="Proportion of business leads categorized by qualification probability"
        >
          <ScoreHistogramChart data={mockScoreDistribution} height={200} />
        </ChartCard>

        {/* Opportunity Category Demand */}
        <ChartCard
          title="Service Demand Mapped to PRCBO Capabilities"
          subtitle="Lead volume by recommended technical architecture"
        >
          <BarServiceChart data={mockServiceDistribution} />
        </ChartCard>
      </div>

      {/* Scoring Weights & Model Architecture Preview */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <SlidersHorizontal size={18} style={{ color: 'var(--color-primary)' }} />
              Scoring Model Weight Distribution (PRCBO-Score-Net)
            </h3>
            <p className="card-subtitle">
              Configured feature weights for autonomous qualification of raw scraped business records
            </p>
          </div>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-slate-500)' }}>
            Status: Active Production Model
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
          {[
            { feature: 'Website Status & Mobile Speed', weight: '30%', desc: 'Absence of responsive portal or slow HTTP performance' },
            { feature: 'Google Maps Reviews & Footfall', weight: '25%', desc: 'Volume and star ratings indicating commercial vitality' },
            { feature: 'Industry Modernization Readiness', weight: '20%', desc: 'B2B manufacturing, cold chain, or healthcare profile' },
            { feature: 'Decision Maker Reachability', weight: '15%', desc: 'Direct mobile phone, email, or verified LinkedIn handle' },
            { feature: 'Geographic Strategic Clustering', weight: '10%', desc: 'Proximity to Madurai, Chennai, Coimbatore & Bengaluru' }
          ].map((item, idx) => (
            <div key={idx} style={{ padding: '1rem', backgroundColor: 'var(--color-slate-50)', borderRadius: '8px', border: '1px solid var(--color-slate-200)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-slate-900)' }}>{item.feature}</span>
                <span style={{ fontSize: '0.8125rem', fontWeight: 800, color: 'var(--color-primary)' }}>{item.weight}</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)', lineHeight: 1.4 }}>
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AIIntelligence;
