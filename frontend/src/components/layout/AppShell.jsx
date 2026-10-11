import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopNavbar from './TopNavbar';
import ToastContainer from '../common/Toast';

export const AppShell = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      {/* Main Wrapper */}
      <div className={`app-main-wrapper ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <TopNavbar onToggleMobile={() => setIsMobileOpen(true)} />
        
        <main className="app-content">
          <Outlet />
        </main>
      </div>

      {/* Floating Notifications */}
      <ToastContainer />
    </div>
  );
};

export default AppShell;
