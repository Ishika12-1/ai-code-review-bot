import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState('login'); // 'login' | 'signup'

  // Fetch current user details on mount if token exists
  const fetchCurrentUser = useCallback(async () => {
    const savedToken = localStorage.getItem('token');
    if (!savedToken) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await authApi.getMe();
      setUser(res.data);
    } catch (err) {
      console.warn('Session expired or invalid token. Clearing credentials.');
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  // Login handler
  const login = async (email, password) => {
    const res = await authApi.login({ email, password });
    const { access_token, user: userData } = res.data;
    localStorage.setItem('token', access_token);
    setToken(access_token);
    setUser(userData);
    setIsAuthModalOpen(false);
    return userData;
  };

  // Register handler
  const register = async (name, email, password, confirmPassword) => {
    const res = await authApi.register({
      name,
      email,
      password,
      confirm_password: confirmPassword,
    });
    const { access_token, user: userData } = res.data;
    localStorage.setItem('token', access_token);
    setToken(access_token);
    setUser(userData);
    setIsAuthModalOpen(false);
    return userData;
  };

  // Logout handler
  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  // GitHub OAuth redirect
  const initiateGithubOAuth = async () => {
    try {
      const res = await authApi.getGithubUrl();
      if (res.data?.url) {
        window.location.href = res.data.url;
      }
    } catch (err) {
      console.error('Error initiating GitHub OAuth:', err);
      alert('GitHub OAuth is not configured yet. Please provide GITHUB_CLIENT_ID in backend .env.');
    }
  };

  // Google OAuth redirect
  const initiateGoogleOAuth = async () => {
    try {
      const res = await authApi.getGoogleUrl();
      if (res.data?.url) {
        window.location.href = res.data.url;
      }
    } catch (err) {
      console.error('Error initiating Google OAuth:', err);
      alert('Google OAuth is not configured yet. Please provide GOOGLE_CLIENT_ID in backend .env.');
    }
  };

  // Disconnect GitHub
  const disconnectGithub = async () => {
    try {
      const res = await authApi.disconnectGithub();
      setUser(res.data);
      return res.data;
    } catch (err) {
      console.error('Failed to disconnect GitHub:', err);
      throw err;
    }
  };

  // Modal helpers
  const openAuthModal = (tab = 'login') => {
    setAuthModalTab(tab);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const setAuthTokenAndUser = (newToken, userData) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(userData);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(token && user),
        loading,
        isAuthModalOpen,
        authModalTab,
        openAuthModal,
        closeAuthModal,
        login,
        register,
        logout,
        refreshUser: fetchCurrentUser,
        initiateGithubOAuth,
        initiateGoogleOAuth,
        disconnectGithub,
        setAuthTokenAndUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
