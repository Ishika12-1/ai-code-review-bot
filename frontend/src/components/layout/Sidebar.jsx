import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Code2,
  FolderGit2,
  GitPullRequest,
  History,
  Settings,
  ShieldAlert,
  HelpCircle,
  ExternalLink,
  Sparkles
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'AI Code Studio', href: '/studio', icon: Code2, highlight: true },
  { name: 'Repositories', href: '/repositories', icon: FolderGit2 },
  { name: 'Pull Requests', href: '/pull-requests', icon: GitPullRequest },
  { name: 'Review History', href: '/reviews', icon: History },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Sidebar() {
  return (
    <aside className="w-64 flex-shrink-0 border-r border-slate-200/80 dark:border-dark-border bg-white/70 dark:bg-dark-surface/50 min-h-[calc(100vh-4rem)] flex flex-col justify-between p-4 transition-colors duration-200">
      {/* Main Navigation Links */}
      <div className="space-y-1">
        <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-dark-muted">
          Workspace
        </div>
        {navigation.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                `flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-brand-500/10 text-brand-600 dark:text-brand-300 border border-brand-500/30 shadow-sm'
                    : item.highlight
                    ? 'text-brand-600 dark:text-brand-400 hover:bg-brand-500/10 border border-brand-500/20'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-hover hover:text-slate-900 dark:hover:text-slate-100'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <Icon className={`h-4 w-4 flex-shrink-0 ${item.highlight ? 'text-brand-500' : ''}`} />
                <span>{item.name}</span>
              </div>
              {item.highlight && (
                <span className="flex h-2 w-2 rounded-full bg-brand-500 animate-pulse" />
              )}
            </NavLink>
          );
        })}
      </div>

      {/* Footer Info Box */}
      <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-dark-border">
        <div className="rounded-2xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-card/60 p-3.5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold text-brand-600 dark:text-brand-400">
            <ShieldAlert className="h-4 w-4" />
            <span>AI Review Engine</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-dark-muted leading-relaxed">
            OpenAI GPT-4o & Heuristic analyzer with structured schema verification.
          </p>
        </div>

        <a
          href="/docs"
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-hover hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <span className="flex items-center gap-2">
            <HelpCircle className="h-3.5 w-3.5" />
            API Documentation
          </span>
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </aside>
  );
}
