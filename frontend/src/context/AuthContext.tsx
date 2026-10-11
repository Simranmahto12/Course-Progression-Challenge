import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role } from '../types';
import { apiRequest, setAuthToken, getAuthToken } from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  logout: () => void;
  switchRole: (role: Role) => Promise<void>;
  demoUsers: User[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [demoUsers, setDemoUsers] = useState<User[]>([]);

  // Load demo users list and current user if token exists
  useEffect(() => {
    async function initAuth() {
      try {
        const demoRes = await apiRequest<{ users: User[] }>('/auth/demo-users');
        setDemoUsers(demoRes.users || []);

        const token = getAuthToken();
        if (token) {
          const meRes = await apiRequest<{ user: User }>('/auth/me');
          setUser(meRes.user);
        } else if (demoRes.users && demoRes.users.length > 0) {
          // Auto-select faculty demo user by default if not logged in
          const defaultUser = demoRes.users.find((u) => u.role === 'FACULTY') || demoRes.users[0];
          await login(defaultUser.email, 'mirai123');
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        setLoading(false);
      }
    }
    initAuth();
  }, []);

  const login = async (email: string, password: string = 'mirai123') => {
    setLoading(true);
    try {
      const res = await apiRequest<{ token: string; user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setAuthToken(res.token);
      setUser(res.user);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setAuthToken(null);
    setUser(null);
  };

  const switchRole = async (targetRole: Role) => {
    const targetUser = demoUsers.find((u) => u.role === targetRole);
    if (targetUser) {
      await login(targetUser.email, 'mirai123');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, switchRole, demoUsers }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
