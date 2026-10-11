import React, { useState } from 'react';

export const LineTrendChart = ({ data, height = 240 }) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [visibleSeries, setVisibleSeries] = useState({
    total: true,
    hot: true,
    converted: true
  });

  if (!data || data.length === 0) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-slate-400)', fontSize: '0.875rem' }}>
        No trend data available for current date filter
      </div>
    );
  }

  const padding = { top: 25, right: 25, bottom: 35, left: 40 };
  const width = 640; // SVG viewBox coordinate width
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const maxVal = Math.max(...data.map(d => d.leads || 0), 1);
  const minVal = 0;
  const range = (maxVal - minVal) || 1;

  // Calculate coordinates
  const points = data.map((d, index) => {
    const x = padding.left + (index / Math.max(data.length - 1, 1)) * plotWidth;
    const yTotal = padding.top + plotHeight - (((d.leads || 0) - minVal) / range) * plotHeight;
    const yHot = padding.top + plotHeight - (((d.hotLeads || 0) - minVal) / range) * plotHeight;
    const yConv = padding.top + plotHeight - (((d.converted || 0) - minVal) / range) * plotHeight;
    return { ...d, x, yTotal, yHot, yConv, index };
  });

  // Smooth SVG path generator
  const createPath = (pointsArray, yKey) => {
    return pointsArray.reduce((acc, p, i) => {
      if (i === 0) return `M ${p.x},${p[yKey]}`;
      const prev = pointsArray[i - 1];
      const cx1 = prev.x + (p.x - prev.x) / 2;
      const cy1 = prev[yKey];
      const cx2 = prev.x + (p.x - prev.x) / 2;
      const cy2 = p[yKey];
      return `${acc} C ${cx1},${cy1} ${cx2},${cy2} ${p.x},${p[yKey]}`;
    }, '');
  };

  const pathTotal = createPath(points, 'yTotal');
  const pathHot = createPath(points, 'yHot');
  const pathConv = createPath(points, 'yConv');

  const areaTotal = `${pathTotal} L ${points[points.length - 1].x},${height - padding.bottom} L ${points[0].x},${height - padding.bottom} Z`;

  const toggleSeries = (key) => {
    setVisibleSeries(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div style={{ position: 'relative', width: '100%', userSelect: 'none' }}>
      {/* Interactive Legend & Series Toggles */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '0.75rem',
          fontSize: '0.75rem'
        }}
      >
        <button
          onClick={() => toggleSeries('total')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            opacity: visibleSeries.total ? 1 : 0.4,
            cursor: 'pointer',
            background: 'none',
            border: 'none',
            padding: '2px 4px'
          }}
          title="Click to toggle Total Leads series"
        >
          <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#FF7A00' }}></span>
          <span style={{ color: 'var(--color-slate-700)', fontWeight: 600 }}>Total Ingested Leads</span>
        </button>

        <button
          onClick={() => toggleSeries('hot')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            opacity: visibleSeries.hot ? 1 : 0.4,
            cursor: 'pointer',
            background: 'none',
            border: 'none',
            padding: '2px 4px'
          }}
          title="Click to toggle Hot Leads series"
        >
          <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#8B5CF6' }}></span>
          <span style={{ color: 'var(--color-slate-700)', fontWeight: 600 }}>Hot Qualified</span>
        </button>

        <button
          onClick={() => toggleSeries('converted')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            opacity: visibleSeries.converted ? 1 : 0.4,
            cursor: 'pointer',
            background: 'none',
            border: 'none',
            padding: '2px 4px'
          }}
          title="Click to toggle Converted series"
        >
          <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#10B981' }}></span>
          <span style={{ color: 'var(--color-slate-700)', fontWeight: 600 }}>Closed Won</span>
        </button>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
        onMouseLeave={() => setHoveredIndex(null)}
      >
        <defs>
          <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FF7A00" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#FF7A00" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
          const y = padding.top + plotHeight * (1 - ratio);
          const val = Math.round(minVal + (maxVal - minVal) * ratio);
          return (
            <g key={idx}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="#E2E8F0"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
              <text
                x={padding.left - 8}
                y={y + 4}
                textAnchor="end"
                fontSize="10"
                fill="#94A3B8"
                fontFamily="var(--font-family-body)"
              >
                {val}
              </text>
            </g>
          );
        })}

        {/* X axis labels */}
        {points.map((p, i) => {
          if (points.length > 8 && i % 2 !== 0 && i !== points.length - 1) return null;
          return (
            <text
              key={i}
              x={p.x}
              y={height - 10}
              textAnchor="middle"
              fontSize="10"
              fill="#94A3B8"
              fontFamily="var(--font-family-body)"
            >
              {p.day}
            </text>
          );
        })}

        {/* Vertical guideline for active hover */}
        {hoveredIndex !== null && points[hoveredIndex] && (
          <line
            x1={points[hoveredIndex].x}
            y1={padding.top}
            x2={points[hoveredIndex].x}
            y2={height - padding.bottom}
            stroke="#94A3B8"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
        )}

        {/* Shaded Area for Total */}
        {visibleSeries.total && <path d={areaTotal} fill="url(#trendGradient)" />}

        {/* Total Leads Line */}
        {visibleSeries.total && (
          <path
            d={pathTotal}
            fill="none"
            stroke="#FF7A00"
            strokeWidth="3"
            strokeLinecap="round"
          />
        )}

        {/* Hot Leads Line */}
        {visibleSeries.hot && (
          <path
            d={pathHot}
            fill="none"
            stroke="#8B5CF6"
            strokeWidth="2.5"
            strokeDasharray="5 3"
          />
        )}

        {/* Converted Line */}
        {visibleSeries.converted && (
          <path
            d={pathConv}
            fill="none"
            stroke="#10B981"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        )}

        {/* Interactive hover targets */}
        {points.map((p, i) => (
          <g key={i} onMouseEnter={() => setHoveredIndex(i)} style={{ cursor: 'pointer' }}>
            <rect
              x={p.x - 15}
              y={padding.top}
              width="30"
              height={plotHeight}
              fill="transparent"
            />
            {visibleSeries.total && (
              <circle
                cx={p.x}
                cy={p.yTotal}
                r={hoveredIndex === i ? 6 : 3.5}
                fill="#FFFFFF"
                stroke="#FF7A00"
                strokeWidth="2.5"
              />
            )}
            {visibleSeries.hot && (
              <circle
                cx={p.x}
                cy={p.yHot}
                r={hoveredIndex === i ? 5 : 3}
                fill="#FFFFFF"
                stroke="#8B5CF6"
                strokeWidth="2"
              />
            )}
            {visibleSeries.converted && (
              <circle
                cx={p.x}
                cy={p.yConv}
                r={hoveredIndex === i ? 5 : 3}
                fill="#FFFFFF"
                stroke="#10B981"
                strokeWidth="2"
              />
            )}
          </g>
        ))}
      </svg>

      {/* Floating Hover Tooltip */}
      {hoveredIndex !== null && points[hoveredIndex] && (
        <div
          style={{
            position: 'absolute',
            left: `${Math.min(Math.max((points[hoveredIndex].x / width) * 100, 15), 85)}%`,
            top: '25px',
            transform: 'translateX(-50%)',
            backgroundColor: '#0F172A',
            color: '#FFFFFF',
            padding: '8px 12px',
            borderRadius: '8px',
            boxShadow: '0 8px 20px rgba(0,0,0,0.25)',
            fontSize: '0.75rem',
            pointerEvents: 'none',
            zIndex: 10,
            minWidth: '150px'
          }}
        >
          <div style={{ fontWeight: 700, color: '#FF7A00', marginBottom: '4px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '3px' }}>
            {points[hoveredIndex].day}
          </div>
          {visibleSeries.total && (
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
              <span>Total Ingested:</span>
              <strong>{points[hoveredIndex].leads}</strong>
            </div>
          )}
          {visibleSeries.hot && (
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', color: '#C4B5FD' }}>
              <span>Hot Qualified:</span>
              <strong>{points[hoveredIndex].hotLeads}</strong>
            </div>
          )}
          {visibleSeries.converted && (
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', color: '#6EE7B7' }}>
              <span>Closed Won:</span>
              <strong>{points[hoveredIndex].converted || 0}</strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LineTrendChart;
