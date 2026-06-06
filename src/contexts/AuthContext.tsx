import React, { createContext, useContext, useState, ReactNode } from 'react';
import api from '@/lib/api';
import { getStudents, getCategories } from '@/lib/store';

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
    // 1. Hardcoded Admin Check (Overrides Backend)
    if (email.trim().toLowerCase() === 'admin@pavitra.in' && password === 'Dasnadas') {
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('adminName', 'Admin User');
      localStorage.setItem('adminRole', 'admin');
      setIsAuthenticated(true);
      setAdminName('Admin User');
      setAdminRole('admin');
      return true;
    }

    try {
      // 2. Try Karyakarta / Sub-Karyakarta Login
      const students = await getStudents();
      
      const cleanMobile = (m: string | undefined) => {
        if (!m) return '';
        return m.replace(/\D/g, '').slice(-10);
      };

      const student = students.find(s => 
        s.email?.trim().toLowerCase() === email.trim().toLowerCase() && 
        cleanMobile(s.mobile) === cleanMobile(password)
      );

      if (student) {
        const categories = await getCategories();
        // Check if this student is assigned as a Karyakarta
        const karyakarta = categories.find(k => k.name === student.name);

        if (karyakarta) {
          const role = karyakarta.type === 'main' ? 'Karyakarta' : 'Sub-Karyakarta';
          localStorage.setItem('isAuthenticated', 'true');
          localStorage.setItem('adminName', student.name);
          localStorage.setItem('adminRole', role);
          setIsAuthenticated(true);
          setAdminName(student.name);
          setAdminRole(role);
          return true;
        }
      }
    } catch (error) {
      console.error('Karyakarta login check failed:', error);
    }

    return false;
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
