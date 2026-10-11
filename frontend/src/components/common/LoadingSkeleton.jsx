import React from 'react';

export const LoadingSkeleton = ({ type = 'table', rows = 5 }) => {
  if (type === 'card') {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card" style={{ padding: '1.5rem' }}>
            <div className="skeleton-shimmer" style={{ width: '40%', height: '14px', marginBottom: '12px' }} />
            <div className="skeleton-shimmer" style={{ width: '60%', height: '28px', marginBottom: '12px' }} />
            <div className="skeleton-shimmer" style={{ width: '80%', height: '12px' }} />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'detail') {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem' }}>
        <div className="card" style={{ padding: '2rem' }}>
          <div className="skeleton-shimmer" style={{ width: '50%', height: '24px', marginBottom: '16px' }} />
          <div className="skeleton-shimmer" style={{ width: '30%', height: '16px', marginBottom: '24px' }} />
          <div className="skeleton-shimmer" style={{ width: '100%', height: '120px', marginBottom: '20px' }} />
          <div className="skeleton-shimmer" style={{ width: '100%', height: '120px' }} />
        </div>
        <div className="card" style={{ padding: '2rem' }}>
          <div className="skeleton-shimmer" style={{ width: '120px', height: '120px', borderRadius: '50%', margin: '0 auto 20px' }} />
          <div className="skeleton-shimmer" style={{ width: '70%', height: '20px', margin: '0 auto 12px' }} />
          <div className="skeleton-shimmer" style={{ width: '90%', height: '40px' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="table-container" style={{ padding: '1rem' }}>
      <div className="skeleton-shimmer" style={{ width: '25%', height: '20px', marginBottom: '1.25rem' }} />
      {[...Array(rows)].map((_, idx) => (
        <div
          key={idx}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '1rem 0',
            borderBottom: '1px solid var(--color-slate-100)'
          }}
        >
          <div className="skeleton-shimmer" style={{ width: '25%', height: '16px' }} />
          <div className="skeleton-shimmer" style={{ width: '15%', height: '16px' }} />
          <div className="skeleton-shimmer" style={{ width: '15%', height: '16px' }} />
          <div className="skeleton-shimmer" style={{ width: '10%', height: '16px' }} />
          <div className="skeleton-shimmer" style={{ width: '15%', height: '16px' }} />
          <div className="skeleton-shimmer" style={{ width: '10%', height: '16px' }} />
        </div>
      ))}
    </div>
  );
};

export default LoadingSkeleton;
