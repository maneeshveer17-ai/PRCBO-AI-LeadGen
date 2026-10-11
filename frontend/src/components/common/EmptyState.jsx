import React from 'react';
import { SearchX, Inbox } from 'lucide-react';

export const EmptyState = ({
  icon: Icon = Inbox,
  title = "No records found",
  description = "Try adjusting your search criteria or clear active filters.",
  actionLabel,
  onAction
}) => {
  return (
    <div
      style={{
        padding: '3.5rem 1.5rem',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)'
      }}
    >
      <div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          backgroundColor: 'var(--color-primary-light)',
          color: 'var(--color-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1.25rem'
        }}
      >
        <Icon size={32} />
      </div>

      <h4 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-slate-800)', marginBottom: '0.4rem' }}>
        {title}
      </h4>

      <p style={{ fontSize: '0.875rem', color: 'var(--color-slate-500)', maxWidth: '420px', marginBottom: actionLabel ? '1.5rem' : '0' }}>
        {description}
      </p>

      {actionLabel && onAction && (
        <button className="btn btn-primary btn-sm" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
