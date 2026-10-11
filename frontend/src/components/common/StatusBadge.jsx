import React from 'react';

export const StatusBadge = ({ status }) => {
  const normalized = (status || 'New').toLowerCase();
  
  let badgeClass = 'badge-new';
  let dotColor = '#3B82F6';
  
  if (normalized === 'contacted') {
    badgeClass = 'badge-contacted';
    dotColor = '#8B5CF6';
  } else if (normalized === 'follow-up' || normalized === 'followup') {
    badgeClass = 'badge-followup';
    dotColor = '#F59E0B';
  } else if (normalized === 'converted') {
    badgeClass = 'badge-converted';
    dotColor = '#10B981';
  } else if (normalized === 'rejected') {
    badgeClass = 'badge-rejected';
    dotColor = '#EF4444';
  }

  return (
    <span className={`badge ${badgeClass}`}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: dotColor, display: 'inline-block' }} />
      {status}
    </span>
  );
};

export default StatusBadge;
