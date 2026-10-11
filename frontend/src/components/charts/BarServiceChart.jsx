import React, { useState } from 'react';
import { mockServiceDistribution } from '../../data/mockAnalytics';

export const BarServiceChart = ({ data = mockServiceDistribution }) => {
  const [hoveredService, setHoveredService] = useState(null);

  if (!data || data.length === 0) return null;

  const maxVal = Math.max(...data.map(d => d.leads || 0), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', width: '100%' }}>
      {data.map((item) => {
        const totalPct = (item.leads / maxVal) * 100;
        const hotRatio = item.leads > 0 ? (item.hot / item.leads) * 100 : 0;
        const isHovered = hoveredService === item.service;

        return (
          <div
            key={item.service}
            onMouseEnter={() => setHoveredService(item.service)}
            onMouseLeave={() => setHoveredService(null)}
            style={{
              padding: '0.5rem 0.625rem',
              borderRadius: '8px',
              backgroundColor: isHovered ? 'var(--color-slate-50)' : 'transparent',
              border: isHovered ? '1px solid var(--color-slate-200)' : '1px solid transparent',
              transition: 'all 0.15s ease',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.8125rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 600, color: 'var(--color-slate-900)' }}>{item.service}</span>
                {item.growth && (
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      color: '#10B981',
                      backgroundColor: '#ECFDF5',
                      padding: '0.1rem 0.4rem',
                      borderRadius: '4px'
                    }}
                  >
                    {item.growth}
                  </span>
                )}
                {item.avgDeal && (
                  <span style={{ fontSize: '0.6875rem', color: 'var(--color-slate-500)', fontWeight: 500 }}>
                    Avg {item.avgDeal}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: 'var(--color-slate-500)', fontSize: '0.75rem' }}>
                  <strong style={{ color: 'var(--color-primary)' }}>{item.hot}</strong> hot ({Math.round(hotRatio)}%)
                </span>
                <span style={{ fontWeight: 700, color: 'var(--color-slate-900)' }}>
                  {item.leads} leads
                </span>
              </div>
            </div>

            {/* Track */}
            <div
              style={{
                height: '9px',
                backgroundColor: 'var(--color-slate-100)',
                borderRadius: '5px',
                overflow: 'hidden',
                position: 'relative'
              }}
            >
              {/* Total volume bar */}
              <div
                style={{
                  height: '100%',
                  width: `${totalPct}%`,
                  backgroundColor: item.color || 'var(--color-primary)',
                  borderRadius: '5px',
                  transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: isHovered ? `0 0 8px ${item.color}80` : 'none',
                  position: 'relative'
                }}
              >
                {/* Hot leads highlight within bar */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: 0,
                    width: `${hotRatio}%`,
                    backgroundColor: 'rgba(255, 255, 255, 0.35)',
                    borderRadius: '5px 0 0 5px'
                  }}
                  title={`${item.hot} hot leads`}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default BarServiceChart;
