import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bot,
  Github,
  Code2,
  Sparkles,
  User,
  LogOut,
  Settings,
  ChevronDown,
  CheckCircle2,
  FolderGit2,
  History
} from 'lucide-react';
import { healthApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import ThemeToggle from './ThemeToggle';

export default function Navbar() {
  const [healthStatus, setHealthStatus] = useState('checking');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const {
    user,
    isAuthenticated,
    openAuthModal,
    logout,
    initiateGithubOAuth
  } = useAuth();

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const res = await healthApi.getHealth();
        if (res.data && res.data.status === 'healthy') {
          setHealthStatus('connected');
        } else {
          setHealthStatus('degraded');
        }
      } catch (err) {
        setHealthStatus('disconnected');
      }
    };
    checkBackend();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-dark-border bg-white/90 dark:bg-dark-bg/90 backdrop-blur-md transition-colors duration-200">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
            <Bot className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
              AI Code Review Bot
              <span className="rounded-md bg-brand-500/10 dark:bg-brand-500/20 px-1.5 py-0.5 text-[10px] font-bold text-brand-600 dark:text-brand-300 border border-brand-500/20 dark:border-brand-500/30">
                v1.0
              </span>
            </span>
            <span className="text-[11px] text-slate-500 dark:text-dark-muted hidden sm:inline">
              Automated Code Intelligence & PR Security
            </span>
          </div>
        </Link>

        {/* Right Section: Status, Theme Toggle, Code Studio, and Auth Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* API Health Status Badge */}
          <div className="hidden md:flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-medium border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-surface">
            <span className="relative flex h-2 w-2">
              {healthStatus === 'connected' && (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </>
              )}
              {healthStatus === 'checking' && (
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400"></span>
              )}
              {healthStatus === 'disconnected' && (
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              )}
            </span>
            <span className="text-slate-600 dark:text-slate-300 capitalize text-[11px]">
              API: {healthStatus}
            </span>
          </div>

          {/* Theme Toggle Button (Accessible everywhere) */}
          <ThemeToggle />

          {/* AI Code Studio Direct Button */}
          <Link
            to="/studio"
            className="flex items-center gap-1.5 rounded-xl border border-brand-500/30 bg-brand-500/10 px-3 py-1.5 text-xs font-semibold text-brand-600 dark:text-brand-300 hover:bg-brand-500/20 transition-all"
          >
            <Code2 className="h-4 w-4 text-brand-500" />
            <span className="hidden sm:inline">AI Code Studio</span>
            <span className="sm:hidden">Studio</span>
          </Link>

          {/* Authentication Aware Navigation */}
          {isAuthenticated && user ? (
            /* Logged-In User Menu */
            <div className="flex items-center gap-2">
              {/* GitHub Connection Badge / Quick Action */}
              {user.is_github_connected ? (
                <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                  <Github className="h-3.5 w-3.5" />
                  <span>GitHub Connected</span>
                </div>
              ) : (
                <button
                  onClick={initiateGithubOAuth}
                  className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-semibold border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-card text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-dark-hover transition-all"
                >
                  <Github className="h-3.5 w-3.5" />
                  <span>Connect GitHub</span>
                </button>
              )}

              {/* User Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 rounded-xl p-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-dark-hover transition-colors border border-transparent hover:border-slate-200 dark:hover:border-dark-border"
                >
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.name || user.username}
                      className="h-7 w-7 rounded-lg object-cover border border-slate-200 dark:border-dark-border"
                    />
                  ) : (
                    <div className="h-7 w-7 rounded-lg bg-brand-600 text-white flex items-center justify-center font-bold text-xs">
                      {(user.name || user.username || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="hidden sm:inline max-w-[100px] truncate">
                    {user.name || user.username}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border shadow-xl py-2 z-50 animate-fadeIn">
                    <div className="px-4 py-2 border-b border-slate-100 dark:border-dark-border">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {user.name || user.username}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-dark-muted truncate">
                        {user.email || `@${user.username}`}
                      </p>
                    </div>

                    <div className="py-1">
                      <Link
                        to="/dashboard"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-dark-hover"
                      >
                        <Sparkles className="h-4 w-4 text-brand-500" />
                        <span>Developer Dashboard</span>
                      </Link>

                      <Link
                        to="/repositories"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-dark-hover"
                      >
                        <FolderGit2 className="h-4 w-4 text-slate-400" />
                        <span>Repositories</span>
                      </Link>

                      <Link
                        to="/reviews"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-dark-hover"
                      >
                        <History className="h-4 w-4 text-slate-400" />
                        <span>Review History</span>
                      </Link>

                      <Link
                        to="/settings"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-dark-hover"
                      >
                        <Settings className="h-4 w-4 text-slate-400" />
                        <span>Account & Settings</span>
                      </Link>
                    </div>

                    <div className="border-t border-slate-100 dark:border-dark-border pt-1">
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          logout();
                          navigate('/');
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-left"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Unauthenticated Guest Actions */
            <div className="flex items-center gap-2">
              <button
                onClick={() => openAuthModal('login')}
                className="rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-dark-hover transition-colors"
              >
                Log In
              </button>
              <button
                onClick={() => openAuthModal('signup')}
                className="rounded-xl bg-brand-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-brand-500/20 hover:bg-brand-500 transition-colors"
              >
                Sign Up
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
