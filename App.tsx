import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import { MyWork } from './pages/MyWork'; // Added
import { ClientList } from './pages/Clients';
import { ClientCreate } from './pages/ClientCreate';
import { ClientDetails } from './pages/ClientDetails';
import { ClientEdit } from './pages/ClientEdit';
import { ProjectsList } from './pages/Projects';
import { ProjectCreate } from './pages/ProjectCreate';
import { ProjectDetails } from './pages/ProjectDetails';
import Settings from './pages/Settings';
import Reports from './src/pages/Reports';
import { FindingsList } from './src/pages/findings/FindingsList';
import { FindingDetails } from './src/pages/findings/FindingDetails';
import UsersAdmin from './src/pages/admin/UsersAdmin';
import RolesAdmin from './src/pages/admin/RolesAdmin';
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

const App: React.FC = () => {
  return (
    <HashRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<div className="text-white p-10">Reset flow placeholder</div>} />

          <Route path="/app" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="my-work" element={<MyWork />} />

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

            <Route path="settings" element={<Settings />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </HashRouter>
  );
};

export default App;
