import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Role } from '../types';
import { AdminDashboard } from './dashboard/AdminDashboard';
import { DevDashboard } from './dashboard/DevDashboard';
import { FinanceDashboard } from './dashboard/FinanceDashboard';
import { ClientDashboard } from './dashboard/ClientDashboard';

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  if (!user) return null;

  switch (user.role) {
    case Role.DEV:
      return <DevDashboard role={user.role} />;
    case Role.FINANCE:
      return <FinanceDashboard role={user.role} />;
    case Role.CLIENT_OWNER:
    case Role.CLIENT_MANAGER:
    case Role.CLIENT_MEMBER:
    case Role.VIEWER:
      return <ClientDashboard role={user.role} />;
    default:
      // SUPER_ADMIN, OPS, PM
      return <AdminDashboard role={user.role} />;
  }
};

export default Dashboard;
