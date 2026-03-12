import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AIProvider } from './contexts/AIContext';
import { Layout } from './components/Layout';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Signup from './pages/Signup';
import AcceptInvite from './pages/auth/AcceptInvite';
import AuthCallback from './pages/auth/AuthCallback';
import Dashboard from './pages/Dashboard';
import { ClientList } from './pages/Clients';
import { ClientCreate } from './pages/ClientCreate';
import { ClientDetails } from './pages/ClientDetails';
import { ClientEdit } from './pages/ClientEdit';
import { ProjectsList } from './pages/Projects';
import { ProjectCreate } from './pages/ProjectCreate';
import { ProjectDetails } from './pages/ProjectDetails';
import { ProjectEdit } from './pages/ProjectEdit';
import Settings from './pages/Settings';
import { MyWork } from './pages/MyWork';
import { Reports } from './pages/Reports';
import { FindingsList } from './pages/findings/FindingsList';
import { FindingDetails } from './pages/findings/FindingDetails';
import UsersAdmin from './pages/admin/UsersAdmin';
import RolesAdmin from './pages/admin/RolesAdmin';
import Automations from './pages/Automations';
import Integrations from './pages/Integrations';
import Calendar from './pages/Calendar';
import Wiki from './pages/Wiki';
import Analytics from './pages/Analytics';
import ErrorBoundary from './components/ui/ErrorBoundary';
import './services/i18n';

// Protected Route Wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-cyan-500">Initializing...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

// Placeholder for missing pages
const Placeholder = ({ title }: { title: string }) => (
  <div className="flex flex-col items-center justify-center h-96 text-slate-500">
    <h2 className="text-2xl font-bold mb-2 text-slate-300">{title}</h2>
    <p>This module is under development.</p>
  </div>
);

import { Toaster } from 'react-hot-toast';

const App: React.FC = () => {
  React.useEffect(() => {
    const theme = localStorage.getItem('arena360_theme') || 'dark';
    document.documentElement.classList.toggle('theme-light', theme === 'light');
    localStorage.setItem('arena360_theme', theme);
  }, []);

  return (
    <HashRouter>
      <ErrorBoundary>
        <AuthProvider>
          <AIProvider>
          <Toaster position="top-center" toastOptions={{ duration: 4000 }} />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/accept-invite" element={<AcceptInvite />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/signup" element={<Signup />} />

            <Route path="/app" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="my-work" element={<MyWork />} />
              <Route path="calendar" element={<Calendar />} />

              <Route path="clients">
                <Route index element={<ClientList />} />
                <Route path="new" element={<ClientCreate />} />
                <Route path=":clientId" element={<ClientDetails />} />
                <Route path=":clientId/edit" element={<ClientEdit />} />
              </Route>

              <Route path="projects">
                <Route index element={<ProjectsList />} />
                <Route path="new" element={<ProjectCreate />} />
                <Route path=":projectId" element={<ProjectDetails />} />
                <Route path=":projectId/edit" element={<ProjectEdit />} />
              </Route>

              <Route path="reports" element={<Reports />} />

              <Route path="findings">
                <Route index element={<FindingsList />} />
                <Route path=":findingId" element={<FindingDetails />} />
              </Route>

              <Route path="admin">
                <Route path="users" element={<UsersAdmin />} />
                <Route path="roles" element={<RolesAdmin />} />
              </Route>

              <Route path="automations" element={<Automations />} />

              <Route path="integrations" element={<Integrations />} />

              <Route path="wiki" element={<Wiki />} />

              <Route path="analytics" element={<Analytics />} />

              <Route path="settings" element={<Settings />} />
            </Route>

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
          </AIProvider>
        </AuthProvider>
      </ErrorBoundary>
    </HashRouter>
  );
};

export default App;