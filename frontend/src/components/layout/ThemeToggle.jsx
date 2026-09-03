import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function ThemeToggle({ showLabel = true, className = '' }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      type="button"
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 border ${
        isDark
          ? 'bg-dark-card border-dark-border text-amber-300 hover:bg-dark-hover hover:text-amber-200'
          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm'
      } ${className}`}
      aria-label="Toggle color theme"
    >
      {isDark ? (
        <>
          <Sun className="h-4 w-4 text-amber-400 animate-spin-slow" />
          {showLabel && <span>Light Mode</span>}
        </>
      ) : (
        <>
          <Moon className="h-4 w-4 text-indigo-600" />
          {showLabel && <span>Dark Mode</span>}
        </>
      )}
    </button>
  );
}
