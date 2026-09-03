import React, { useState } from 'react';
import {
  Code2,
  Sparkles,
  Play,
  Copy,
  Check,
  RotateCcw,
  FileCode,
  ShieldCheck,
  Zap,
  AlertTriangle,
  FileText,
  Sliders,
  ChevronDown,
  Trash2,
  BookmarkPlus,
  ArrowRight,
  Info,
  ShieldAlert,
  Layers
} from 'lucide-react';
import { aiApi, reviewsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

const CODE_PRESETS = [
  {
    name: '🔴 SQLi & Plain Auth (Vulnerable)',
    language: 'python',
    isDiff: false,
    filename: 'src/auth/login.py',
    code: `import os
import sqlite3
import requests

def authenticate_user(username, password):
    # Vulnerability: Direct f-string formatting into SQL query (CWE-89)
    conn = sqlite3.connect("users.db")
    cursor = conn.cursor()
    query = f"SELECT * FROM users WHERE username = '{username}' AND password = '{password}'"
    cursor.execute(query)
    user = cursor.fetchone()
    
    # Vulnerability: Hardcoded live API key in source code (CWE-798)
    api_key = "sk-live-supersecretapikey1234567890abcdef"
    
    # Vulnerability: Dangerous dynamic evaluation
    config = eval(requests.get("https://internal.api/config").text)
    
    return user`,
  },
  {
    name: '🟠 Async Blocking & Bare Except (Performance)',
    language: 'python',
    isDiff: false,
    filename: 'src/services/billing.py',
    code: `import time
import requests
import asyncio

async def process_payment_batch(orders):
    results = []
    for order in orders:
        try:
            # Bug: Blocking synchronous HTTP call halts entire event loop
            response = requests.post("https://api.stripe.com/v1/charges", json=order)
            results.append(response.json())
            
            # Bug: Synchronous time.sleep freezes asyncio tasks
            time.sleep(1)
        except:
            # Bug: Bare except suppresses SystemExit & KeyboardInterrupt
            pass
            
    return results`,
  },
  {
    name: '🟢 Clean & Modern Async Architecture',
    language: 'python',
    isDiff: false,
    filename: 'src/services/user_service.py',
    code: `import os
import httpx
import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User

logger = logging.getLogger(__name__)

async def get_user_by_id(db: AsyncSession, user_id: int) -> User | None:
    """Safely fetch user with parameterized async query."""
    try:
        stmt = select(User).where(User.id == user_id)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()
    except Exception as e:
        logger.error(f"Failed to query user {user_id}: {e}", exc_info=True)
        raise`,
  },
  {
    name: '📑 Git Unified Diff Patch Example',
    language: 'python',
    isDiff: true,
    filename: 'patch.diff',
    code: `--- a/app/api/endpoints/users.py
+++ b/app/api/endpoints/users.py
@@ -14,6 +14,8 @@ async def create_user(payload: dict):
-    query = f"INSERT INTO users VALUES ('{payload['name']}')"
-    db.execute(query)
+    # FIX: Parameterized SQL insert statement
+    stmt = insert(User).values(name=payload["name"])
+    await db.execute(stmt)
     return {"status": "ok"}`,
  }
];

export default function CodeStudioPage() {
  const { isAuthenticated, openAuthModal, user } = useAuth();

  const [code, setCode] = useState(CODE_PRESETS[0].code);
  const [language, setLanguage] = useState('python');
  const [isDiff, setIsDiff] = useState(false);
  const [filename, setFilename] = useState('src/auth/login.py');
  const [model, setModel] = useState('gpt-4o-mini');
  const [minSeverity, setMinSeverity] = useState('MEDIUM');
  const [loading, setLoading] = useState(false);
  const [reviewResult, setReviewResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeFilter, setActiveFilter] = useState('ALL');

  const handleSelectPreset = (preset) => {
    setCode(preset.code);
    setLanguage(preset.language);
    setIsDiff(preset.isDiff);
    setFilename(preset.filename);
    setReviewResult(null);
    setSaved(false);
  };

  const handleClearCode = () => {
    setCode('');
    setReviewResult(null);
    setSaved(false);
  };

  const handleRunReview = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setSaved(false);
    try {
      const res = await aiApi.reviewDirectCode({
        code,
        language,
        is_diff: isDiff,
        filename,
        model,
        min_severity: minSeverity,
        focus_areas: ['SECURITY', 'PERFORMANCE', 'QUALITY', 'BUG'],
      });
      setReviewResult(res.data);

      // Auto-save to database if user is logged in
      if (isAuthenticated && res.data) {
        try {
          await reviewsApi.create({
            title: filename || 'Manual Code Snippet',
            language,
            score: res.data.score,
            summary: res.data.summary,
            review_type: isDiff ? 'PATCH' : 'MANUAL',
            duration_ms: res.data.duration_ms,
            model_used: res.data.model_used,
            findings: res.data.findings.map((f) => ({
              severity: f.severity,
              category: f.category,
              file_path: f.file || filename,
              line_number: f.line,
              title: f.title,
              description: f.description,
              impact: f.impact,
              suggestion: f.suggestion,
              diff_snippet: f.diff_snippet,
            })),
          });
          setSaved(true);
        } catch (saveErr) {
          console.warn('Could not auto-save review:', saveErr);
        }
      }
    } catch (err) {
      console.error('Error running direct code review:', err);
      alert('Review failed. Please ensure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToAccount = async () => {
    if (!isAuthenticated) {
      openAuthModal('signup');
      return;
    }
    if (!reviewResult) return;

    try {
      await reviewsApi.create({
        title: filename || 'Manual Code Snippet',
        language,
        score: reviewResult.score,
        summary: reviewResult.summary,
        review_type: isDiff ? 'PATCH' : 'MANUAL',
        duration_ms: reviewResult.duration_ms,
        model_used: reviewResult.model_used,
        findings: reviewResult.findings.map((f) => ({
          severity: f.severity,
          category: f.category,
          file_path: f.file || filename,
          line_number: f.line,
          title: f.title,
          description: f.description,
          impact: f.impact,
          suggestion: f.suggestion,
          diff_snippet: f.diff_snippet,
        })),
      });
      setSaved(true);
    } catch (err) {
      console.error('Failed to save review:', err);
      alert('Failed to save review to account.');
    }
  };

  const handleCopyMarkdown = () => {
    if (!reviewResult) return;
    let md = `## 🤖 AI Code Review (${reviewResult.score}/10)\n\n**Summary:** ${reviewResult.summary}\n\n### Findings (${reviewResult.findings.length}):\n`;
    reviewResult.findings.forEach((f) => {
      md += `\n- **[${f.severity}]** \`${f.file}\`${f.line ? ` (L${f.line})` : ''}: **${f.title}**\n  - *Impact:* ${f.impact || 'N/A'}\n  - *Fix:* ${f.suggestion}\n`;
      if (f.diff_snippet) {
        md += `\n\`\`\`diff\n${f.diff_snippet}\n\`\`\`\n`;
      }
    });
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredFindings = reviewResult
    ? reviewResult.findings.filter((f) => {
        if (activeFilter === 'ALL') return true;
        return f.severity === activeFilter || f.category === activeFilter;
      })
    : [];

  const counts = reviewResult
    ? {
        CRITICAL: reviewResult.findings.filter((f) => f.severity === 'CRITICAL').length,
        HIGH: reviewResult.findings.filter((f) => f.severity === 'HIGH').length,
        MEDIUM: reviewResult.findings.filter((f) => f.severity === 'MEDIUM').length,
        LOW: reviewResult.findings.filter((f) => f.severity === 'LOW').length,
        INFO: reviewResult.findings.filter((f) => f.severity === 'INFO').length,
      }
    : { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-600 dark:text-brand-300 mb-2">
            <Sparkles className="h-3.5 w-3.5 text-brand-500" />
            <span>Interactive AI Code Studio</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            AI Code Studio
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-dark-muted mt-1">
            Paste your code snippet or git diff to receive senior-engineer audits, security vulnerability checks, and automated fixes.
          </p>
        </div>

        {/* Action button */}
        <button
          onClick={handleRunReview}
          disabled={loading || !code.trim()}
          className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-600 px-6 py-3 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-brand-500/25 hover:from-brand-500 hover:to-indigo-500 disabled:opacity-50 transition-all hover:scale-[1.02]"
        >
          {loading ? (
            <>
              <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              <span>Analyzing Code...</span>
            </>
          ) : (
            <>
              <Play className="h-4 w-4 fill-white" />
              <span>Run AI Code Review</span>
            </>
          )}
        </button>
      </div>

      {/* Preset Quick Load Bar */}
      <div className="rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border shadow-sm">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
          <FileCode className="h-4 w-4 text-brand-500" />
          <span>Load Sample Snippet:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {CODE_PRESETS.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => handleSelectPreset(preset)}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-surface text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-hover transition-all"
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Code Editor on Left, AI Results on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Code Input & Config Controls */}
        <div className="lg:col-span-6 space-y-4">
          <div className="rounded-2xl p-4 space-y-3 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border shadow-sm">
            {/* Editor Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-dark-border pb-3">
              <div className="flex items-center gap-2">
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-surface px-2.5 py-1 text-xs font-mono text-slate-800 dark:text-white focus:outline-none"
                >
                  <option value="python">Python</option>
                  <option value="javascript">JavaScript</option>
                  <option value="typescript">TypeScript</option>
                  <option value="go">Go</option>
                  <option value="rust">Rust</option>
                  <option value="java">Java</option>
                  <option value="cpp">C++</option>
                  <option value="sql">SQL</option>
                  <option value="html">HTML / CSS</option>
                </select>

                <input
                  type="text"
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                  placeholder="filename.py"
                  className="rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-surface px-2.5 py-1 text-xs font-mono text-slate-700 dark:text-slate-300 w-36 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-3 text-xs">
                <label className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 cursor-pointer font-medium">
                  <input
                    type="checkbox"
                    checked={isDiff}
                    onChange={(e) => setIsDiff(e.target.checked)}
                    className="rounded border-slate-300 dark:border-dark-border text-brand-600 focus:ring-brand-500"
                  />
                  <span>Git Diff Mode</span>
                </label>

                <button
                  type="button"
                  onClick={handleClearCode}
                  className="flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                  title="Clear editor code"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Clear</span>
                </button>
              </div>
            </div>

            {/* Code Textarea */}
            <div className="relative">
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Paste code or unified diff here to analyze..."
                rows={16}
                className="w-full rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg p-3.5 font-mono text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-brand-500 focus:bg-white dark:focus:bg-dark-bg focus:outline-none resize-y leading-relaxed"
                spellCheck="false"
              />
            </div>

            {/* Model & Threshold Controls */}
            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100 dark:border-dark-border text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-dark-muted uppercase mb-1">
                  AI Model
                </label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-surface px-2.5 py-1.5 text-xs text-slate-800 dark:text-white focus:outline-none"
                >
                  <option value="gpt-4o-mini">gpt-4o-mini (Fast & Strict)</option>
                  <option value="gpt-4o">gpt-4o (Deep Reasoning)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-dark-muted uppercase mb-1">
                  Min Severity
                </label>
                <select
                  value={minSeverity}
                  onChange={(e) => setMinSeverity(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-surface px-2.5 py-1.5 text-xs text-slate-800 dark:text-white focus:outline-none"
                >
                  <option value="INFO">INFO (All Observations)</option>
                  <option value="LOW">LOW (Low+ Severity)</option>
                  <option value="MEDIUM">MEDIUM (Recommended)</option>
                  <option value="HIGH">HIGH (Blockers Only)</option>
                  <option value="CRITICAL">CRITICAL (Only Vulnerabilities)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: AI Review Results */}
        <div className="lg:col-span-6 space-y-4">
          {reviewResult ? (
            <div className="space-y-4">
              {/* Score & Summary Card */}
              <div className="rounded-2xl p-5 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-extrabold font-mono border ${
                        reviewResult.score >= 8.5
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                          : reviewResult.score >= 7.0
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                      }`}
                    >
                      {reviewResult.score}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        Overall Quality Score
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-dark-muted font-mono">
                        Model: {reviewResult.model_used} • {reviewResult.duration_ms}ms
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyMarkdown}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-surface text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-hover transition-all"
                      title="Copy findings as Markdown report"
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copied ? 'Copied!' : 'Copy Markdown'}</span>
                    </button>

                    <button
                      onClick={handleSaveToAccount}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                        saved
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                          : 'border-brand-500/30 bg-brand-500/10 text-brand-600 dark:text-brand-300 hover:bg-brand-500/20'
                      }`}
                    >
                      <BookmarkPlus className="h-3.5 w-3.5" />
                      <span>{saved ? 'Saved to History' : 'Save to Account'}</span>
                    </button>
                  </div>
                </div>

                {/* AI Executive Summary */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-dark-bg/60 border border-slate-200/60 dark:border-dark-border text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  <span className="font-bold text-slate-900 dark:text-white mr-1.5">Summary:</span>
                  {reviewResult.summary}
                </div>

                {/* Severity Breakdown Badges */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <button
                    onClick={() => setActiveFilter('ALL')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      activeFilter === 'ALL'
                        ? 'bg-brand-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-dark-surface text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    All ({reviewResult.findings.length})
                  </button>
                  {counts.CRITICAL > 0 && (
                    <button
                      onClick={() => setActiveFilter('CRITICAL')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        activeFilter === 'CRITICAL'
                          ? 'bg-rose-600 text-white'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      Critical ({counts.CRITICAL})
                    </button>
                  )}
                  {counts.HIGH > 0 && (
                    <button
                      onClick={() => setActiveFilter('HIGH')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        activeFilter === 'HIGH'
                          ? 'bg-orange-600 text-white'
                          : 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20'
                      }`}
                    >
                      High ({counts.HIGH})
                    </button>
                  )}
                  {counts.MEDIUM > 0 && (
                    <button
                      onClick={() => setActiveFilter('MEDIUM')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        activeFilter === 'MEDIUM'
                          ? 'bg-amber-600 text-white'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      Medium ({counts.MEDIUM})
                    </button>
                  )}
                  {counts.LOW > 0 && (
                    <button
                      onClick={() => setActiveFilter('LOW')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        activeFilter === 'LOW'
                          ? 'bg-blue-600 text-white'
                          : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                      }`}
                    >
                      Low ({counts.LOW})
                    </button>
                  )}
                </div>
              </div>

              {/* Findings List */}
              <div className="space-y-3">
                {filteredFindings.length === 0 ? (
                  <div className="rounded-2xl p-8 text-center bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border text-slate-500 text-xs">
                    No findings match the selected filter.
                  </div>
                ) : (
                  filteredFindings.map((finding, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl p-4 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border shadow-sm space-y-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${
                                finding.severity === 'CRITICAL'
                                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                                  : finding.severity === 'HIGH'
                                  ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30'
                                  : finding.severity === 'MEDIUM'
                                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                                  : finding.severity === 'LOW'
                                  ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
                                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                              }`}
                            >
                              {finding.severity}
                            </span>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-dark-surface text-slate-600 dark:text-slate-400 uppercase">
                              {finding.category}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                            {finding.title}
                          </h4>
                        </div>

                        <span className="text-[11px] font-mono text-slate-500 dark:text-dark-muted bg-slate-100 dark:bg-dark-surface px-2 py-1 rounded-lg border border-slate-200 dark:border-dark-border">
                          {finding.file} {finding.line ? `(L${finding.line})` : ''}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {finding.description}
                      </p>

                      {finding.impact && (
                        <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 text-xs text-rose-700 dark:text-rose-300 space-y-0.5">
                          <span className="font-bold">Impact: </span>
                          <span>{finding.impact}</span>
                        </div>
                      )}

                      <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 space-y-0.5">
                        <span className="font-bold">Suggested Fix: </span>
                        <span>{finding.suggestion}</span>
                      </div>

                      {finding.diff_snippet && (
                        <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-dark-border">
                          <div className="bg-slate-100 dark:bg-dark-surface px-3 py-1.5 text-[10px] font-mono text-slate-600 dark:text-dark-muted font-bold">
                            Unified Patch Snippet
                          </div>
                          <pre className="p-3 bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto leading-relaxed">
                            {finding.diff_snippet}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            /* Empty State Prompt */
            <div className="rounded-2xl p-12 text-center bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border shadow-sm space-y-4">
              <div className="flex justify-center">
                <div className="h-16 w-16 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-600 dark:text-brand-400">
                  <Code2 className="h-8 w-8" />
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Ready for AI Code Review
                </h3>
                <p className="text-xs text-slate-500 dark:text-dark-muted max-w-sm mx-auto">
                  Paste your code or select a sample snippet, then click "Run AI Code Review" to generate instant security & quality feedback.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
