import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export const StatCard = ({
  label,
  value,
  change,
  positive = true,
  comparison = "vs last month",
  icon: Icon,
  iconColor,
  iconBg
}) => {
  return (
    <div className="stat-card">
      <div className="stat-card-top">
        <span className="stat-card-label">{label}</span>
        {Icon && (
          <div
            className="stat-card-icon"
            style={{
              color: iconColor || 'var(--color-primary)',
              backgroundColor: iconBg || 'var(--color-primary-light)'
            }}
          >
            <Icon size={20} />
          </div>
        )}
      </div>

      <div className="stat-card-value">{value}</div>

      <div className="stat-card-trend">
        {change && (
          <span
            className={positive ? 'trend-positive flex-center' : 'trend-negative flex-center'}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontWeight: 600 }}
          >
            {positive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {change}
          </span>
        )}
        <span className="stat-card-comparison">{comparison}</span>
      </div>
    </div>
  );
};

export default StatCard;
