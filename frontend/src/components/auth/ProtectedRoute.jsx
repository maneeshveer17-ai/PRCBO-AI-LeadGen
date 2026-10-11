import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ShieldAlert, LogOut, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const ProtectedRoute = () => {
  const { isAuthenticated, isAuthorizedOperator, user, loading, signOut } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0B1F3A',
          color: '#FFFFFF',
          padding: '2rem'
        }}
      >
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #FF7A00 0%, #FF9A3D 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 30px rgba(255, 122, 0, 0.45)',
            marginBottom: '1.5rem',
            animation: 'pulse 1.8s infinite ease-in-out'
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path
              d="M4 5C4 3.89543 4.89543 3 6 3H14C17.3137 3 20 5.68629 20 9C20 12.3137 17.3137 15 14 15H9V20C9 20.5523 8.55228 21 8 21H5C4.44772 21 4 20.5523 4 20V5Z"
              fill="#FFFFFF"
            />
            <circle cx="14" cy="9" r="3" fill="#FF7A00" />
          </svg>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.5rem' }}>
          <div
            style={{
              width: '18px',
              height: '18px',
              border: '2px solid rgba(255, 122, 0, 0.3)',
              borderTopColor: '#FF7A00',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite'
            }}
          />
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, letterSpacing: '-0.01em', color: '#FFFFFF', margin: 0 }}>
            PRCBO <span style={{ color: '#FF7A00' }}>TECH</span>
          </h2>
        </div>

        <p style={{ fontSize: '0.8125rem', color: '#94A3B8', marginTop: '4px' }}>
          Verifying Supabase authentication & operator authorization...
        </p>

        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.05); opacity: 0.9; }
          }
        `}</style>
      </div>
    );
  }

  // 1. Unauthenticated users redirected to login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Authenticated users without approved operator role blocked from leads telemetry
  if (!isAuthorizedOperator) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0B1F3A',
          color: '#FFFFFF',
          padding: '2rem'
        }}
      >
        <div
          style={{
            maxWidth: '480px',
            width: '100%',
            backgroundColor: '#11294D',
            border: '1px solid rgba(255, 122, 0, 0.3)',
            borderRadius: '16px',
            padding: '2.5rem',
            boxShadow: '0 20px 45px rgba(0, 0, 0, 0.4)',
            textAlign: 'center'
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              color: '#F87171'
            }}
          >
            <ShieldAlert size={28} />
          </div>

          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '0.5rem', color: '#FFFFFF' }}>
            Operator Authorization Required
          </h2>

          <p style={{ fontSize: '0.875rem', color: '#CBD5E1', lineHeight: 1.6, marginBottom: '1.25rem' }}>
            Your account (<strong style={{ color: '#FF9A3D' }}>{user?.email}</strong>) has been authenticated, but has not yet been assigned an authorized PRCBO Operator role.
          </p>

          <div
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              borderRadius: '10px',
              padding: '1rem',
              fontSize: '0.8125rem',
              color: '#94A3B8',
              textAlign: 'left',
              lineHeight: 1.5,
              marginBottom: '1.75rem',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#E2E8F0', fontWeight: 600, marginBottom: '4px' }}>
              <Lock size={14} style={{ color: '#FF7A00' }} /> Row Level Security Protection
            </div>
            Enterprise prospect data is strictly guarded by PostgreSQL RLS. Please contact your administrator to assign your operator role in Supabase.
          </div>

          <button
            type="button"
            onClick={() => signOut()}
            className="btn btn-outline"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              color: '#F87171',
              borderColor: 'rgba(239, 68, 68, 0.4)'
            }}
          >
            <LogOut size={16} /> Sign Out of Current Session
          </button>
        </div>
      </div>
    );
  }

  // 3. Authorized operator granted access
  return <Outlet />;
};

export default ProtectedRoute;
