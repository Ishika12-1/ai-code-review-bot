import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  GitPullRequest,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Sparkles,
  ExternalLink,
  Code2,
  FolderGit2
} from 'lucide-react';
import { prsApi, githubApi } from '../services/api';

export default function PullRequestsPage() {
  const [prs, setPrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPRs = async () => {
      try {
        setLoading(true);
        const res = await prsApi.list();
        setPrs(res.data);
      } catch (err) {
        console.error('Error fetching PRs:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPRs();
  }, []);

  const handleReviewPr = async (pr) => {
    setReviewingId(pr.id);
    try {
      const owner = pr.repository?.owner || 'acme-corp';
      const repoName = pr.repository?.name || 'payment-service';
      const res = await githubApi.reviewPull(owner, repoName, pr.pr_number);
      if (res.data?.id) {
        navigate(`/reviews/${res.data.id}`);
      }
    } catch (err) {
      console.error('Error reviewing PR:', err);
      alert('Review failed: ' + (err.response?.data?.detail || 'Server error.'));
    } finally {
      setReviewingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Pull Requests
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-dark-muted mt-1">
            Browse monitored Pull Requests, review changed diffs, and inspect automated findings.
          </p>
        </div>

        <Link
          to="/studio"
          className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-brand-500/20 hover:from-brand-500 hover:to-indigo-500 transition-all"
        >
          <Code2 className="h-4 w-4" />
          <span>Manual Code Studio</span>
        </Link>
      </div>

      <div className="rounded-2xl p-6 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border shadow-sm">
        {loading ? (
          <div className="text-center py-12 text-slate-400 text-xs animate-pulse">
            Loading Pull Requests...
          </div>
        ) : prs.length === 0 ? (
          <div className="text-center py-12 text-slate-500 dark:text-dark-muted text-xs space-y-2">
            <GitPullRequest className="h-8 w-8 mx-auto text-slate-300 dark:text-dark-border" />
            <p>No active Pull Requests found across connected repositories.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-dark-surface text-[10px] uppercase font-bold text-slate-400 dark:text-dark-muted border-b border-slate-200 dark:border-dark-border">
                <tr>
                  <th className="px-4 py-3.5 rounded-l-xl">Pull Request</th>
                  <th className="px-4 py-3.5">Branch</th>
                  <th className="px-4 py-3.5">Author</th>
                  <th className="px-4 py-3.5">AI Score</th>
                  <th className="px-4 py-3.5">Findings</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 rounded-r-xl text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-dark-border font-medium">
                {prs.map((pr) => (
                  <tr key={pr.id} className="hover:bg-slate-50 dark:hover:bg-dark-hover/50 transition-colors">
                    <td className="px-4 py-4 font-bold text-slate-900 dark:text-white max-w-sm">
                      <div className="flex items-center gap-2">
                        <GitPullRequest className="h-4 w-4 text-brand-500 flex-shrink-0" />
                        <span className="font-mono text-brand-600 dark:text-brand-400 font-bold">#{pr.pr_number}</span>
                        <span className="truncate">{pr.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                      <span className="bg-slate-100 dark:bg-dark-surface px-2 py-1 rounded-lg border border-slate-200 dark:border-dark-border">
                        {pr.head_branch}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-600 dark:text-slate-300">@{pr.author}</td>
                    <td className="px-4 py-4 font-mono font-bold">
                      {pr.latest_review_score ? (
                        <span
                          className={`px-2 py-0.5 rounded text-xs ${
                            pr.latest_review_score >= 8.5
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : pr.latest_review_score >= 7.0
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {pr.latest_review_score}/10
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-dark-muted text-xs font-normal">Pending</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {pr.findings_count || 0} finding(s)
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 capitalize">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {pr.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      {pr.latest_review_score ? (
                        <Link
                          to={`/reviews/1`}
                          className="inline-flex items-center gap-1 rounded-xl bg-slate-100 dark:bg-dark-surface border border-slate-200 dark:border-dark-border px-3 py-1.5 text-xs font-semibold text-brand-600 dark:text-brand-300 hover:bg-brand-600 hover:text-white transition-all"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>View Review</span>
                        </Link>
                      ) : (
                        <button
                          onClick={() => handleReviewPr(pr)}
                          disabled={reviewingId === pr.id}
                          className="inline-flex items-center gap-1 rounded-xl bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-brand-500 transition-all disabled:opacity-50"
                        >
                          {reviewingId === pr.id ? (
                            <span>Auditing...</span>
                          ) : (
                            <>
                              <Sparkles className="h-3.5 w-3.5" />
                              <span>Audit PR</span>
                            </>
                          )}
                        </button>
                      )}
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
