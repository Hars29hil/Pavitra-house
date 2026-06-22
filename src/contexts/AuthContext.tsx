import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '@/lib/api';
import { getStudents, getCategories } from '@/lib/store';
import { requestNotificationPermission } from '@/lib/firebase';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  adminName: string;
  adminRole: string;
  studentId: string;
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
  const [studentId, setStudentId] = useState<string>(() => {
    return localStorage.getItem('studentId') || '';
  });

  useEffect(() => {
    if (isAuthenticated && studentId) {
      const email = adminRole === 'admin' ? 'admin@pavitra.com' : '';
      requestNotificationPermission(studentId, email);
    }
  }, [isAuthenticated, studentId, adminRole]);

  const login = async (email: string, password: string): Promise<boolean> => {
    const cleanEmail = email.trim().toLowerCase();

    // 1. Hardcoded Admin Check (Overrides Backend)
    // Accept both admin@pavitra.in and admin@pavitra.com
    if ((cleanEmail === 'admin@pavitra.in' || cleanEmail === 'admin@pavitra.com') && password === 'Dasnadas') {
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('adminName', 'Admin User');
      localStorage.setItem('adminRole', 'admin');
      localStorage.setItem('studentId', 'admin');
      setIsAuthenticated(true);
      setAdminName('Admin User');
      setAdminRole('admin');
      setStudentId('admin');
      
      setTimeout(() => {
        requestNotificationPermission('admin', cleanEmail);
      }, 1000);
      
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
        s.email?.trim().toLowerCase() === cleanEmail && 
        cleanMobile(s.mobile) === cleanMobile(password)
      );

      if (student) {
        const categories = await getCategories();
        // Check if this student is assigned as a Karyakarta
        const karyakarta = categories.find(k => k.name === student.name);

        if (!karyakarta) {
          // Normal yuvak is not allowed to log in (only Karyakartas / Sub-Karyakartas)
          return false;
        }

        const role = karyakarta.type === 'main' ? 'Karyakarta' : 'Sub-Karyakarta';

        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('adminName', student.name);
        localStorage.setItem('adminRole', role);
        localStorage.setItem('studentId', student.id);
        
        setIsAuthenticated(true);
        setAdminName(student.name);
        setAdminRole(role);
        setStudentId(student.id);

        setTimeout(() => {
          requestNotificationPermission(student.id, student.email || '');
        }, 1000);

        return true;
      }
    } catch (error) {
      console.error('Karyakarta login check failed:', error);
    }

    try {
      // 3. Fallback: Try Backend User Login (from database users table)
      const res = await api.post('/api/login', { email: cleanEmail, password });
      if (res.data && res.data.success) {
        const adminData = res.data.admin;
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('adminName', adminData.name || 'Admin User');
        localStorage.setItem('adminRole', adminData.role || 'admin');
        localStorage.setItem('studentId', adminData.id || 'admin');
        setIsAuthenticated(true);
        setAdminName(adminData.name || 'Admin User');
        setAdminRole(adminData.role || 'admin');
        setStudentId(adminData.id || 'admin');

        setTimeout(() => {
          requestNotificationPermission(adminData.id || 'admin', cleanEmail);
        }, 1000);

        return true;
      }
    } catch (error) {
      console.error('Backend login check failed:', error);
    }

    return false;
  };

  const logout = () => {
    localStorage.setItem('isAuthenticated', 'false');
    localStorage.removeItem('adminName');
    localStorage.removeItem('adminRole');
    localStorage.removeItem('studentId');
    setIsAuthenticated(false);
    setAdminName('Admin User');
    setAdminRole('');
    setStudentId('');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, adminName, adminRole, studentId }}>
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
