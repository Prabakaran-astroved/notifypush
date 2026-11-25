import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginAdmin, getMe } from '../api/authApi';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('pushhub_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('pushhub_token'));
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    const storedToken = localStorage.getItem('pushhub_token');
    if (!storedToken) {
      setUser(null);
      setToken(null);
      setLoading(false);
      return;
    }

    try {
      const res = await getMe();
      if (res.data.success) {
        setUser(res.data.user);
        localStorage.setItem('pushhub_user', JSON.stringify(res.data.user));
      } else {
        logout();
      }
    } catch {
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();

    const handleAuthChange = () => {
      checkAuth();
    };

    window.addEventListener('auth-changed', handleAuthChange);
    return () => window.removeEventListener('auth-changed', handleAuthChange);
  }, []);

  const login = async (email, password) => {
    const res = await loginAdmin(email, password);
    if (res.data.success) {
      localStorage.setItem('pushhub_token', res.data.token);
      localStorage.setItem('pushhub_user', JSON.stringify(res.data.user));
      setToken(res.data.token);
      setUser(res.data.user);
      return res.data;
    }
    throw new Error(res.data.message || 'Login failed');
  };

  const logout = () => {
    localStorage.removeItem('pushhub_token');
    localStorage.removeItem('pushhub_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!token && !!user, login, logout, loading, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
