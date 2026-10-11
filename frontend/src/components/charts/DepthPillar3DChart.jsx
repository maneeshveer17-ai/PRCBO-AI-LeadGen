import React, { useState } from 'react';
import { Layers, Box, TrendingUp, Sparkles, Eye } from 'lucide-react';
import { mock3DPipelineData } from '../../data/mockAnalytics';

export const DepthPillar3DChart = ({ data = mock3DPipelineData, height = 260 }) => {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [is3DMode, setIs3DMode] = useState(true);
  const [activeMetric, setActiveMetric] = useState('value'); // 'value' or 'volume'

  if (!data || data.length === 0) return null;

  const maxVal = Math.max(...data.map(d => (activeMetric === 'value' ? d.valueNum || 0 : d.volume || 0)), 1);
  const totalPipelineLakhs = data.reduce((acc, curr) => acc + (curr.valueNum || 0), 0);
  const pipelineDisplay = totalPipelineLakhs >= 100
    ? `₹${(totalPipelineLakhs / 100).toFixed(2)} Crore`
    : `₹${totalPipelineLakhs.toFixed(1)} Lakh`;

  return (
    <div style={{ position: 'relative', width: '100%', userSelect: 'none' }}>
      {/* Chart Top Controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          marginBottom: '1rem',
          fontSize: '0.75rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '6px',
              backgroundColor: 'rgba(255, 122, 0, 0.1)',
              color: 'var(--color-primary)',
              fontWeight: 700,
              fontSize: '0.6875rem'
            }}
          >
            <Sparkles size={11} /> 3D DEPTH ENGINE
          </span>
          <span style={{ color: 'var(--color-slate-500)', fontSize: '0.75rem' }}>
            Pipeline Volume & Capital Distribution
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* Metric Toggle */}
          <div style={{ display: 'flex', backgroundColor: 'var(--color-slate-100)', borderRadius: '6px', padding: '2px' }}>
            <button
              onClick={() => setActiveMetric('value')}
              style={{
                padding: '3px 8px',
                borderRadius: '4px',
                fontSize: '0.6875rem',
                fontWeight: 600,
                backgroundColor: activeMetric === 'value' ? '#FFFFFF' : 'transparent',
                color: activeMetric === 'value' ? 'var(--color-slate-900)' : 'var(--color-slate-600)',
                boxShadow: activeMetric === 'value' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none'
              }}
            >
              Deal Value
            </button>
            <button
              onClick={() => setActiveMetric('volume')}
              style={{
                padding: '3px 8px',
                borderRadius: '4px',
                fontSize: '0.6875rem',
                fontWeight: 600,
                backgroundColor: activeMetric === 'volume' ? '#FFFFFF' : 'transparent',
                color: activeMetric === 'volume' ? 'var(--color-slate-900)' : 'var(--color-slate-600)',
                boxShadow: activeMetric === 'volume' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none'
              }}
            >
              Lead Volume
            </button>
          </div>

          {/* 3D vs 2D Toggle */}
          <button
            onClick={() => setIs3DMode(!is3DMode)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: '6px',
              border: '1px solid var(--color-slate-200)',
              backgroundColor: is3DMode ? 'var(--color-navy)' : '#FFFFFF',
              color: is3DMode ? '#FFFFFF' : 'var(--color-slate-700)',
              fontSize: '0.6875rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {is3DMode ? <Box size={12} /> : <Layers size={12} />}
            {is3DMode ? '3D Isometric' : '2D Planar'}
          </button>
        </div>
      </div>

      {/* 3D Stage Canvas */}
      <div
        style={{
          position: 'relative',
          height: `${height}px`,
          perspective: is3DMode ? '900px' : 'none',
          perspectiveOrigin: '50% 25%',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-around',
          padding: '1.5rem 1rem 0.5rem',
          background: is3DMode
            ? 'radial-gradient(ellipse at 50% 90%, rgba(241, 245, 249, 0.9) 0%, rgba(248, 250, 252, 0.4) 100%)'
            : 'transparent',
          borderRadius: '12px',
          border: '1px solid var(--color-slate-200)',
          overflow: 'hidden'
        }}
      >
        {/* Isometric Grid Floor Plane */}
        {is3DMode && (
          <div
            style={{
              position: 'absolute',
              bottom: '-10px',
              left: '5%',
              right: '5%',
              height: '80px',
              background: 'linear-gradient(180deg, rgba(226, 232, 240, 0.3) 0%, rgba(203, 213, 225, 0.15) 100%)',
              transform: 'rotateX(62deg)',
              transformOrigin: '50% 100%',
              borderRadius: '8px',
              boxShadow: '0 20px 30px rgba(15, 23, 42, 0.06)',
              border: '1px solid rgba(226, 232, 240, 0.6)',
              pointerEvents: 'none'
            }}
          />
        )}

        {/* 3D Pillars */}
        {data.map((item, idx) => {
          const val = activeMetric === 'value' ? item.valueNum : item.volume;
          const heightRatio = Math.max((val / maxVal), 0.12);
          const pillarHeight = heightRatio * (height - 85);
          const isHovered = hoveredIdx === idx;
          const pillarWidth = 44;
          const depthOffset = is3DMode ? 14 : 0;

          return (
            <div
              key={item.stage}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-end',
                height: '100%',
                flex: 1,
                cursor: 'pointer',
                transformStyle: 'preserve-3d',
                transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)'
              }}
            >
              {/* Value Header on Pillar Top */}
              <div
                style={{
                  marginBottom: is3DMode ? '16px' : '6px',
                  textAlign: 'center',
                  transform: isHovered ? 'scale(1.1) translateY(-4px)' : 'scale(1)',
                  transition: 'transform 0.2s ease',
                  zIndex: 20
                }}
              >
                <div
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    fontFamily: 'var(--font-family-display)',
                    color: isHovered ? item.lightColor : 'var(--color-slate-900)'
                  }}
                >
                  {activeMetric === 'value' ? item.value : item.volume.toLocaleString()}
                </div>
                <div
                  style={{
                    fontSize: '0.625rem',
                    color: 'var(--color-slate-400)',
                    fontWeight: 600
                  }}
                >
                  {item.velocity}
                </div>
              </div>

              {/* 3D Extruded Pillar Body */}
              <div
                style={{
                  position: 'relative',
                  width: `${pillarWidth}px`,
                  height: `${pillarHeight}px`,
                  transformStyle: 'preserve-3d',
                  transform: is3DMode
                    ? isHovered
                      ? 'translateY(-14px) scale(1.04) rotateY(-8deg) rotateX(10deg)'
                      : 'rotateY(-4deg) rotateX(6deg)'
                    : isHovered
                    ? 'translateY(-6px)'
                    : 'none',
                  transition: 'transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.28s ease'
                }}
              >
                {/* 3D Soft Floor Cast Shadow */}
                {is3DMode && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '-14px',
                      left: '0px',
                      width: `${pillarWidth + 12}px`,
                      height: '24px',
                      borderRadius: '50%',
                      background: item.shadowColor,
                      filter: 'blur(6px)',
                      opacity: isHovered ? 0.9 : 0.5,
                      transform: 'rotateX(75deg)',
                      transition: 'opacity 0.2s ease, filter 0.2s ease'
                    }}
                  />
                )}

                {/* Front Face */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: `linear-gradient(180deg, ${item.lightColor} 0%, ${item.depthColor} 100%)`,
                    borderRadius: is3DMode ? '3px 0 0 3px' : '6px 6px 0 0',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    boxShadow: isHovered ? `0 0 16px ${item.shadowColor}` : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden'
                  }}
                >
                  {/* Subtle glossy reflection highlight */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '45%',
                      bottom: 0,
                      background: 'linear-gradient(90deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.0) 100%)'
                    }}
                  />
                  {pillarHeight > 70 && (
                    <span
                      style={{
                        writingMode: 'vertical-rl',
                        transform: 'rotate(180deg)',
                        fontSize: '0.625rem',
                        fontWeight: 700,
                        color: 'rgba(255, 255, 255, 0.85)',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase'
                      }}
                    >
                      {item.tag}
                    </span>
                  )}
                </div>

                {/* 3D Right Side Extrusion Face */}
                {is3DMode && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      right: `-${depthOffset}px`,
                      width: `${depthOffset}px`,
                      height: '100%',
                      background: `linear-gradient(180deg, ${item.depthColor} 0%, rgba(15, 23, 42, 0.85) 100%)`,
                      transform: 'skewY(-35deg)',
                      transformOrigin: '0% 0%',
                      borderRadius: '0 3px 3px 0',
                      borderRight: '1px solid rgba(0,0,0,0.1)',
                      opacity: 0.95
                    }}
                  />
                )}

                {/* 3D Top Cap Face (Isometric Diamond/Ellipse) */}
                {is3DMode && (
                  <div
                    style={{
                      position: 'absolute',
                      top: `-${depthOffset}px`,
                      left: 0,
                      width: `${pillarWidth}px`,
                      height: `${depthOffset}px`,
                      background: item.topColor,
                      transform: 'skewX(-55deg)',
                      transformOrigin: '0% 100%',
                      borderRadius: '2px',
                      border: '1px solid rgba(255, 255, 255, 0.5)',
                      boxShadow: 'inset 0 1px 3px rgba(255, 255, 255, 0.7)'
                    }}
                  />
                )}
              </div>

              {/* Stage Name X-Axis Label */}
              <div
                style={{
                  marginTop: '12px',
                  textAlign: 'center',
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  color: isHovered ? 'var(--color-slate-900)' : 'var(--color-slate-600)',
                  transition: 'color 0.15s ease'
                }}
              >
                {item.stage}
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Hover Card Detail */}
      {hoveredIdx !== null && data[hoveredIdx] && (
        <div
          style={{
            position: 'absolute',
            bottom: '75px',
            left: `${((hoveredIdx + 0.5) / data.length) * 100}%`,
            transform: 'translateX(-50%)',
            backgroundColor: '#0F172A',
            color: '#FFFFFF',
            padding: '10px 14px',
            borderRadius: '10px',
            boxShadow: '0 12px 28px rgba(0,0,0,0.3)',
            fontSize: '0.75rem',
            pointerEvents: 'none',
            zIndex: 30,
            minWidth: '170px',
            border: `1px solid ${data[hoveredIdx].lightColor}`
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontWeight: 700, color: data[hoveredIdx].lightColor }}>
              {data[hoveredIdx].stage}
            </span>
            <span style={{ fontSize: '0.625rem', padding: '1px 5px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.15)' }}>
              {data[hoveredIdx].tag}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginTop: '4px' }}>
            <span style={{ color: '#94A3B8' }}>Deal Pipeline:</span>
            <strong style={{ color: '#FFFFFF' }}>{data[hoveredIdx].value}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
            <span style={{ color: '#94A3B8' }}>Qualified Volume:</span>
            <strong>{data[hoveredIdx].volume} leads</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', color: '#38BDF8' }}>
            <span>Stage Duration:</span>
            <span>{data[hoveredIdx].velocity} avg</span>
          </div>
        </div>
      )}

      {/* Footer Legend */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          marginTop: '0.75rem',
          paddingTop: '0.5rem',
          borderTop: '1px solid var(--color-slate-100)',
          fontSize: '0.6875rem',
          color: 'var(--color-slate-500)'
        }}
      >
        <span>💡 Hover any 3D pillar to inspect deal velocity & retention depth</span>
        <span style={{ fontWeight: 600, color: 'var(--color-slate-700)' }}>
          Total Active Pipeline: <strong style={{ color: 'var(--color-primary)' }}>{pipelineDisplay}</strong>
        </span>
      </div>
    </div>
  );
};

export default DepthPillar3DChart;
