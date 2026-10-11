import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  Menu,
  Search,
  Bell,
  HelpCircle,
  ChevronDown,
  User,
  Settings,
  LogOut,
  Building,
  MapPin,
  Briefcase,
  X
} from 'lucide-react';
import { useLeads } from '../../context/LeadContext';
import { useAuth } from '../../context/AuthContext';

export const TopNavbar = ({ onToggleMobile }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { searchQuery, setSearchQuery, currentUser, leads, addToast } = useLeads();
  const { signOut } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const handleSignOut = async () => {
    setShowUserMenu(false);
    await signOut();
    navigate('/login');
  };

  // Generate breadcrumb title
  const getPageTitle = () => {
    const path = location.pathname;
    if (path.startsWith('/leads/')) return 'Lead Profile';
    if (path === '/leads') return 'Lead Management';
    if (path === '/ai-intelligence') return 'AI Intelligence';
    if (path === '/discovery') return 'Business Discovery';
    if (path === '/data-imports') return 'Data Imports';
    if (path === '/analytics') return 'Analytics & Reports';
    if (path === '/outreach') return 'Outreach Hub';
    if (path === '/settings') return 'Platform Settings';
    return 'Executive Dashboard';
  };

  // Live matching search results
  const filteredQuickResults = searchQuery.trim() === '' ? [] : leads.filter(lead => {
    const q = searchQuery.toLowerCase();
    return (
      lead.businessName.toLowerCase().includes(q) ||
      lead.location.toLowerCase().includes(q) ||
      lead.recommendedService.toLowerCase().includes(q) ||
      lead.category.toLowerCase().includes(q)
    );
  }).slice(0, 5);

  const notifications = [
    { id: 1, title: 'Hot Lead Alert', desc: 'Meenakshi Textiles scored 94/100 (Enterprise Ready)', time: '10m ago', unread: true },
    { id: 2, title: 'Outreach Delivered', desc: 'Aura Multispeciality opened your WhatsApp proposal', time: '1h ago', unread: true },
    { id: 3, title: 'Data Ingestion Complete', desc: 'Madurai SIDCO batch (480 records) processed', time: '3h ago', unread: false }
  ];

  return (
    <header className="app-navbar">
      {/* Left Section: Mobile trigger + Breadcrumb + Global Search */}
      <div className="navbar-left">
        <button
          className="navbar-toggle-btn show-on-mobile"
          onClick={onToggleMobile}
          aria-label="Open navigation drawer"
        >
          <Menu size={20} />
        </button>

        <div className="navbar-page-context">
          <div className="navbar-breadcrumb">PRCBO Tech <span>/</span> Platform</div>
          <div className="navbar-page-title">{getPageTitle()}</div>
        </div>

        {/* Global Search Bar */}
        <div className="navbar-search" style={{ position: 'relative' }}>
          <Search className="navbar-search-icon" size={17} />
          <input
            type="text"
            placeholder="Search businesses, locations, services..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearchResults(true);
            }}
            onFocus={() => setShowSearchResults(true)}
          />
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery('')}
              style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }}
            >
              <X size={14} />
            </button>
          ) : (
            <span className="navbar-search-hint">⌘K</span>
          )}

          {/* Quick Search Dropdown Preview */}
          {showSearchResults && searchQuery && (
            <div
              style={{
                position: 'absolute',
                top: '46px',
                left: 0,
                right: 0,
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                boxShadow: '0 12px 32px rgba(15, 23, 42, 0.15)',
                border: '1px solid var(--color-slate-200)',
                zIndex: 200,
                overflow: 'hidden'
              }}
            >
              <div style={{ padding: '0.625rem 0.875rem', backgroundColor: 'var(--color-slate-50)', borderBottom: '1px solid var(--color-slate-200)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-slate-500)', display: 'flex', justifyContent: 'space-between' }}>
                <span>Matching Leads & Services</span>
                <span>{filteredQuickResults.length} found</span>
              </div>

              {filteredQuickResults.length === 0 ? (
                <div style={{ padding: '1.25rem', textAlign: 'center', fontSize: '0.8125rem', color: 'var(--color-slate-500)' }}>
                  No matching businesses or services found.
                </div>
              ) : (
                <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                  {filteredQuickResults.map(item => (
                    <div
                      key={item.id}
                      onClick={() => {
                        setShowSearchResults(false);
                        navigate(`/leads/${item.id}`);
                      }}
                      style={{
                        padding: '0.75rem 1rem',
                        borderBottom: '1px solid var(--color-slate-100)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-slate-50)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFFFFF'}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-slate-900)' }}>
                          {item.businessName}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'var(--color-slate-500)', marginTop: '2px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><MapPin size={11} /> {item.location}</span>
                          <span>•</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><Briefcase size={11} /> {item.recommendedService}</span>
                        </div>
                      </div>
                      <span className="badge badge-new" style={{ fontSize: '0.6875rem' }}>
                        AI {item.aiScore}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div
                onClick={() => {
                  setShowSearchResults(false);
                  navigate('/leads');
                }}
                style={{
                  padding: '0.625rem',
                  textAlign: 'center',
                  backgroundColor: 'var(--color-primary-light)',
                  color: 'var(--color-primary)',
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                  cursor: 'pointer'
                }}
              >
                View all results in Leads CRM &rarr;
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Section: Notification, Help, Profile */}
      <div className="navbar-right">
        {/* Help */}
        <button
          className="navbar-action-btn"
          title="Platform Guidance"
          onClick={() => addToast("PRCBO Lead Intelligence documentation is available in /docs", "info")}
        >
          <HelpCircle size={19} />
        </button>

        {/* Notifications */}
        <div style={{ position: 'relative' }}>
          <button
            className="navbar-action-btn"
            title="Notifications"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <Bell size={19} />
            <span className="navbar-notification-dot" />
          </button>

          {showNotifications && (
            <div
              style={{
                position: 'absolute',
                top: '48px',
                right: 0,
                width: '320px',
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                boxShadow: '0 12px 32px rgba(15, 23, 42, 0.15)',
                border: '1px solid var(--color-slate-200)',
                zIndex: 200,
                overflow: 'hidden'
              }}
            >
              <div style={{ padding: '0.875rem 1rem', borderBottom: '1px solid var(--color-slate-200)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Notifications</span>
                <span style={{ fontSize: '0.6875rem', color: 'var(--color-primary)', fontWeight: 600 }}>Mark all read</span>
              </div>
              <div>
                {notifications.map(n => (
                  <div key={n.id} style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--color-slate-100)', backgroundColor: n.unread ? 'var(--color-primary-light)' : 'transparent' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-slate-900)' }}>{n.title}</span>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--color-slate-400)' }}>{n.time}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-600)' }}>{n.desc}</div>
                  </div>
                ))}
              </div>
              <div style={{ padding: '0.5rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--color-slate-500)', backgroundColor: 'var(--color-slate-50)' }}>
                Powered by PRCBO Event Bus
              </div>
            </div>
          )}
        </div>

        {/* User Chip */}
        <div style={{ position: 'relative' }}>
          <div className="navbar-user-chip" onClick={() => setShowUserMenu(!showUserMenu)}>
            <div className="navbar-user-avatar">
              {currentUser.avatar}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
              <span className="navbar-user-name">{currentUser.name}</span>
              <span style={{ fontSize: '0.6875rem', color: 'var(--color-primary)', fontWeight: 600, lineHeight: 1 }}>Admin</span>
            </div>
            <ChevronDown size={14} style={{ color: 'var(--color-slate-400)', marginLeft: '4px' }} />
          </div>

          {/* User Menu Dropdown */}
          {showUserMenu && (
            <div
              style={{
                position: 'absolute',
                top: '48px',
                right: 0,
                width: '210px',
                backgroundColor: '#FFFFFF',
                borderRadius: '10px',
                boxShadow: '0 10px 25px rgba(15, 23, 42, 0.12)',
                border: '1px solid var(--color-slate-200)',
                zIndex: 200,
                padding: '0.5rem 0'
              }}
            >
              <div style={{ padding: '0.5rem 1rem', borderBottom: '1px solid var(--color-slate-100)' }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{currentUser.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-400)' }}>{currentUser.email}</div>
              </div>
              <Link
                to="/settings"
                onClick={() => setShowUserMenu(false)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.625rem 1rem', fontSize: '0.8125rem', color: 'var(--color-slate-700)' }}
              >
                <User size={15} /> My Profile
              </Link>
              <Link
                to="/settings"
                onClick={() => setShowUserMenu(false)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.625rem 1rem', fontSize: '0.8125rem', color: 'var(--color-slate-700)' }}
              >
                <Settings size={15} /> Platform Settings
              </Link>
              <div style={{ borderTop: '1px solid var(--color-slate-100)', marginTop: '0.25rem' }} />
              <button
                type="button"
                onClick={handleSignOut}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '0.625rem 1rem',
                  fontSize: '0.8125rem',
                  color: 'var(--color-danger)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <LogOut size={15} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopNavbar;
