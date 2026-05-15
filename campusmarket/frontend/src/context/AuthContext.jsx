import React, { createContext, useContext, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { currentUser } from '../data/mockData';

const AuthContext = createContext(null);

const STORAGE_KEY = 'campustrade_auth';

const getStoredAuth = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // ignore
  }
  // Default: logged in for demo
  return { isLoggedIn: true, user: currentUser };
};

export const AuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState(getStoredAuth);

  const persistAuth = (state) => {
    setAuthState(state);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  };

  const login = useCallback((email, password) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simulate: check for suspended account
        if (email.includes('suspended')) {
          resolve({ success: false, suspended: true });
          return;
        }
        const user = { ...currentUser, email };
        persistAuth({ isLoggedIn: true, user });
        resolve({ success: true, user });
      }, 800);
    });
  }, []);

  const logout = useCallback(() => {
    persistAuth({ isLoggedIn: false, user: null });
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const register = useCallback((data) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newUser = {
          ...currentUser,
          ...data,
          name: `${data.firstName} ${data.lastName}`,
          initials: `${data.firstName[0]}${data.lastName[0]}`.toUpperCase(),
          id: `u_${Date.now()}`,
        };
        // Don't log in yet – they must verify email
        resolve({ success: true, user: newUser });
      }, 800);
    });
  }, []);

  const updateUser = useCallback((updates) => {
    setAuthState((prev) => {
      const next = { ...prev, user: { ...prev.user, ...updates } };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn: authState.isLoggedIn,
        user: authState.user,
        login,
        logout,
        register,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
