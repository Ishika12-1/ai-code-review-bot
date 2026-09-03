import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ShieldAlert,
  AlertTriangle,
  Info,
  CheckCircle2,
  Filter,
  FileCode,
  Sparkles,
  ArrowLeft,
  ExternalLink,
  Copy,
  Check,
  Calendar,
  Layers,
  History
} from 'lucide-react';
import { reviewsApi } from '../services/api';

export default function ReviewDetailsPage() {
  const { id } = useParams();
  const [review, setReview] = useState(null);
  const [allReviews, setAllReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        if (id) {
          const res = await reviewsApi.get(id);
          setReview(res.data);
        } else {
          // List all reviews
          const res = await reviewsApi.list({ limit: 50 });
          setAllReviews(res.data);
          if (res.data.length > 0) {
            const first = await reviewsApi.get(res.data[0].id);
            setReview(first.data);
          }
        }
      } catch (err) {
        console.error('Error loading review details:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  const handleCopyReport = () => {
    if (!review) return;
    let md = `## 🤖 AI Code Review Summary (${review.score || 8.5}/10)\n\n**Target:** ${review.title || review.repository_name || 'Code Review'}\n**Model:** ${review.model_used || 'gpt-4o-mini'}\n\n${review.summary || ''}\n\n### Findings (${review.findings ? review.findings.length : 0}):\n`;
    if (review.findings) {
      review.findings.forEach((f) => {
        md += `\n- **[${f.severity}]** \`${f.file_path}\`${f.line_number ? ` (L${f.line_number})` : ''}: **${f.title}**\n  - *Impact:* ${f.impact || 'N/A'}\n  - *Fix:* ${f.suggestion}\n`;
        if (f.diff_snippet) {
          md += `\n\`\`\`diff\n${f.diff_snippet}\n\`\`\`\n`;
        }
      });
    }
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredFindings = review?.findings
    ? review.findings.filter((f) => {
        if (filterSeverity === 'ALL') return true;
        return f.severity === filterSeverity || f.category === filterSeverity;
      })
    : [];

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-dark-muted hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
        </div>

        {review && (
          <button
            onClick={handleCopyReport}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-dark-hover shadow-sm transition-all self-start sm:self-auto"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? 'Report Copied!' : 'Copy Markdown Report'}</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-16 text-center text-xs text-slate-400 animate-pulse">
          Loading code review telemetry and findings...
        </div>
      ) : !review ? (
        <div className="rounded-2xl p-12 text-center bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border shadow-sm space-y-3">
          <History className="h-8 w-8 mx-auto text-slate-400" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            No Review Selected
          </h3>
          <p className="text-xs text-slate-500 dark:text-dark-muted max-w-sm mx-auto">
            You can run a code review in AI Code Studio or audit a Pull Request from the Repositories page.
          </p>
          <div className="pt-2">
            <Link
              to="/studio"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-500"
            >
              <Sparkles className="h-4 w-4" />
              Open AI Code Studio
            </Link>
          </div>
        </div>
      ) : (
        /* Review Detail View */
        <div className="space-y-6">
          {/* Header Card */}
          <div className="rounded-2xl p-6 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-mono text-xs text-brand-600 dark:text-brand-400 font-semibold">
                  <span>{review.repository_name || 'Code Studio Analysis'}</span>
                  {review.pr_number && (
                    <>
                      <span>•</span>
                      <span>PR #{review.pr_number}</span>
                    </>
                  )}
                  <span>•</span>
                  <span className="uppercase text-slate-500">{review.review_type}</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {review.title || `Review Session #${review.id}`}
                </h1>
                <p className="text-[11px] text-slate-400 font-mono">
                  Engine: {review.model_used || 'gpt-4o-mini'} • Completed on{' '}
                  {new Date(review.created_at).toLocaleString()}
                </p>
              </div>

              {/* Score visual badge */}
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-extrabold font-mono border ${
                    (review.score || 0) >= 8.5
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                      : (review.score || 0) >= 7.0
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                      : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                  }`}
                >
                  {review.score || '8.5'}
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Code Quality
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-dark-muted">
                    Scale 1.0 – 10.0
                  </p>
                </div>
              </div>
            </div>

            {/* AI Summary */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-dark-surface border border-slate-200/60 dark:border-dark-border text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              <span className="font-bold text-slate-900 dark:text-white mr-1.5">AI Summary:</span>
              {review.summary}
            </div>

            {/* Severity Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 pt-2">
              <button
                onClick={() => setFilterSeverity('ALL')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                  filterSeverity === 'ALL'
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-dark-surface text-slate-600 dark:text-slate-400'
                }`}
              >
                All Findings ({review.findings ? review.findings.length : 0})
              </button>
              {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'].map((sev) => {
                const count = review.findings
                  ? review.findings.filter((f) => f.severity === sev).length
                  : 0;
                if (count === 0) return null;
                return (
                  <button
                    key={sev}
                    onClick={() => setFilterSeverity(sev)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                      filterSeverity === sev
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                        : 'bg-slate-100 dark:bg-dark-surface text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {sev} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Findings List */}
          <div className="space-y-4">
            {filteredFindings.length === 0 ? (
              <div className="rounded-2xl p-8 text-center bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border text-xs text-slate-400">
                No findings match the current filter.
              </div>
            ) : (
              filteredFindings.map((finding) => (
                <div
                  key={finding.id}
                  className="rounded-2xl p-5 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border shadow-sm space-y-3"
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
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {finding.title}
                      </h3>
                    </div>

                    <span className="text-[11px] font-mono text-slate-500 dark:text-dark-muted bg-slate-100 dark:bg-dark-surface px-2.5 py-1 rounded-lg border border-slate-200 dark:border-dark-border">
                      {finding.file_path} {finding.line_number ? `(L${finding.line_number})` : ''}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {finding.description}
                  </p>

                  {finding.impact && (
                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 text-xs text-rose-700 dark:text-rose-300 space-y-0.5">
                      <span className="font-bold">Impact: </span>
                      <span>{finding.impact}</span>
                    </div>
                  )}

                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 space-y-0.5">
                    <span className="font-bold">Suggested Remediation: </span>
                    <span>{finding.suggestion}</span>
                  </div>

                  {finding.diff_snippet && (
                    <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-dark-border">
                      <div className="bg-slate-100 dark:bg-dark-surface px-3 py-1.5 text-[10px] font-mono text-slate-600 dark:text-dark-muted font-bold">
                        Suggested Diff Patch
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
      )}
    </div>
  );
}
