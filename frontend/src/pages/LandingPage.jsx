import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bot,
  ShieldCheck,
  Zap,
  GitPullRequest,
  CheckCircle,
  ArrowRight,
  Code2,
  Cpu,
  Layers,
  Terminal,
  Sparkles,
  AlertTriangle,
  Github,
  UserPlus,
  Lock,
  Play
} from 'lucide-react';
import { healthApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function LandingPage() {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { isAuthenticated, openAuthModal, initiateGithubOAuth } = useAuth();

  useEffect(() => {
    healthApi.getHealth()
      .then((res) => {
        setHealthData(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Health check error:", err);
        setLoading(false);
      });
  }, []);

  const handleReviewFromGitHub = () => {
    if (isAuthenticated) {
      navigate('/repositories');
    } else {
      openAuthModal('login');
    }
  };

  return (
    <div className="space-y-16 sm:space-y-24 py-6">
      {/* Hero Section */}
      <section className="relative text-center space-y-6 pt-6 sm:pt-10 pb-4 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-4 py-1.5 text-xs font-semibold text-brand-600 dark:text-brand-300 backdrop-blur-md">
          <Sparkles className="h-3.5 w-3.5 text-brand-500" />
          <span>Next-Gen AI Code Review Pipeline</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white max-w-4xl mx-auto leading-tight">
          Automated <span className="bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600 dark:from-brand-400 dark:via-indigo-300 dark:to-purple-400 bg-clip-text text-transparent">AI-powered code reviews</span> for high-velocity teams.
        </h1>

        <p className="text-base sm:text-lg text-slate-600 dark:text-dark-muted max-w-2xl mx-auto font-normal leading-relaxed">
          Catch critical security vulnerabilities, performance bottlenecks, and architectural anti-patterns instantly. Review directly in the playground or connect your GitHub repositories.
        </p>

        {/* 3 Clear Primary Options */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 max-w-2xl mx-auto">
          {/* Option A: Manual Code Review */}
          <Link
            to="/studio"
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-600 px-6 py-3.5 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-brand-500/25 hover:from-brand-500 hover:to-indigo-500 transition-all hover:scale-[1.02]"
          >
            <Code2 className="h-4 w-4" />
            <span>Review Code Manually</span>
            <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-mono">No Login Required</span>
          </Link>

          {/* Option B: GitHub Code Review */}
          <button
            type="button"
            onClick={handleReviewFromGitHub}
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card px-6 py-3.5 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-dark-hover shadow-sm transition-all hover:scale-[1.02]"
          >
            <Github className="h-4 w-4" />
            <span>Review from GitHub</span>
            <ArrowRight className="h-4 w-4 text-slate-400" />
          </button>

          {/* Option C: Create Account (if guest) */}
          {!isAuthenticated && (
            <button
              type="button"
              onClick={() => openAuthModal('signup')}
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl border border-transparent hover:border-slate-200 dark:hover:border-dark-border bg-slate-100 dark:bg-dark-surface px-5 py-3.5 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-dark-hover transition-all"
            >
              <UserPlus className="h-4 w-4" />
              <span>Create Account</span>
            </button>
          )}
        </div>

        {/* Live Backend Connection Diagnostic Card */}
        <div className="pt-6 max-w-lg mx-auto">
          <div className="rounded-2xl p-4 sm:p-5 text-left border border-slate-200 dark:border-brand-500/20 bg-white dark:bg-dark-card/90 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-dark-border pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                <span className="text-xs font-mono font-semibold text-slate-800 dark:text-slate-200">
                  Backend API Telemetry Status
                </span>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                healthData?.status === 'healthy'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
              }`}>
                {healthData?.status === 'healthy' ? 'HTTP 200 OK' : 'CHECKING'}
              </span>
            </div>
            <div className="mt-3 font-mono text-xs text-slate-600 dark:text-slate-300 space-y-1">
              <p className="text-slate-400 dark:text-dark-muted">// GET /api/health</p>
              {loading ? (
                <p className="text-amber-500 animate-pulse">Connecting to backend server...</p>
              ) : healthData ? (
                <div className="bg-slate-50 dark:bg-dark-bg/80 p-3 rounded-xl border border-slate-200 dark:border-dark-border mt-2 space-y-1">
                  <p><span className="text-brand-600 dark:text-brand-300 font-semibold">Service:</span> {healthData.service}</p>
                  <p><span className="text-brand-600 dark:text-brand-300 font-semibold">Status:</span> <span className="text-emerald-600 dark:text-emerald-400 font-bold">{healthData.status}</span></p>
                  <p><span className="text-brand-600 dark:text-brand-300 font-semibold">Database:</span> <span className="text-emerald-600 dark:text-emerald-400">{healthData.database}</span></p>
                  <p><span className="text-brand-600 dark:text-brand-300 font-semibold">Environment:</span> {healthData.environment}</p>
                </div>
              ) : (
                <p className="text-rose-500 flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4" /> Backend not reachable at localhost:8000
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="space-y-6">
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Engineered for High-Precision Code Auditing
          </h2>
          <p className="text-slate-500 dark:text-dark-muted text-xs sm:text-sm">
            Actionable feedback that highlights security flaws, concurrency risks, and performance regressions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-2xl p-6 space-y-4 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border shadow-sm hover:shadow-md transition-all">
            <div className="h-12 w-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Security Vulnerability Hunter</h3>
            <p className="text-xs text-slate-600 dark:text-dark-muted leading-relaxed">
              Detects SQL injections, hardcoded credentials, unsafe deserialization, dynamic eval/exec, and OWASP Top 10 risks.
            </p>
          </div>

          <div className="rounded-2xl p-6 space-y-4 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border shadow-sm hover:shadow-md transition-all">
            <div className="h-12 w-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <Zap className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Performance & Concurrency Guard</h3>
            <p className="text-xs text-slate-600 dark:text-dark-muted leading-relaxed">
              Identifies synchronous blocking calls in async loops, event loop freezes, N+1 queries, and memory retention leaks.
            </p>
          </div>

          <div className="rounded-2xl p-6 space-y-4 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border shadow-sm hover:shadow-md transition-all">
            <div className="h-12 w-12 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-500">
              <Bot className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Unified Diff & Fix Generator</h3>
            <p className="text-xs text-slate-600 dark:text-dark-muted leading-relaxed">
              Generates ready-to-apply git patch replacements with clear severity calibration (Critical, High, Medium, Low, Info).
            </p>
          </div>
        </div>
      </section>

      {/* How it Works Workflow */}
      <section className="rounded-3xl p-6 sm:p-10 space-y-6 bg-slate-50 dark:bg-dark-card/40 border border-slate-200 dark:border-dark-border">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            How The AI Review Workflow Operates
          </h2>
          <p className="text-slate-500 dark:text-dark-muted text-xs">
            From manual snippet pasting to continuous GitHub webhook automation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { step: '01', title: 'Submit Code', desc: 'Paste source in AI Studio or connect your GitHub repository.' },
            { step: '02', title: 'Diff Analysis', desc: 'Syntax and AST are inspected along with context and dependencies.' },
            { step: '03', title: 'AI Reasoning', desc: 'Strict senior staff heuristics assess logic and security posture.' },
            { step: '04', title: 'Actionable Fixes', desc: 'Instant score, grouped findings, and unified patch snippets delivered.' }
          ].map((item, idx) => (
            <div key={idx} className="rounded-2xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-bg/60 p-5 space-y-2 shadow-sm">
              <span className="text-xl font-black font-mono text-brand-600 dark:text-brand-400">{item.step}</span>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">{item.title}</h4>
              <p className="text-[11px] text-slate-500 dark:text-dark-muted leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
