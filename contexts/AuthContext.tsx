import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role, Permission, ROLE_PERMISSIONS } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string) => Promise<void>;
  logout: () => void;
  can: (permission: Permission) => boolean;
  impersonate: (userId: string) => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const currentUser = await api.auth.me();
        setUser(currentUser);
      } catch (e) {
        console.error("Failed to restore session", e);
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = async (email: string) => {
    const { user: loggedInUser } = await api.auth.login(email);
    setUser(loggedInUser);
  };


  /* Demo Only */
  const impersonate = async (userId: string) => {
    const users = await api.admin.getUsers();
    const targetUser = users.find(u => u.id === userId);
    if (targetUser) {
      setUser(targetUser);
      // In a real app we would get a new token, but for demo we just switch user state
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('nebula_auth_token');
  };

  const can = (permission: Permission): boolean => {
    if (!user) return false;
    const userPermissions = ROLE_PERMISSIONS[user.role] || [];
    return userPermissions.includes(permission);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, can, impersonate, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
