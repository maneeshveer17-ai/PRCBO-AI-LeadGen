import React, { useState } from 'react';
import { MapPin, Navigation, TrendingUp } from 'lucide-react';
import { mockLocationDistribution } from '../../data/mockAnalytics';

export const LocationDemandChart = ({ data = mockLocationDistribution, onSelectLocation, selectedCity }) => {
  const [hoveredCity, setHoveredCity] = useState(null);

  if (!data || data.length === 0) return null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.875rem', width: '100%' }}>
      {data.map((item) => {
        const isSelected = selectedCity === item.city;
        const isHovered = hoveredCity === item.city;

        return (
          <div
            key={item.city}
            onMouseEnter={() => setHoveredCity(item.city)}
            onMouseLeave={() => setHoveredCity(null)}
            onClick={() => onSelectLocation && onSelectLocation(item.city)}
            style={{
              padding: '1rem',
              borderRadius: '10px',
              backgroundColor: isSelected ? 'var(--color-primary-light)' : 'var(--color-slate-50)',
              border: isSelected
                ? '1px solid var(--color-primary)'
                : isHovered
                ? '1px solid var(--color-slate-300)'
                : '1px solid var(--color-slate-200)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              cursor: onSelectLocation ? 'pointer' : 'default',
              transition: 'all 0.18s ease',
              boxShadow: isHovered ? '0 4px 12px rgba(15,23,42,0.06)' : 'none',
              transform: isHovered ? 'translateY(-2px)' : 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MapPin size={14} style={{ color: isSelected ? 'var(--color-primary)' : 'var(--color-slate-600)' }} />
                <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-slate-900)' }}>
                  {item.city}
                </span>
              </div>
              <span style={{ fontSize: '0.6875rem', color: 'var(--color-slate-400)', fontWeight: 500 }}>
                {item.state}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'var(--font-family-display)', color: 'var(--color-slate-900)' }}>
                {item.leads}
              </span>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-primary)' }}>
                {item.hot} hot ({item.pct}%)
              </span>
            </div>

            {/* Mini progress bar */}
            <div style={{ height: '5px', backgroundColor: 'var(--color-slate-200)', borderRadius: '3px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${Math.min(item.pct * 3.2, 100)}%`,
                  backgroundColor: isSelected ? 'var(--color-primary)' : '#0F172A',
                  borderRadius: '3px',
                  transition: 'width 0.4s ease'
                }}
              />
            </div>

            {/* Sub-metrics footer */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.6875rem', color: 'var(--color-slate-500)', marginTop: '2px' }}>
              <span>Avg Score: <strong style={{ color: 'var(--color-slate-700)' }}>{item.avgScore || 85}</strong></span>
              <span>Velocity: <strong style={{ color: '#10B981' }}>{item.velocity || '3.2d'}</strong></span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default LocationDemandChart;
