import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { useLeads } from '../../context/LeadContext';

export const ToastContainer = () => {
  const { toasts, removeToast } = useLeads();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        maxWidth: '380px',
        pointerEvents: 'none'
      }}
    >
      {toasts.map(toast => {
        let Icon = CheckCircle2;
        let bgColor = '#0F172A';
        let accentColor = '#10B981';

        if (toast.type === 'error') {
          Icon = AlertCircle;
          accentColor = '#EF4444';
        } else if (toast.type === 'warning') {
          Icon = AlertTriangle;
          accentColor = '#F59E0B';
        } else if (toast.type === 'info') {
          Icon = Info;
          accentColor = '#3B82F6';
        }

        return (
          <div
            key={toast.id}
            style={{
              pointerEvents: 'auto',
              backgroundColor: bgColor,
              color: '#FFFFFF',
              borderRadius: '10px',
              padding: '12px 16px',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              borderLeft: `4px solid ${accentColor}`,
              fontSize: '0.875rem',
              animation: 'fadeIn 0.2s ease-out'
            }}
          >
            <Icon size={18} style={{ color: accentColor, flexShrink: 0 }} />
            <div style={{ flex: 1, lineHeight: 1.4 }}>{toast.message}</div>
            <button
              onClick={() => removeToast(toast.id)}
              style={{
                background: 'none',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex'
              }}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default ToastContainer;
