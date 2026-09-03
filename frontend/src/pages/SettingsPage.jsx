import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Key,
  Bot,
  Shield,
  Save,
  Check,
  User,
  Github,
  Mail,
  Sun,
  Moon,
  LogOut,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { authApi } from '../services/api';

export default function SettingsPage() {
  const {
    user,
    isAuthenticated,
    initiateGithubOAuth,
    disconnectGithub,
    refreshUser
  } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Profile form state
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState('');

  // AI review settings state
  const [model, setModel] = useState('gpt-4o-mini');
  const [minSeverity, setMinSeverity] = useState('MEDIUM');
  const [checkSecurity, setCheckSecurity] = useState(true);
  const [checkPerformance, setCheckPerformance] = useState(true);
  const [checkQuality, setCheckQuality] = useState(true);
  const [checkStyle, setCheckStyle] = useState(false);
  const [aiSaved, setAiSaved] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || user.username || '');
      setEmail(user.email || '');
    }
  }, [user]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSaved(false);
    try {
      await authApi.updateProfile({ name, email });
      await refreshUser();
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch (err) {
      console.error('Failed to update profile:', err);
      setProfileError(err.response?.data?.detail || 'Failed to update profile.');
    }
  };

  const handleSaveAiSettings = (e) => {
    e.preventDefault();
    setAiSaved(true);
    setTimeout(() => setAiSaved(false), 3000);
  };

  const handleDisconnectGithub = async () => {
    if (window.confirm('Are you sure you want to disconnect your GitHub account?')) {
      try {
        await disconnectGithub();
        await refreshUser();
      } catch (err) {
        alert('Failed to disconnect GitHub account.');
      }
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          System Settings & Profile
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-dark-muted mt-1">
          Manage your developer profile, connected GitHub authentication, and AI review thresholds.
        </p>
      </div>

      {/* 1. Profile Information Card */}
      {isAuthenticated && (
        <div className="rounded-2xl p-6 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            <User className="h-5 w-5 text-brand-500" />
            <span>Developer Account Profile</span>
          </div>

          {profileError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span>{profileError}</span>
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-surface p-2.5 text-slate-900 dark:text-white focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-surface p-2.5 text-slate-900 dark:text-white focus:border-brand-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2 text-xs font-semibold text-white hover:bg-brand-500 shadow-md shadow-brand-500/20 transition-all"
            >
              {profileSaved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              <span>{profileSaved ? 'Profile Updated!' : 'Update Profile'}</span>
            </button>
          </form>
        </div>
      )}

      {/* 2. Connected Integrations (GitHub) */}
      <div className="rounded-2xl p-6 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
          <Github className="h-5 w-5" />
          <span>Connected GitHub Authentication</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-surface">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-900 text-white dark:bg-dark-card">
              <Github className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  GitHub OAuth Integration
                </h4>
                {user?.is_github_connected ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Connected
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 dark:bg-dark-card text-slate-600 dark:text-slate-400">
                    Not Linked
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-dark-muted mt-0.5">
                Enables repository exploration, file audits, and automated PR review comments.
              </p>
            </div>
          </div>

          <div>
            {user?.is_github_connected ? (
              <button
                onClick={handleDisconnectGithub}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 transition-colors"
              >
                Disconnect
              </button>
            ) : (
              <button
                onClick={initiateGithubOAuth}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 shadow-sm transition-all"
              >
                Connect GitHub
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. AI Model & Rules Configuration */}
      <form onSubmit={handleSaveAiSettings} className="space-y-6">
        <div className="rounded-2xl p-6 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            <Bot className="h-5 w-5 text-brand-500" />
            <span>AI Review Engine Configuration</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                OpenAI Model
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-surface p-2.5 text-slate-900 dark:text-white focus:border-brand-500 focus:outline-none"
              >
                <option value="gpt-4o-mini">gpt-4o-mini (Fast, High Throughput, Cost-Effective)</option>
                <option value="gpt-4o">gpt-4o (Deep Architectural & Security Reasoning)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Minimum Severity Threshold
              </label>
              <select
                value={minSeverity}
                onChange={(e) => setMinSeverity(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-surface p-2.5 text-slate-900 dark:text-white focus:border-brand-500 focus:outline-none"
              >
                <option value="INFO">INFO (Report all observations)</option>
                <option value="LOW">LOW (Low + Medium + High + Critical)</option>
                <option value="MEDIUM">MEDIUM (Recommended: Ignore minor nits)</option>
                <option value="HIGH">HIGH (High & Critical blockers only)</option>
                <option value="CRITICAL">CRITICAL (Only vulnerabilities & crashes)</option>
              </select>
            </div>
          </div>
        </div>

        {/* 4. Inspection Domains */}
        <div className="rounded-2xl p-6 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            <Shield className="h-5 w-5 text-emerald-500" />
            <span>Inspection Domains</span>
          </div>

          <div className="space-y-3 text-xs">
            <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-surface cursor-pointer hover:bg-slate-100 dark:hover:bg-dark-hover/50 transition-colors">
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white">Security Vulnerabilities</span>
                <p className="text-[11px] text-slate-500 dark:text-dark-muted">OWASP Top 10, Auth bypass, SQLi, Secret leak checks</p>
              </div>
              <input
                type="checkbox"
                checked={checkSecurity}
                onChange={(e) => setCheckSecurity(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
            </label>

            <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-surface cursor-pointer hover:bg-slate-100 dark:hover:bg-dark-hover/50 transition-colors">
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white">Performance & Complexity</span>
                <p className="text-[11px] text-slate-500 dark:text-dark-muted">N+1 queries, memory leaks, event loop blocking</p>
              </div>
              <input
                type="checkbox"
                checked={checkPerformance}
                onChange={(e) => setCheckPerformance(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
            </label>

            <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-surface cursor-pointer hover:bg-slate-100 dark:hover:bg-dark-hover/50 transition-colors">
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white">Code Quality & Error Handling</span>
                <p className="text-[11px] text-slate-500 dark:text-dark-muted">Unhandled edge cases, bare except statements</p>
              </div>
              <input
                type="checkbox"
                checked={checkQuality}
                onChange={(e) => setCheckQuality(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
            </label>
          </div>

          <button
            type="submit"
            className="flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-brand-500 shadow-md shadow-brand-500/20 transition-all"
          >
            {aiSaved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            <span>{aiSaved ? 'Configuration Saved!' : 'Save AI Configuration'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
