import React, { useState } from 'react';
import {
  User,
  Shield,
  Bell,
  Sliders,
  KeyRound,
  Save,
  CheckCircle2,
  Lock,
  Smartphone,
  Globe,
  Building
} from 'lucide-react';
import { useLeads } from '../context/LeadContext';

export const Settings = () => {
  const { currentUser, addToast } = useLeads();
  const [activeSection, setActiveSection] = useState('profile');

  // Form states
  const [name, setName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.email);
  const [role, setRole] = useState(currentUser.role);
  const [hotThreshold, setHotThreshold] = useState(88);
  const [defaultCity, setDefaultCity] = useState('Madurai, Tamil Nadu');

  // Notification toggles
  const [notifications, setNotifications] = useState({
    leadAlerts: true,
    aiAlerts: true,
    importNotifications: true,
    outreachNotifications: false
  });

  const handleSave = (e) => {
    e.preventDefault();
    addToast('Platform settings successfully saved.', 'success');
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-header-title">Platform Settings</h1>
          <p className="page-header-subtitle">
            Manage your personal profile, security credentials, AI scoring parameters, and team preferences.
          </p>
        </div>

        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={handleSave}>
            <Save size={15} /> Save Changes
          </button>
        </div>
      </div>

      {/* Settings Layout: Left Navigation + Right Content */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) minmax(400px, 3fr)', gap: '1.75rem' }}>
        {/* Navigation Menu */}
        <div className="card" style={{ padding: '0.75rem', height: 'fit-content' }}>
          {[
            { id: 'profile', label: 'User Profile', icon: User },
            { id: 'account', label: 'Organization & Team', icon: Building },
            { id: 'security', label: 'Security & Access', icon: Shield },
            { id: 'notifications', label: 'Notification Rules', icon: Bell },
            { id: 'preferences', label: 'AI & Data Parameters', icon: Sliders }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  backgroundColor: isActive ? 'var(--color-primary-light)' : 'transparent',
                  color: isActive ? 'var(--color-primary)' : 'var(--color-slate-700)',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '0.875rem',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={17} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* PROFILE SECTION */}
          {activeSection === 'profile' && (
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: '1.25rem' }}>
                Profile Information
              </h3>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.5rem' }}>
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--color-navy) 0%, var(--color-navy-light) 100%)',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    border: '3px solid var(--color-primary)'
                  }}
                >
                  {currentUser.avatar}
                </div>
                <div>
                  <button className="btn btn-outline btn-sm" onClick={() => addToast("Avatar update dialog", "info")}>
                    Change Avatar
                  </button>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-slate-400)', marginTop: '4px' }}>
                    JPG, GIF or PNG. Max size 2MB.
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-slate-700)', marginBottom: '0.35rem' }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{ width: '100%', height: '40px', padding: '0 0.875rem', borderRadius: '8px', border: '1px solid var(--color-slate-200)', fontSize: '0.875rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-slate-700)', marginBottom: '0.35rem' }}>
                    Work Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ width: '100%', height: '40px', padding: '0 0.875rem', borderRadius: '8px', border: '1px solid var(--color-slate-200)', fontSize: '0.875rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-slate-700)', marginBottom: '0.35rem' }}>
                    Assigned Role
                  </label>
                  <input
                    type="text"
                    disabled
                    value={role}
                    style={{ width: '100%', height: '40px', padding: '0 0.875rem', borderRadius: '8px', border: '1px solid var(--color-slate-200)', fontSize: '0.875rem', backgroundColor: 'var(--color-slate-50)', color: 'var(--color-slate-500)' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-slate-700)', marginBottom: '0.35rem' }}>
                    Organization
                  </label>
                  <input
                    type="text"
                    disabled
                    value={currentUser.organization}
                    style={{ width: '100%', height: '40px', padding: '0 0.875rem', borderRadius: '8px', border: '1px solid var(--color-slate-200)', fontSize: '0.875rem', backgroundColor: 'var(--color-slate-50)', color: 'var(--color-slate-500)' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ORGANIZATION & TEAM SECTION */}
          {activeSection === 'account' && (
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: '1.25rem' }}>
                PRCBO Tech Internship Team
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-slate-600)', marginBottom: '1.5rem' }}>
                Collaborative 4-member engineering tracks configured for this deployment:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                {[
                  { name: 'Maneesh V', role: 'Full Stack Development Lead', track: 'React Portal & Supabase Arch', badge: 'Active' },
                  { name: 'Arun K', role: 'AI Lead Intelligence Engineer', track: 'Predictive Scoring & Insights', badge: 'Active' },
                  { name: 'Karthik R', role: 'Google Maps & Bot Engineer', track: 'Places API & Telemetry Bots', badge: 'Active' },
                  { name: 'Priya S', role: 'Data Collection & Processing', track: 'Ingestion & Normalization', badge: 'Active' }
                ].map((member, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 1rem', borderRadius: '8px', backgroundColor: 'var(--color-slate-50)', border: '1px solid var(--color-slate-200)' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--color-slate-900)' }}>{member.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)' }}>{member.role} &bull; {member.track}</div>
                    </div>
                    <span className="badge badge-converted">{member.badge}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECURITY SECTION */}
          {activeSection === 'security' && (
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: '1.25rem' }}>
                Security & Authentication
              </h3>

              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-slate-800)', marginBottom: '0.5rem' }}>
                  Update Password
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '380px' }}>
                  <input
                    type="password"
                    placeholder="Current Password"
                    style={{ width: '100%', height: '40px', padding: '0 0.875rem', borderRadius: '8px', border: '1px solid var(--color-slate-200)', fontSize: '0.875rem' }}
                  />
                  <input
                    type="password"
                    placeholder="New Password (min. 8 characters)"
                    style={{ width: '100%', height: '40px', padding: '0 0.875rem', borderRadius: '8px', border: '1px solid var(--color-slate-200)', fontSize: '0.875rem' }}
                  />
                  <input
                    type="password"
                    placeholder="Confirm New Password"
                    style={{ width: '100%', height: '40px', padding: '0 0.875rem', borderRadius: '8px', border: '1px solid var(--color-slate-200)', fontSize: '0.875rem' }}
                  />
                  <button className="btn btn-secondary btn-sm" style={{ width: 'fit-content' }} onClick={() => addToast("Password updated successfully", "success")}>
                    Update Password
                  </button>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--color-slate-200)', paddingTop: '1.25rem' }}>
                <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-slate-800)', marginBottom: '0.5rem' }}>
                  Active Sessions
                </h4>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', borderRadius: '8px', backgroundColor: 'var(--color-slate-50)', border: '1px solid var(--color-slate-200)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Smartphone size={18} style={{ color: 'var(--color-primary)' }} />
                    <div>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Windows 11 / Antigravity IDE (Current Session)</div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--color-slate-400)' }}>Madurai, India &bull; IP: 157.48.xx.xx</div>
                    </div>
                  </div>
                  <span className="badge badge-converted">Active</span>
                </div>
              </div>
            </div>
          )}

          {/* NOTIFICATION PREFERENCES */}
          {activeSection === 'notifications' && (
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: '1.25rem' }}>
                Notification Subscriptions
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {[
                  { key: 'leadAlerts', label: 'Hot Lead Instant Alerts', desc: 'Notify immediately when an ingested business scores above 88/100' },
                  { key: 'aiAlerts', label: 'AI Anomaly & Market Signals', desc: 'Daily notification of detected surges in Web/IoT demand across cities' },
                  { key: 'importNotifications', label: 'Data Ingestion Completion', desc: 'Receive summaries when CSV/Excel batches finish validation' },
                  { key: 'outreachNotifications', label: 'WhatsApp Response Notifications', desc: 'Push notification when a lead responds to automated pitch' }
                ].map((item) => (
                  <label
                    key={item.key}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      cursor: 'pointer',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      backgroundColor: 'var(--color-slate-50)'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={notifications[item.key]}
                      onChange={(e) => setNotifications({ ...notifications, [item.key]: e.target.checked })}
                      style={{ accentColor: 'var(--color-primary)', width: '18px', height: '18px', marginTop: '2px' }}
                    />
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-slate-800)' }}>
                        {item.label}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)', marginTop: '2px' }}>
                        {item.desc}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* PREFERENCES SECTION */}
          {activeSection === 'preferences' && (
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: '1.25rem' }}>
                AI & Intelligence Engine Preferences
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-slate-700)', marginBottom: '0.35rem' }}>
                    Hot Lead Threshold (Minimum Score)
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <input
                      type="range"
                      min="75"
                      max="95"
                      value={hotThreshold}
                      onChange={(e) => setHotThreshold(parseInt(e.target.value))}
                      style={{ flex: 1, accentColor: 'var(--color-primary)' }}
                    />
                    <span style={{ fontWeight: 800, color: 'var(--color-primary)', fontSize: '1rem', minWidth: '40px' }}>
                      {hotThreshold}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-slate-400)' }}>
                    Leads with AI scores &ge; {hotThreshold} will trigger immediate priority alerts.
                  </span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-slate-700)', marginBottom: '0.35rem' }}>
                    Default Discovery Region
                  </label>
                  <select
                    className="custom-select"
                    style={{ width: '100%', maxWidth: '340px' }}
                    value={defaultCity}
                    onChange={(e) => setDefaultCity(e.target.value)}
                  >
                    <option value="Madurai, Tamil Nadu">Madurai, Tamil Nadu</option>
                    <option value="Chennai, Tamil Nadu">Chennai, Tamil Nadu</option>
                    <option value="Coimbatore, Tamil Nadu">Coimbatore, Tamil Nadu</option>
                    <option value="Trichy, Tamil Nadu">Trichy, Tamil Nadu</option>
                    <option value="Bengaluru, Karnataka">Bengaluru, Karnataka</option>
                    <option value="Hyderabad, Telangana">Hyderabad, Telangana</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
