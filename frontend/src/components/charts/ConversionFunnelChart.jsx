import React, { useState } from 'react';
import { ArrowDownRight, CheckCircle2, Clock, Users, ChevronRight, Activity } from 'lucide-react';
import { mockFunnelData } from '../../data/mockAnalytics';

export const ConversionFunnelChart = ({ data = mockFunnelData }) => {
  const [hoveredStage, setHoveredStage] = useState(null);

  if (!data || data.length === 0) return null;

  const initialCount = data[0].count;
  const finalCount = data[data.length - 1].count;
  const yieldPct = initialCount > 0 ? ((finalCount / initialCount) * 100).toFixed(1) : '0.0';

  let topDropStage = 'None';
  let maxDrop = -1;
  data.forEach((st, idx) => {
    if (idx > 0 && typeof st.dropPct === 'number' && st.dropPct > maxDrop) {
      maxDrop = st.dropPct;
      topDropStage = `${st.stage} (-${st.dropPct}%)`;
    }
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', width: '100%' }}>
      {/* Funnel Overview Summary Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '0.5rem',
          padding: '0.75rem',
          borderRadius: '8px',
          backgroundColor: 'var(--color-slate-50)',
          border: '1px solid var(--color-slate-200)',
          fontSize: '0.75rem'
        }}
      >
        <div>
          <span style={{ color: 'var(--color-slate-400)', display: 'block', fontSize: '0.6875rem' }}>Full Funnel Yield</span>
          <strong style={{ fontSize: '0.9375rem', color: '#10B981', fontWeight: 700 }}>
            {yieldPct}%
          </strong>
        </div>
        <div>
          <span style={{ color: 'var(--color-slate-400)', display: 'block', fontSize: '0.6875rem' }}>Top Dropoff Stage</span>
          <strong style={{ fontSize: '0.8125rem', color: '#EF4444', fontWeight: 600 }}>{topDropStage}</strong>
        </div>
        <div>
          <span style={{ color: 'var(--color-slate-400)', display: 'block', fontSize: '0.6875rem' }}>Average Cycle Time</span>
          <strong style={{ fontSize: '0.8125rem', color: 'var(--color-slate-800)', fontWeight: 600 }}>16.2 Days</strong>
        </div>
        <div>
          <span style={{ color: 'var(--color-slate-400)', display: 'block', fontSize: '0.6875rem' }}>Avg Qualified Deal</span>
          <strong style={{ fontSize: '0.8125rem', color: 'var(--color-primary)', fontWeight: 700 }}>₹1.85 Lakh</strong>
        </div>
      </div>

      {/* Cascading Funnel Ribbons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginTop: '0.25rem' }}>
        {data.map((stage, idx) => {
          const isHovered = hoveredStage === idx;
          const isFinal = idx === data.length - 1;
          const widthPct = Math.max(stage.pct, 12);
          const dropFromPrev = idx > 0 ? (data[idx - 1].count - stage.count) : 0;
          const stepRetention = idx > 0 ? Math.round((stage.count / data[idx - 1].count) * 100) : 100;

          return (
            <div
              key={stage.stage}
              onMouseEnter={() => setHoveredStage(idx)}
              onMouseLeave={() => setHoveredStage(null)}
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                backgroundColor: isHovered ? 'var(--color-slate-100)' : 'transparent',
                transition: 'background-color 0.15s ease',
                cursor: 'pointer'
              }}
            >
              {/* Stage Step Indicator */}
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  backgroundColor: stage.color,
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  flexShrink: 0,
                  boxShadow: isHovered ? `0 0 10px ${stage.color}80` : 'none'
                }}
              >
                {isFinal ? <CheckCircle2 size={14} /> : idx + 1}
              </div>

              {/* Stage Bar Body */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-slate-900)' }}>
                      {stage.stage}
                    </span>
                    <span
                      style={{
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        color: stage.color,
                        backgroundColor: `${stage.color}15`,
                        padding: '1px 6px',
                        borderRadius: '4px'
                      }}
                    >
                      {stage.pct}%
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {idx > 0 && (
                      <span style={{ fontSize: '0.6875rem', color: '#EF4444', fontWeight: 500 }}>
                        -{stage.dropPct}% drop
                      </span>
                    )}
                    <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-slate-900)' }}>
                      {stage.count.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Progress Ribbon with Depth Shadow */}
                <div
                  style={{
                    height: '10px',
                    backgroundColor: 'var(--color-slate-100)',
                    borderRadius: '5px',
                    overflow: 'hidden',
                    position: 'relative'
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${widthPct}%`,
                      background: `linear-gradient(90deg, ${stage.color} 0%, ${stage.color}CC 100%)`,
                      borderRadius: '5px',
                      transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: isHovered ? `0 0 8px ${stage.color}` : 'none'
                    }}
                  />
                </div>

                {/* Description & Duration subtitle */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: '3px',
                    fontSize: '0.6875rem',
                    color: 'var(--color-slate-400)'
                  }}
                >
                  <span>{stage.desc}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: 'var(--color-slate-500)' }}>
                    <Clock size={10} /> {stage.duration}
                  </span>
                </div>
              </div>

              {/* Hover stage card tooltip */}
              {isHovered && (
                <div
                  style={{
                    position: 'absolute',
                    right: '1rem',
                    top: '-34px',
                    backgroundColor: '#0F172A',
                    color: '#FFFFFF',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    fontSize: '0.6875rem',
                    zIndex: 25,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                    pointerEvents: 'none',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Stage retention: <strong>{stepRetention}%</strong> ({dropFromPrev > 0 ? `${dropFromPrev} dropped` : 'entry stage'})
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ConversionFunnelChart;
