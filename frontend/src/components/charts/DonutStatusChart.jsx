import React, { useState } from 'react';

export const DonutStatusChart = ({ data, size = 200, strokeWidth = 26 }) => {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  if (!data || data.length === 0) return null;

  const total = data.reduce((acc, curr) => acc + curr.value, 0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedAngle = 0;
  const slices = data.map((item, idx) => {
    const pct = total > 0 ? item.value / total : 0;
    const strokeDasharray = `${pct * circumference} ${circumference}`;
    const strokeDashoffset = -accumulatedAngle * circumference;
    accumulatedAngle += pct;

    return {
      ...item,
      pct: Math.round(pct * 100),
      strokeDasharray,
      strokeDashoffset,
      idx
    };
  });

  const activeItem = hoveredIdx !== null ? slices[hoveredIdx] : null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem' }}>
      {/* SVG Donut */}
      <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
          {slices.map((slice) => {
            const isHovered = hoveredIdx === slice.idx;
            return (
              <circle
                key={slice.name}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke={slice.color}
                strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={slice.strokeDasharray}
                strokeDashoffset={slice.strokeDashoffset}
                style={{
                  cursor: 'pointer',
                  transition: 'stroke-width 0.2s ease, opacity 0.2s ease',
                  opacity: hoveredIdx !== null && !isHovered ? 0.6 : 1
                }}
                onMouseEnter={() => setHoveredIdx(slice.idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            );
          })}
        </svg>

        {/* Center Label */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            pointerEvents: 'none'
          }}
        >
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-slate-400)', textTransform: 'uppercase' }}>
            {activeItem ? activeItem.name : "Total Leads"}
          </span>
          <span style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-family-display)', color: 'var(--color-slate-900)', lineHeight: 1.1 }}>
            {activeItem ? activeItem.value : total.toLocaleString()}
          </span>
          <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: activeItem ? activeItem.color : 'var(--color-primary)' }}>
            {activeItem ? `${activeItem.pct}% share` : "100% Pipeline"}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div style={{ flex: 1, minWidth: '170px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {slices.map((slice) => {
          const isHovered = hoveredIdx === slice.idx;
          return (
            <div
              key={slice.name}
              onMouseEnter={() => setHoveredIdx(slice.idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.35rem 0.5rem',
                borderRadius: '6px',
                backgroundColor: isHovered ? 'var(--color-slate-100)' : 'transparent',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: 10, height: 10, borderRadius: '3px', backgroundColor: slice.color, flexShrink: 0 }} />
                <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-slate-700)' }}>{slice.name}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-slate-900)' }}>{slice.value}</span>
                <span style={{ fontSize: '0.6875rem', color: 'var(--color-slate-400)', minWidth: '28px', textAlign: 'right' }}>{slice.pct}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DonutStatusChart;
