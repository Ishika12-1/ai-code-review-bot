import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FolderGit2,
  GitPullRequest,
  CheckCircle2,
  AlertOctagon,
  Clock,
  ArrowUpRight,
  TrendingUp,
  ShieldCheck,
  Zap,
  ExternalLink,
  Plus,
  Code2,
  Sparkles,
  Github,
  History,
  ShieldAlert
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { dashboardApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function DashboardPage() {
  const { user, isAuthenticated, openAuthModal, initiateGithubOAuth } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    total_reviews: 0,
    average_score: 8.5,
    security_issues_found: 0,
    connected_repositories: 0,
    recent_reviews: [],
    severity_breakdown: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
    category_breakdown: { security: 0, performance: 0, quality: 0, bug: 0, style: 0 },
    activity_timeline: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const res = await dashboardApi.getStats();
        if (res.data) {
          setStats(res.data);
        }
      } catch (err) {
        console.error('Error fetching dashboard statistics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const severityPieData = [
    { name: 'Critical', value: stats.severity_breakdown.critical, color: '#EF4444' },
    { name: 'High', value: stats.severity_breakdown.high, color: '#F97316' },
    { name: 'Medium', value: stats.severity_breakdown.medium, color: '#F59E0B' },
    { name: 'Low', value: stats.severity_breakdown.low, color: '#3B82F6' },
    { name: 'Info', value: stats.severity_breakdown.info, color: '#10B981' },
  ].filter((item) => item.value > 0);

  // Fallback pie data if no findings in database yet
  const displayPieData = severityPieData.length > 0 ? severityPieData : [
    { name: 'Critical', value: 2, color: '#EF4444' },
    { name: 'High', value: 4, color: '#F97316' },
    { name: 'Medium', value: 8, color: '#F59E0B' },
    { name: 'Low', value: 5, color: '#3B82F6' },
  ];

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Developer Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-dark-muted mt-1">
            Real-time telemetry, AI review metrics, and security diagnostics
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Link
            to="/studio"
            className="flex items-center gap-1.5 rounded-xl border border-brand-500/30 bg-brand-500/10 px-3.5 py-2 text-xs font-semibold text-brand-600 dark:text-brand-300 hover:bg-brand-500/20 transition-all"
          >
            <Code2 className="h-4 w-4 text-brand-500" />
            <span>Review Code</span>
          </Link>

          {!user?.is_github_connected ? (
            <button
              onClick={initiateGithubOAuth}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-dark-hover shadow-sm transition-all"
            >
              <Github className="h-4 w-4" />
              <span>Connect GitHub</span>
            </button>
          ) : (
            <Link
              to="/repositories"
              className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-brand-500/20 hover:bg-brand-500 transition-colors"
            >
              <FolderGit2 className="h-4 w-4" />
              <span>View Repositories</span>
            </Link>
          )}

          <Link
            to="/reviews"
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-dark-hover shadow-sm transition-all"
          >
            <History className="h-4 w-4 text-slate-400" />
            <span>Review History</span>
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Reviews */}
        <div className="rounded-2xl p-5 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400 dark:text-dark-muted">
            <span className="text-xs font-bold uppercase tracking-wider">Total Code Reviews</span>
            <CheckCircle2 className="h-4 w-4 text-brand-500" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
            {stats.total_reviews}
          </div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
            <TrendingUp className="h-3 w-3" /> Live Telemetry
          </p>
        </div>

        {/* Card 2: Average Score */}
        <div className="rounded-2xl p-5 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400 dark:text-dark-muted">
            <span className="text-xs font-bold uppercase tracking-wider">Avg Quality Score</span>
            <Sparkles className="h-4 w-4 text-brand-500" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
            {stats.average_score}/10
          </div>
          <p className="text-[11px] text-slate-500 dark:text-dark-muted font-medium">
            Strict Senior Staff Benchmark
          </p>
        </div>

        {/* Card 3: Security Issues */}
        <div className="rounded-2xl p-5 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400 dark:text-dark-muted">
            <span className="text-xs font-bold uppercase tracking-wider">Security Issues</span>
            <AlertOctagon className="h-4 w-4 text-rose-500" />
          </div>
          <div className="text-3xl font-extrabold text-rose-600 dark:text-rose-400">
            {stats.security_issues_found}
          </div>
          <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold">
            OWASP Top 10 & CWE Flags
          </p>
        </div>

        {/* Card 4: Connected Repositories */}
        <div className="rounded-2xl p-5 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400 dark:text-dark-muted">
            <span className="text-xs font-bold uppercase tracking-wider">Connected Repos</span>
            <FolderGit2 className="h-4 w-4 text-brand-500" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
            {stats.connected_repositories}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-dark-muted font-medium">
            Active Webhooks & Repos
          </p>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Chart: Activity Trend */}
        <div className="lg:col-span-8 rounded-2xl p-5 sm:p-6 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Review Activity & Issue Velocity
              </h3>
              <p className="text-xs text-slate-500 dark:text-dark-muted">
                Weekly volume of reviews performed vs vulnerabilities flagged
              </p>
            </div>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.activity_timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorReviews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorIssues" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1E293B',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#FFF'
                  }}
                />
                <Area type="monotone" dataKey="reviews" name="Reviews" stroke="#6366F1" strokeWidth={2} fillOpacity={1} fill="url(#colorReviews)" />
                <Area type="monotone" dataKey="issues" name="Issues Found" stroke="#EF4444" strokeWidth={2} fillOpacity={1} fill="url(#colorIssues)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Chart: Severity Distribution */}
        <div className="lg:col-span-4 rounded-2xl p-5 sm:p-6 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Findings Severity Mix
            </h3>
            <p className="text-xs text-slate-500 dark:text-dark-muted">
              Distribution of flagged diagnostics
            </p>
          </div>

          <div className="h-44 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={displayPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {displayPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1E293B',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '11px',
                    color: '#FFF'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-dark-border text-xs">
            {displayPieData.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-slate-600 dark:text-slate-300 text-[11px] font-medium">
                  {item.name}: {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Reviews Table */}
      <div className="rounded-2xl bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Recent Code Reviews
            </h3>
            <p className="text-xs text-slate-500 dark:text-dark-muted">
              Latest analyses performed across Code Studio and GitHub repositories
            </p>
          </div>
          <Link
            to="/reviews"
            className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {stats.recent_reviews.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-500 dark:text-dark-muted">
            No code reviews recorded yet. Run a review in{' '}
            <Link to="/studio" className="text-brand-600 dark:text-brand-400 font-semibold underline">
              AI Code Studio
            </Link>{' '}
            to see live telemetry.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-dark-surface uppercase text-[10px] font-bold text-slate-400 dark:text-dark-muted border-b border-slate-200 dark:border-dark-border">
                <tr>
                  <th className="px-4 py-3 rounded-l-xl">Target / Review</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Findings</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 rounded-r-xl text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-dark-border font-medium">
                {stats.recent_reviews.map((rev) => (
                  <tr key={rev.id} className="hover:bg-slate-50 dark:hover:bg-dark-hover/50 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white max-w-xs truncate">
                      {rev.title || rev.repository_name || `Review #${rev.id}`}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-dark-surface uppercase">
                        {rev.review_type}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-mono font-bold">
                      <span
                        className={`px-2 py-0.5 rounded ${
                          (rev.score || 0) >= 8.5
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : (rev.score || 0) >= 7.0
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {rev.score || 'N/A'}/10
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      {rev.findings_count} item(s)
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 text-[11px]">
                      {new Date(rev.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Link
                        to={`/reviews/${rev.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
                      >
                        Details
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
