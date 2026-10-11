import React from 'react';

export const ScoreRing = ({ score = 85, size = 110, strokeWidth = 8 }) => {
  const isUnscored = score === null || score === undefined || (typeof score === 'string' && isNaN(Number(score)));
  const numScore = isUnscored ? null : Number(score);
  
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = isUnscored ? 0 : Math.min(Math.max(numScore, 0), 100);
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  let strokeColor = '#94A3B8'; // Neutral
  let tierLabel = 'PENDING QUALIFICATION';
  let badgeBg = 'rgba(148, 163, 184, 0.15)';
  
  if (!isUnscored) {
    if (numScore >= 88) {
      strokeColor = '#FF7A00'; // Hot
      tierLabel = 'HOT LEAD';
      badgeBg = 'rgba(255, 122, 0, 0.15)';
    } else if (numScore >= 70) {
      strokeColor = '#10B981'; // High
      tierLabel = 'HIGH POTENTIAL';
      badgeBg = 'rgba(16, 185, 129, 0.15)';
    } else if (numScore >= 50) {
      strokeColor = '#F59E0B'; // Medium
      tierLabel = 'MEDIUM';
      badgeBg = 'rgba(245, 158, 11, 0.15)';
    } else {
      strokeColor = '#EF4444'; // Low
      tierLabel = 'LOW';
      badgeBg = 'rgba(239, 68, 68, 0.1)';
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#E2E8F0"
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }}
          />
        </svg>

        {/* Center text */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <span style={{ fontSize: size > 90 ? (isUnscored ? '1.05rem' : '1.75rem') : (isUnscored ? '0.85rem' : '1.25rem'), fontWeight: 800, fontFamily: 'var(--font-family-display)', color: 'var(--color-slate-900)', lineHeight: 1 }}>
            {isUnscored ? 'UNSCORED' : numScore}
          </span>
          <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-slate-400)', marginTop: 2 }}>
            {isUnscored ? 'Pending AI' : '/ 100'}
          </span>
        </div>
      </div>

      <div
        style={{
          marginTop: '0.75rem',
          padding: '0.2rem 0.65rem',
          borderRadius: '9999px',
          backgroundColor: badgeBg,
          color: strokeColor,
          fontSize: '0.75rem',
          fontWeight: 700,
          letterSpacing: '0.05em'
        }}
      >
        {tierLabel}
      </div>
    </div>
  );
};

export default ScoreRing;
