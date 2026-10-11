import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LeadProvider } from './context/LeadContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AppShell from './components/layout/AppShell';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import LeadDetails from './pages/LeadDetails';
import AIIntelligence from './pages/AIIntelligence';
import Discovery from './pages/Discovery';
import DataImports from './pages/DataImports';
import Analytics from './pages/Analytics';
import Outreach from './pages/Outreach';
import Settings from './pages/Settings';

export function App() {
  return (
    <AuthProvider>
      <LeadProvider>
        <Routes>
          {/* Public Authentication Route */}
          <Route path="/login" element={<Login />} />

          {/* Protected Application Routes Guarded by Supabase Auth Session */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/leads" element={<Leads />} />
              <Route path="/leads/:id" element={<LeadDetails />} />
              <Route path="/ai-intelligence" element={<AIIntelligence />} />
              <Route path="/discovery" element={<Discovery />} />
              <Route path="/data-imports" element={<DataImports />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/outreach" element={<Outreach />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Route>

          {/* Default and Catch-all Redirects */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </LeadProvider>
    </AuthProvider>
  );
}

export default App;
