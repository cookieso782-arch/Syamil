import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role, JWTPayload } from '../types/index.ts';
import {
  DEMO_USERS,
  ROLE_ACCOUNTS,
  RoleAccount,
  getStoredSession,
  saveSession,
  clearSession,
  decodeJWT,
  hasPermission,
  authenticateUser,
  getAllowedMenusForRole,
} from '../services/authService.ts';

interface AuthContextType {
  user: User | null;
  token: string | null;
  decodedToken: JWTPayload | null;
  isAuthenticated: boolean;
  login: (identifier: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  switchUser: (targetUser: User) => void;
  can: (action: 'create' | 'edit' | 'delete' | 'export' | 'import' | 'security_view') => boolean;
  allowedMenus: string[];
  roleAccounts: RoleAccount[];
  demoUsers: User[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [decodedToken, setDecodedToken] = useState<JWTPayload | null>(null);

  useEffect(() => {
    const session = getStoredSession();
    if (session) {
      setUser(session.user);
      setToken(session.token);
      const decoded = decodeJWT(session.token);
      setDecodedToken(decoded.payload);
    }
  }, []);

  const login = async (identifier: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    const result = authenticateUser(identifier, pass);
    if (!result.success || !result.user) {
      return { success: false, error: result.error || 'Autentikasi gagal.' };
    }

    const session = saveSession(result.user);
    setUser(result.user);
    setToken(session.token);
    const decoded = decodeJWT(session.token);
    setDecodedToken(decoded.payload);
    return { success: true };
  };

  const logout = () => {
    clearSession();
    setUser(null);
    setToken(null);
    setDecodedToken(null);
  };

  const switchUser = (targetUser: User) => {
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return;
    }
    const session = saveSession(targetUser);
    setUser(targetUser);
    setToken(session.token);
    const decoded = decodeJWT(session.token);
    setDecodedToken(decoded.payload);
  };

  const allowedMenus = user ? getAllowedMenusForRole(user.role) : ['dashboard'];

  const can = (action: 'create' | 'edit' | 'delete' | 'export' | 'import' | 'security_view'): boolean => {
    if (!user) return action === 'export';
    return hasPermission(user.role, action);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        decodedToken,
        isAuthenticated: !!user,
        login,
        logout,
        switchUser,
        can,
        allowedMenus,
        roleAccounts: ROLE_ACCOUNTS,
        demoUsers: DEMO_USERS,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
