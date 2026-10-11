import React from 'react';

export const ChartCard = ({ title, subtitle, action, children, className = '' }) => {
  return (
    <div className={`card ${className}`}>
      <div className="card-header">
        <div>
          <h3 className="card-title">{title}</h3>
          {subtitle && <p className="card-subtitle">{subtitle}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
      <div>
        {children}
      </div>
    </div>
  );
};

export default ChartCard;
