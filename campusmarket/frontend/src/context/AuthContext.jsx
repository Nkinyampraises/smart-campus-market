import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { api, saveToken, clearToken } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser]           = useState(null);
  const [isLoggedIn, setLoggedIn] = useState(false);
  const [loading, setLoading]     = useState(true);

  // On mount — restore session from stored token
  useEffect(() => {
    const token = localStorage.getItem('campustrade_token');
    if (!token) { setLoading(false); return; }

    api.getMe()
      .then((u) => { setUser(u); setLoggedIn(true); })
      .catch(() => { clearToken(); })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      const data = await api.login(email, password);
      saveToken(data.accessToken);
      const me = await api.getMe();
      setUser(me);
      setLoggedIn(true);
      return { success: true, user: me };
    } catch (err) {
      if (err.message?.includes('suspended')) return { success: false, suspended: true };
      return { success: false, error: err.message };
    }
  }, []);

  const register = useCallback(async (form) => {
    try {
      await api.register({
        email:       form.email,
        password:    form.password,
        first_name:  form.firstName,
        last_name:   form.lastName,
        campus_zone: form.campusZone,
      });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    setLoggedIn(false);
  }, []);

  const updateUser = useCallback(async (updates) => {
    try {
      await api.updateMe(updates);
      setUser((prev) => ({ ...prev, ...updates }));
    } catch (err) {
      console.error('Failed to update user:', err);
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fcf9f8]">
        <div className="w-8 h-8 border-4 border-[#ff6b1a] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, isLoggedIn, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
