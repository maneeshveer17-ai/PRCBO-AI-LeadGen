import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Info
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    signIn,
    isAuthenticated,
    isAuthorizedOperator,
    loading: authLoading,
    authError,
    clearAuthError,
    isSupabaseConfigured,
    supabaseConfigReason
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState(null);

  // If user is already authenticated and authorized, redirect to destination
  useEffect(() => {
    if (isAuthenticated && isAuthorizedOperator) {
      const destination = location.state?.from?.pathname || '/dashboard';
      navigate(destination, { replace: true });
    }
  }, [isAuthenticated, isAuthorizedOperator, navigate, location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    clearAuthError();

    if (!email.trim() || !password) {
      setLocalError('Please provide both corporate email and password.');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await signIn({ email, password });
      if (error) {
        setLocalError(error.message || 'Authentication failed. Please verify your corporate credentials.');
      } else {
        const destination = location.state?.from?.pathname || '/dashboard';
        navigate(destination, { replace: true });
      }
    } catch (err) {
      setLocalError(err.message || 'An unexpected authentication error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayedError = localError || authError;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', backgroundColor: '#0B1F3A', color: '#FFFFFF' }}>
      {/* Left side: PRCBO Brand Visual Statement */}
      <div
        style={{
          flex: 1.1,
          padding: '4rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #071527 0%, #0B1F3A 50%, #152D52 100%)',
          position: 'relative',
          overflow: 'hidden'
        }}
        className="hide-on-mobile"
      >
        {/* Ambient Glows */}
        <div
          style={{
            position: 'absolute',
            width: '450px',
            height: '450px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255, 122, 0, 0.15) 0%, transparent 70%)',
            top: '-50px',
            right: '-100px',
            pointerEvents: 'none'
          }}
        />

        {/* Top Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', zIndex: 2 }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #FF7A00 0%, #FF9A3D 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(255, 122, 0, 0.4)'
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 5C4 3.89543 4.89543 3 6 3H14C17.3137 3 20 5.68629 20 9C20 12.3137 17.3137 15 14 15H9V20C9 20.5523 8.55228 21 8 21H5C4.44772 21 4 20.5523 4 20V5Z"
                fill="#FFFFFF"
              />
              <circle cx="14" cy="9" r="3" fill="#FF7A00" />
            </svg>
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#FFFFFF' }}>
              PRCBO <span style={{ color: '#FF7A00' }}>TECH</span>
            </h2>
            <p style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 500 }}>
              AI Lead Intelligence & Growth Suite
            </p>
          </div>
        </div>

        {/* Main Pitch & Illustration */}
        <div style={{ maxWidth: '520px', zIndex: 2, margin: '3rem 0' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0.35rem 0.85rem',
              borderRadius: '9999px',
              backgroundColor: 'rgba(255, 122, 0, 0.15)',
              border: '1px solid rgba(255, 122, 0, 0.3)',
              color: '#FF9A3D',
              fontSize: '0.8125rem',
              fontWeight: 600,
              marginBottom: '1.5rem'
            }}
          >
            <Sparkles size={14} /> Autonomous Business Intelligence
          </div>

          <h1
            style={{
              fontSize: '2.5rem',
              lineHeight: 1.15,
              fontWeight: 800,
              fontFamily: 'var(--font-family-display)',
              marginBottom: '1.25rem',
              color: '#FFFFFF'
            }}
          >
            Built to Impress.{' '}
            <span style={{ color: '#FF7A00', display: 'block' }}>Engineered to Convert.</span>
          </h1>

          <p style={{ fontSize: '1.05rem', color: '#CBD5E1', lineHeight: 1.6, marginBottom: '2rem' }}>
            Empowering PRCBO Tech with automated B2B discovery, real-time Google Maps telemetry, predictive AI lead scoring, and omnichannel outreach workflows.
          </p>

          {/* Highlights */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {[
              'Autonomous business discovery & intent qualification',
              'Multi-factor AI scoring for Web, AI, & IoT opportunities',
              'Secure PostgreSQL persistence with Supabase Row Level Security',
              'Integrated WhatsApp & email personalized outreach engine'
            ].map((feature, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle2 size={18} style={{ color: '#FF7A00', flexShrink: 0 }} />
                <span style={{ fontSize: '0.875rem', color: '#E2E8F0', fontWeight: 500 }}>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Tagline */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            paddingTop: '1.5rem',
            zIndex: 2
          }}
        >
          <div style={{ fontSize: '0.8125rem', color: '#94A3B8' }}>
            &copy; 2026 PRCBO Tech. Madurai, Tamil Nadu.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#FF9A3D' }}>
            <ShieldCheck size={14} /> Operator-Restricted RLS Architecture
          </div>
        </div>
      </div>

      {/* Right side: Login Card */}
      <div
        style={{
          flex: 1,
          backgroundColor: '#FFFFFF',
          color: '#1E293B',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2.5rem'
        }}
      >
        <div style={{ width: '100%', maxWidth: '440px' }}>
          {/* Mobile brand badge */}
          <div className="show-on-mobile" style={{ marginBottom: '2rem', textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0B1F3A' }}>
              PRCBO <span style={{ color: '#FF7A00' }}>TECH</span>
            </h2>
            <p style={{ fontSize: '0.8125rem', color: '#64748B' }}>AI Lead Generation Platform</p>
          </div>

          {/* Configuration Banner if Supabase is unconfigured */}
          {!isSupabaseConfigured && (
            <div
              style={{
                marginBottom: '1.5rem',
                padding: '0.875rem 1rem',
                borderRadius: '8px',
                backgroundColor: '#FEF3C7',
                border: '1px solid #FCD34D',
                color: '#92400E',
                fontSize: '0.8125rem',
                lineHeight: 1.45,
                display: 'flex',
                gap: '8px',
                alignItems: 'flex-start'
              }}
            >
              <AlertTriangle size={18} style={{ color: '#D97706', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Supabase Configuration Required:</strong>
                <div style={{ marginTop: '3px' }}>
                  {supabaseConfigReason || 'Please define VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend/.env.'}
                </div>
              </div>
            </div>
          )}

          {/* Form Header */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-slate-900)', marginBottom: '0.5rem' }}>
              Operator Portal Sign In
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-slate-500)' }}>
              Enter your authorized PRCBO enterprise operator credentials to access the lead intelligence dashboard.
            </p>
          </div>

          {/* Error Banner */}
          {displayedError && (
            <div
              style={{
                marginBottom: '1.25rem',
                padding: '0.875rem 1rem',
                borderRadius: '8px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#991B1B',
                fontSize: '0.8125rem',
                display: 'flex',
                gap: '8px',
                alignItems: 'center'
              }}
            >
              <AlertCircle size={16} style={{ color: '#DC2626', flexShrink: 0 }} />
              <span>{displayedError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Email Field */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: 'var(--color-slate-700)',
                  marginBottom: '0.35rem'
                }}
              >
                Corporate Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail
                  size={18}
                  style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94A3B8'
                  }}
                />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@prcbo.in"
                  style={{
                    width: '100%',
                    height: '44px',
                    padding: '0 1rem 0 2.6rem',
                    borderRadius: '8px',
                    border: '1px solid var(--color-slate-200)',
                    fontSize: '0.875rem',
                    backgroundColor: 'var(--color-slate-50)',
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--color-primary)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--color-slate-200)')}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.35rem'
                }}
              >
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-slate-700)' }}>
                  Password
                </label>
                <a
                  href="#forgot"
                  onClick={(e) => {
                    e.preventDefault();
                    alert('Please contact your PRCBO IT Administrator to reset your internal credentials.');
                  }}
                  style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 600 }}
                >
                  Forgot password?
                </a>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={18}
                  style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94A3B8'
                  }}
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  style={{
                    width: '100%',
                    height: '44px',
                    padding: '0 2.6rem 0 2.6rem',
                    borderRadius: '8px',
                    border: '1px solid var(--color-slate-200)',
                    fontSize: '0.875rem',
                    backgroundColor: 'var(--color-slate-50)',
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--color-primary)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--color-slate-200)')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94A3B8',
                    cursor: 'pointer',
                    background: 'none',
                    border: 'none',
                    display: 'flex'
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.8125rem',
                  color: 'var(--color-slate-600)',
                  cursor: 'pointer'
                }}
              >
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ accentColor: 'var(--color-primary)', width: '16px', height: '16px' }}
                />
                Remember this device for 30 days
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || authLoading}
              className="btn btn-primary btn-lg"
              style={{
                width: '100%',
                marginTop: '0.5rem',
                height: '48px',
                fontSize: '0.9375rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                  Authenticating Operator...
                </>
              ) : (
                <>
                  Access Platform <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Access Policy Note */}
          <div
            style={{
              marginTop: '1.75rem',
              padding: '1rem',
              borderRadius: '8px',
              backgroundColor: 'var(--color-slate-50)',
              border: '1px solid var(--color-slate-200)',
              fontSize: '0.75rem',
              color: 'var(--color-slate-600)',
              lineHeight: 1.5
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: 'var(--color-slate-800)', marginBottom: '4px' }}>
              <Info size={14} style={{ color: 'var(--color-primary)' }} /> Enterprise Access Policy
            </div>
            Public self-registration is disabled. Operator accounts must be provisioned or invited by a platform administrator. Unapproved accounts cannot access enterprise leads under Row Level Security.
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
