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

  useEffect(() => {
    async function initAuth() {
      try {
        const demoRes = await apiRequest<{ users: User[] }>('/auth/demo-users');
        setDemoUsers(demoRes.users || []);

        const token = getAuthToken();
        if (token) {
          const meRes = await apiRequest<{ user: User }>('/auth/me');
          setUser(meRes.user);
        }
      } catch (err) {
        console.warn('Backend API connection warning (running offline / static mode):', err);
        const fallbackUsers: User[] = [
          {
            id: 'cmv48mek2000uv82b1wnljb31',
            name: 'Vishal Rathee',
            email: 'faculty1@mirai.edu.in',
            role: 'FACULTY',
            campus: { id: 'cmv48mehw0000v82b08ihbdhq', name: 'HI-Tech' },
            batch: undefined,
          },
          {
            id: 'cmv48mek0000ov82bek4hhvea',
            name: 'Dr. Suresh Varma (Program Director)',
            email: 'admin@mirai.edu.in',
            role: 'ADMIN',
            campus: undefined,
            batch: undefined,
          },
          {
            id: 'cmv48mek1000qv82bqb80xwn7',
            name: 'Kavita Reddy (Campus Manager HI-Tech)',
            email: 'manager.hitech@mirai.edu.in',
            role: 'CAMPUS_MANAGER',
            campus: { id: 'cmv48mehw0000v82b08ihbdhq', name: 'HI-Tech' },
            batch: undefined,
          },
          {
            id: 'cmv48mek30010v82b0c2h80kt',
            name: 'Aarav Patel (Student BTech CSE AI/ML)',
            email: 'student@mirai.edu.in',
            role: 'STUDENT',
            campus: { id: 'cmv48mehw0000v82b08ihbdhq', name: 'HI-Tech' },
            batch: { id: 'cmv48mei6000gv82bezrqrsqk', name: 'BTech CSE (AI/ML) - Batch A (HI-Tech)' },
          },
        ];
        setDemoUsers(fallbackUsers);
        if (getAuthToken()) {
          setAuthToken(null);
        }
      } finally {
        setLoading(false);
      }
    }
    initAuth();
  }, []);

  const login = async (email: string, password: string = 'mirai123') => {
    try {
      const res = await apiRequest<{ token: string; user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setAuthToken(res.token);
      setUser(res.user);
    } catch (err) {
      const match = demoUsers.find((u) => u.email === email);
      if (err instanceof TypeError && match && password === 'mirai123') {
        setUser(match);
      } else {
        throw err;
      }
    }
  };

  const logout = () => {
    setAuthToken(null);
    setUser(null);
  };

  const switchRole = async (targetRole: Role) => {
    const targetUser = demoUsers.find((u) => u.role === targetRole);
    if (targetUser) {
      try {
        await login(targetUser.email, 'mirai123');
      } catch {
        setUser(targetUser);
      }
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
