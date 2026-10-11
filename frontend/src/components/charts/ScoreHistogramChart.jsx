import React, { useState } from 'react';
import { Sparkles, ShieldCheck } from 'lucide-react';
import { mockScoreDistribution } from '../../data/mockAnalytics';

export const ScoreHistogramChart = ({ data = mockScoreDistribution, height = 190 }) => {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  if (!data || data.length === 0) return null;

  const totalCount = data.reduce((acc, curr) => acc + curr.count, 0);
  const maxVal = Math.max(...data.map(d => d.count || 0), 1);
  const highHotCount = (data[3]?.count || 0) + (data[4]?.count || 0);
  const highHotPct = totalCount > 0 ? ((highHotCount / totalCount) * 100).toFixed(1) : '0.0';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', width: '100%', userSelect: 'none' }}>
      {/* Top summary row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.75rem',
          color: 'var(--color-slate-500)',
          borderBottom: '1px solid var(--color-slate-100)',
          paddingBottom: '0.5rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Sparkles size={13} style={{ color: 'var(--color-primary)' }} />
          <span>Scoring Engine: <strong>Rule + LLM Hybrid</strong></span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>High + Hot Tier: <strong style={{ color: '#10B981' }}>{highHotPct}%</strong></span>
          <span style={{ color: 'var(--color-slate-300)' }}>•</span>
          <span>Sample Size: <strong>{totalCount.toLocaleString()}</strong></span>
        </div>
      </div>

      {/* Main Histogram Bars Area */}
      <div style={{ position: 'relative' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            height: `${height}px`,
            gap: '1rem',
            paddingBottom: '0.5rem',
            borderBottom: '1px solid var(--color-slate-200)',
            position: 'relative'
          }}
        >
          {/* HOT Lead Threshold Line at 80% mark */}
          <div
            style={{
              position: 'absolute',
              right: '18%',
              top: '10px',
              bottom: '0',
              borderLeft: '2px dashed #FF7A00',
              pointerEvents: 'none',
              zIndex: 5
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: '-4px',
                right: '4px',
                fontSize: '0.625rem',
                fontWeight: 700,
                color: '#FF7A00',
                backgroundColor: '#FFF7ED',
                padding: '1px 5px',
                borderRadius: '4px',
                whiteSpace: 'nowrap'
              }}
            >
              HOT 80+ CUTOFF
            </span>
          </div>

          {data.map((item, idx) => {
            const heightPct = (item.count / maxVal) * 100;
            const isHovered = hoveredIdx === idx;
            const sharePct = totalCount > 0 ? Math.round((item.count / totalCount) * 100) : 0;

            return (
              <div
                key={item.range}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  height: '100%',
                  justifyContent: 'flex-end',
                  cursor: 'pointer',
                  position: 'relative',
                  zIndex: 6
                }}
              >
                {/* Count and share tag */}
                <div
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: isHovered ? item.color : 'var(--color-slate-700)',
                    marginBottom: '4px',
                    transition: 'transform 0.15s ease',
                    transform: isHovered ? 'scale(1.12)' : 'scale(1)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                  }}
                >
                  <span>{item.count}</span>
                  <small style={{ fontSize: '0.625rem', color: 'var(--color-slate-400)', fontWeight: 500 }}>{sharePct}%</small>
                </div>

                {/* Histogram Bar */}
                <div
                  style={{
                    width: '100%',
                    maxWidth: '48px',
                    height: `${Math.max(heightPct, 6)}%`,
                    background: `linear-gradient(180deg, ${item.color} 0%, ${item.color}CC 100%)`,
                    borderRadius: '6px 6px 0 0',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    opacity: hoveredIdx !== null && !isHovered ? 0.45 : 1,
                    boxShadow: isHovered ? `0 -4px 14px ${item.color}70` : 'none',
                    transform: isHovered ? 'translateY(-3px)' : 'none'
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Floating Tooltip */}
        {hoveredIdx !== null && data[hoveredIdx] && (
          <div
            style={{
              position: 'absolute',
              top: '20px',
              left: `${((hoveredIdx + 0.5) / data.length) * 100}%`,
              transform: 'translateX(-50%)',
              backgroundColor: '#0F172A',
              color: '#FFFFFF',
              padding: '8px 12px',
              borderRadius: '8px',
              boxShadow: '0 8px 20px rgba(0,0,0,0.25)',
              fontSize: '0.75rem',
              pointerEvents: 'none',
              zIndex: 20,
              minWidth: '160px',
              border: `1px solid ${data[hoveredIdx].color}`
            }}
          >
            <div style={{ fontWeight: 700, color: data[hoveredIdx].color, marginBottom: '2px' }}>
              Tier: {data[hoveredIdx].label} ({data[hoveredIdx].range})
            </div>
            <div>Leads in Bracket: <strong>{data[hoveredIdx].count}</strong></div>
            <div>Share of Total: <strong>{Math.round((data[hoveredIdx].count / totalCount) * 100)}%</strong></div>
            {data[hoveredIdx].criteria && (
              <div style={{ color: '#94A3B8', fontSize: '0.6875rem', marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '3px' }}>
                {data[hoveredIdx].criteria}
              </div>
            )}
          </div>
        )}
      </div>

      {/* X Axis Labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
        {data.map((item) => (
          <div key={item.range} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-slate-800)' }}>
              {item.range}
            </div>
            <div
              style={{
                fontSize: '0.6875rem',
                color: 'var(--color-slate-400)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {item.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ScoreHistogramChart;
