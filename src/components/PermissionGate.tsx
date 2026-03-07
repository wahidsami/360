import React from 'react';
import { Permission } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface PermissionGateProps {
    children: React.ReactNode;
    permission: Permission;
    fallback?: React.ReactNode;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({ children, permission, fallback = null }) => {
    const { can } = useAuth();

    if (can(permission)) {
        return <>{children}</>;
    }

    return <>{fallback}</>;
};
