import React from 'react';
import { Flame, Sparkles, AlertCircle, ArrowDown, HelpCircle } from 'lucide-react';

export const ScoreBadge = ({ score, showIcon = true, size = 'md' }) => {
  const paddingStyle = size === 'sm' ? { padding: '0.15rem 0.45rem', fontSize: '0.75rem' } : {};

  // Real OpenStreetMap items that have not gone through AI qualification
  if (score === null || score === undefined || score === 'UNSCORED' || (typeof score === 'string' && isNaN(Number(score)))) {
    return (
      <span
        className="score-badge score-unscored"
        style={{
          ...paddingStyle,
          backgroundColor: '#F1F5F9',
          color: '#64748B',
          borderColor: '#CBD5E1',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px'
        }}
        title="Pending AI Qualification (Real OpenStreetMap POI)"
      >
        {showIcon && <HelpCircle size={size === 'sm' ? 12 : 14} />}
        <span style={{ fontSize: size === 'sm' ? '0.65rem' : '0.7rem', fontWeight: 700, letterSpacing: '0.04em' }}>UNSCORED</span>
      </span>
    );
  }

  const numScore = Number(score) || 0;
  
  let tier = 'LOW';
  let tierClass = 'score-low';
  let Icon = ArrowDown;
  
  if (numScore >= 88) {
    tier = 'HOT';
    tierClass = 'score-hot';
    Icon = Flame;
  } else if (numScore >= 70) {
    tier = 'HIGH';
    tierClass = 'score-high';
    Icon = Sparkles;
  } else if (numScore >= 50) {
    tier = 'MEDIUM';
    tierClass = 'score-medium';
    Icon = AlertCircle;
  }

  return (
    <span className={`score-badge ${tierClass}`} style={paddingStyle} title={`AI Predictor Score: ${numScore}/100 (${tier})`}>
      {showIcon && <Icon size={size === 'sm' ? 12 : 14} />}
      <span>{numScore}</span>
      <span style={{ fontSize: size === 'sm' ? '0.65rem' : '0.6875rem', opacity: 0.85, fontWeight: 600 }}>{tier}</span>
    </span>
  );
};

export default ScoreBadge;
