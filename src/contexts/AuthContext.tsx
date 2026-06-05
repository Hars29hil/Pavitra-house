import React, { createContext, useContext, useState, ReactNode } from 'react';
import api from '@/lib/api';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  adminName: string;
  adminRole: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('isAuthenticated') === 'true';
  });
  const [adminName, setAdminName] = useState<string>(() => {
    return localStorage.getItem('adminName') || 'Admin User';
  });
  const [adminRole, setAdminRole] = useState<string>(() => {
    return localStorage.getItem('adminRole') || '';
  });

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await api.post('/api/login', { email, password });
      if (response.data && response.data.success) {
        const admin = response.data.admin;
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('adminName', admin.name);
        localStorage.setItem('adminRole', admin.role || 'admin');
        setIsAuthenticated(true);
        setAdminName(admin.name);
        setAdminRole(admin.role || 'admin');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login request failed:', error);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('adminName');
    localStorage.removeItem('adminRole');
    setIsAuthenticated(false);
    setAdminName('Admin User');
    setAdminRole('');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, adminName, adminRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
