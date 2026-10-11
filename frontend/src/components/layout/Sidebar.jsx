import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Flame,
  UserPlus,
  Clock,
  PhoneCall,
  CheckCircle2,
  XCircle,
  Brain,
  Compass,
  UploadCloud,
  BarChart3,
  Send,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { useLeads } from '../../context/LeadContext';
import { useAuth } from '../../context/AuthContext';

export const Sidebar = ({ isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { leads, currentUser } = useLeads();
  const { signOut } = useAuth();

  // Dynamic counts for lead statuses
  const hotCount = leads.filter(l => l.scoreTier === 'HOT').length;
  const newCount = leads.filter(l => l.status === 'New').length;
  const followCount = leads.filter(l => l.status === 'Follow-up').length;

  const closeMobile = () => {
    if (isMobileOpen) setIsMobileOpen(false);
  };

  const handleSignOut = async () => {
    closeMobile();
    await signOut();
    navigate('/login');
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div className="sidebar-backdrop" onClick={() => setIsMobileOpen(false)} />
      )}

      <aside className={`app-sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}>
        {/* Sidebar Header */}
        <div className="sidebar-header">
          <NavLink to="/dashboard" className="sidebar-brand" onClick={closeMobile}>
            <div className="sidebar-logo">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M4 5C4 3.89543 4.89543 3 6 3H14C17.3137 3 20 5.68629 20 9C20 12.3137 17.3137 15 14 15H9V20C9 20.5523 8.55228 21 8 21H5C4.44772 21 4 20.5523 4 20V5Z" fill="#FFFFFF"/>
                <circle cx="14" cy="9" r="3" fill="#FF7A00"/>
              </svg>
            </div>
            {!isCollapsed && (
              <div className="sidebar-brand-text">
                <div className="sidebar-brand-title">PRCBO <span>AI</span></div>
                <div className="sidebar-brand-subtitle">Lead Intelligence</div>
              </div>
            )}
          </NavLink>

          {/* Desktop collapse toggle */}
          <button
            className="navbar-toggle-btn hide-on-mobile"
            onClick={() => setIsCollapsed(!isCollapsed)}
            style={{ color: '#94A3B8' }}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Sidebar Nav Items */}
        <div className="sidebar-nav">
          {/* MAIN */}
          <div>
            {!isCollapsed && <div className="sidebar-nav-group-title">Main</div>}
            <ul className="sidebar-nav-list">
              <li>
                <NavLink
                  to="/dashboard"
                  className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
                  onClick={closeMobile}
                  title="Dashboard"
                >
                  <LayoutDashboard className="nav-icon" size={19} />
                  {!isCollapsed && <span>Dashboard</span>}
                </NavLink>
              </li>
            </ul>
          </div>

          {/* LEAD MANAGEMENT */}
          <div>
            {!isCollapsed && <div className="sidebar-nav-group-title">Lead Management</div>}
            <ul className="sidebar-nav-list">
              <li>
                <NavLink
                  to="/leads"
                  end
                  className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
                  onClick={closeMobile}
                  title="All Leads"
                >
                  <Users className="nav-icon" size={19} />
                  {!isCollapsed && <span>All Leads</span>}
                  {!isCollapsed && <span className="nav-badge">{leads.length}</span>}
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/leads?view=hot"
                  className={() => `sidebar-nav-item ${location.pathname === '/leads' && location.search.includes('view=hot') ? 'active' : ''}`}
                  onClick={closeMobile}
                  title="Hot Leads"
                >
                  <Flame className="nav-icon" size={19} style={{ color: '#FF7A00' }} />
                  {!isCollapsed && <span>Hot Leads</span>}
                  {!isCollapsed && (
                    <span className="nav-badge" style={{ backgroundColor: 'rgba(255, 122, 0, 0.25)', color: '#FF9A3D' }}>
                      {hotCount}
                    </span>
                  )}
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/leads?view=new"
                  className={() => `sidebar-nav-item ${location.pathname === '/leads' && location.search.includes('view=new') ? 'active' : ''}`}
                  onClick={closeMobile}
                  title="New Leads"
                >
                  <UserPlus className="nav-icon" size={19} />
                  {!isCollapsed && <span>New Leads</span>}
                  {!isCollapsed && <span className="nav-badge">{newCount}</span>}
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/leads?view=followup"
                  className={() => `sidebar-nav-item ${location.pathname === '/leads' && location.search.includes('view=followup') ? 'active' : ''}`}
                  onClick={closeMobile}
                  title="Follow-up"
                >
                  <Clock className="nav-icon" size={19} />
                  {!isCollapsed && <span>Follow-up</span>}
                  {!isCollapsed && <span className="nav-badge">{followCount}</span>}
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/leads?view=contacted"
                  className={() => `sidebar-nav-item ${location.pathname === '/leads' && location.search.includes('view=contacted') ? 'active' : ''}`}
                  onClick={closeMobile}
                  title="Contacted"
                >
                  <PhoneCall className="nav-icon" size={19} />
                  {!isCollapsed && <span>Contacted</span>}
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/leads?view=converted"
                  className={() => `sidebar-nav-item ${location.pathname === '/leads' && location.search.includes('view=converted') ? 'active' : ''}`}
                  onClick={closeMobile}
                  title="Converted"
                >
                  <CheckCircle2 className="nav-icon" size={19} style={{ color: '#10B981' }} />
                  {!isCollapsed && <span>Converted</span>}
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/leads?view=rejected"
                  className={() => `sidebar-nav-item ${location.pathname === '/leads' && location.search.includes('view=rejected') ? 'active' : ''}`}
                  onClick={closeMobile}
                  title="Rejected"
                >
                  <XCircle className="nav-icon" size={19} style={{ color: '#EF4444' }} />
                  {!isCollapsed && <span>Rejected</span>}
                </NavLink>
              </li>
            </ul>
          </div>

          {/* INTELLIGENCE */}
          <div>
            {!isCollapsed && <div className="sidebar-nav-group-title">Intelligence</div>}
            <ul className="sidebar-nav-list">
              <li>
                <NavLink
                  to="/ai-intelligence"
                  className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
                  onClick={closeMobile}
                  title="AI Intelligence"
                >
                  <Brain className="nav-icon" size={19} style={{ color: '#C084FC' }} />
                  {!isCollapsed && <span>AI Intelligence</span>}
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/discovery"
                  className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
                  onClick={closeMobile}
                  title="Business Discovery"
                >
                  <Compass className="nav-icon" size={19} />
                  {!isCollapsed && <span>Business Discovery</span>}
                </NavLink>
              </li>
            </ul>
          </div>

          {/* DATA */}
          <div>
            {!isCollapsed && <div className="sidebar-nav-group-title">Data</div>}
            <ul className="sidebar-nav-list">
              <li>
                <NavLink
                  to="/data-imports"
                  className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
                  onClick={closeMobile}
                  title="Data Imports"
                >
                  <UploadCloud className="nav-icon" size={19} />
                  {!isCollapsed && <span>Data Imports</span>}
                </NavLink>
              </li>
            </ul>
          </div>

          {/* INSIGHTS */}
          <div>
            {!isCollapsed && <div className="sidebar-nav-group-title">Insights</div>}
            <ul className="sidebar-nav-list">
              <li>
                <NavLink
                  to="/analytics"
                  className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
                  onClick={closeMobile}
                  title="Analytics"
                >
                  <BarChart3 className="nav-icon" size={19} />
                  {!isCollapsed && <span>Analytics</span>}
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/outreach"
                  className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
                  onClick={closeMobile}
                  title="Outreach"
                >
                  <Send className="nav-icon" size={19} />
                  {!isCollapsed && <span>Outreach</span>}
                </NavLink>
              </li>
            </ul>
          </div>

          {/* SYSTEM */}
          <div>
            {!isCollapsed && <div className="sidebar-nav-group-title">System</div>}
            <ul className="sidebar-nav-list">
              <li>
                <NavLink
                  to="/settings"
                  className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
                  onClick={closeMobile}
                  title="Settings"
                >
                  <Settings className="nav-icon" size={19} />
                  {!isCollapsed && <span>Settings</span>}
                </NavLink>
              </li>
            </ul>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">
              {currentUser.avatar}
            </div>
            {!isCollapsed && (
              <div className="sidebar-user-info">
                <div className="sidebar-user-name">{currentUser.name}</div>
                <div className="sidebar-user-role">{currentUser.role}</div>
              </div>
            )}
            {!isCollapsed && (
              <button
                type="button"
                onClick={handleSignOut}
                title="Logout"
                style={{
                  color: '#94A3B8',
                  padding: '4px',
                  borderRadius: '4px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
