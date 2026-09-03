import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderGit2,
  GitPullRequest,
  CheckCircle2,
  Settings,
  Plus,
  Search,
  ExternalLink,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  X,
  Save,
  Check,
  Github,
  ChevronRight,
  FileCode,
  Folder,
  ArrowLeft,
  Sparkles,
  Play,
  GitBranch,
  RefreshCw,
  Code2
} from 'lucide-react';
import { reposApi, githubApi, aiApi, reviewsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function RepositoriesPage() {
  const { isAuthenticated, user, initiateGithubOAuth } = useAuth();
  const navigate = useNavigate();

  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Active repository detail explorer state
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('main');
  const [currentPath, setCurrentPath] = useState('');
  const [contents, setContents] = useState([]);
  const [contentsLoading, setContentsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [fileLoading, setFileLoading] = useState(false);

  // Pull Requests in selected repo
  const [repoPRs, setRepoPRs] = useState([]);
  const [prsLoading, setPrsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('files'); // 'files' | 'prs' | 'settings'

  // Reviewing PR state
  const [reviewingPrId, setReviewingPrId] = useState(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [activeConfigRepo, setActiveConfigRepo] = useState(null);

  // New repo form state
  const [newRepo, setNewRepo] = useState({
    name: '',
    owner: '',
    language: 'Python',
    default_branch: 'main',
    auto_review: true,
    min_severity: 'MEDIUM',
  });

  // Config modal state
  const [configForm, setConfigForm] = useState({
    min_severity: 'MEDIUM',
    check_security: true,
    check_performance: true,
    check_quality: true,
    check_style: false,
    model_name: 'gpt-4o-mini',
  });

  const fetchRepos = async () => {
    try {
      setLoading(true);
      const [dbReposRes, ghReposRes] = await Promise.allSettled([
        reposApi.list(),
        githubApi.getUserRepos(),
      ]);

      let combined = [];
      if (dbReposRes.status === 'fulfilled' && Array.isArray(dbReposRes.value.data)) {
        combined = [...dbReposRes.value.data];
      }
      if (ghReposRes.status === 'fulfilled' && Array.isArray(ghReposRes.value.data)) {
        ghReposRes.value.data.forEach((ghRepo) => {
          if (!combined.some((r) => r.full_name === ghRepo.full_name)) {
            combined.push({
              id: ghRepo.id,
              name: ghRepo.name,
              full_name: ghRepo.full_name,
              owner: ghRepo.owner?.login || 'unknown',
              description: ghRepo.description,
              language: ghRepo.language || 'Code',
              default_branch: ghRepo.default_branch || 'main',
              is_active: true,
              is_github_repo: true,
            });
          }
        });
      }
      setRepos(combined);
    } catch (err) {
      console.error('Error fetching repositories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRepos();
  }, []);

  // When a repo is selected, fetch branches, files, and PRs
  const handleSelectRepo = async (repo) => {
    setSelectedRepo(repo);
    setSelectedBranch(repo.default_branch || 'main');
    setCurrentPath('');
    setSelectedFile(null);
    setFileContent('');
    setActiveTab('files');

    const owner = repo.owner || repo.full_name.split('/')[0];
    const repoName = repo.name || repo.full_name.split('/')[1];

    // Fetch branches
    try {
      const bRes = await githubApi.getBranches(owner, repoName);
      setBranches(bRes.data || [{ name: 'main' }]);
    } catch (e) {
      setBranches([{ name: 'main' }]);
    }

    // Fetch root files
    loadRepoContents(owner, repoName, '', repo.default_branch || 'main');
    // Fetch PRs
    loadRepoPRs(owner, repoName);
  };

  const loadRepoContents = async (owner, repoName, path, branch) => {
    setContentsLoading(true);
    try {
      const res = await githubApi.getContents(owner, repoName, { path, ref: branch });
      setContents(Array.isArray(res.data) ? res.data : [res.data]);
    } catch (err) {
      console.error('Error fetching contents:', err);
      setContents([]);
    } finally {
      setContentsLoading(false);
    }
  };

  const loadRepoPRs = async (owner, repoName) => {
    setPrsLoading(true);
    try {
      const res = await githubApi.getPulls(owner, repoName);
      setRepoPRs(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching PRs:', err);
      setRepoPRs([]);
    } finally {
      setPrsLoading(false);
    }
  };

  const handleNavigatePath = (dirName) => {
    const owner = selectedRepo.owner || selectedRepo.full_name.split('/')[0];
    const repoName = selectedRepo.name || selectedRepo.full_name.split('/')[1];
    const newPath = currentPath ? `${currentPath}/${dirName}` : dirName;
    setCurrentPath(newPath);
    setSelectedFile(null);
    setFileContent('');
    loadRepoContents(owner, repoName, newPath, selectedBranch);
  };

  const handleNavigateUp = () => {
    const owner = selectedRepo.owner || selectedRepo.full_name.split('/')[0];
    const repoName = selectedRepo.name || selectedRepo.full_name.split('/')[1];
    const parts = currentPath.split('/');
    parts.pop();
    const newPath = parts.join('/');
    setCurrentPath(newPath);
    setSelectedFile(null);
    setFileContent('');
    loadRepoContents(owner, repoName, newPath, selectedBranch);
  };

  const handleSelectFile = async (file) => {
    const owner = selectedRepo.owner || selectedRepo.full_name.split('/')[0];
    const repoName = selectedRepo.name || selectedRepo.full_name.split('/')[1];
    setSelectedFile(file);
    setFileLoading(true);
    try {
      const res = await githubApi.getFile(owner, repoName, { path: file.path, ref: selectedBranch });
      setFileContent(res.data?.content || '');
    } catch (err) {
      console.error('Error reading file:', err);
      setFileContent('// Failed to load file content.');
    } finally {
      setFileLoading(false);
    }
  };

  const handleSendFileToStudio = () => {
    if (!selectedFile || !fileContent) return;
    // Direct user to AI Studio with pre-loaded code
    navigate('/studio');
  };

  const handleReviewPR = async (prNumber) => {
    const owner = selectedRepo.owner || selectedRepo.full_name.split('/')[0];
    const repoName = selectedRepo.name || selectedRepo.full_name.split('/')[1];
    setReviewingPrId(prNumber);
    try {
      const res = await githubApi.reviewPull(owner, repoName, prNumber);
      if (res.data?.id) {
        navigate(`/reviews/${res.data.id}`);
      }
    } catch (err) {
      console.error('Failed to review PR:', err);
      alert('Review failed: ' + (err.response?.data?.detail || 'Server error.'));
    } finally {
      setReviewingPrId(null);
    }
  };

  const handleAddRepo = async (e) => {
    e.preventDefault();
    try {
      const full_name = `${newRepo.owner.trim()}/${newRepo.name.trim()}`;
      await reposApi.create({
        name: newRepo.name.trim(),
        full_name,
        owner: newRepo.owner.trim(),
        language: newRepo.language,
        default_branch: newRepo.default_branch,
        is_active: true,
        config: {
          auto_review: newRepo.auto_review,
          min_severity: newRepo.min_severity,
          check_security: true,
          check_performance: true,
          check_quality: true,
          check_style: false,
          max_files_per_review: 20,
          model_name: 'gpt-4o-mini',
        },
      });
      setIsAddModalOpen(false);
      setNewRepo({ name: '', owner: '', language: 'Python', default_branch: 'main', auto_review: true, min_severity: 'MEDIUM' });
      fetchRepos();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to connect repository.');
    }
  };

  const filteredRepos = repos.filter((r) =>
    r.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.language && r.language.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            GitHub Repositories
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-dark-muted mt-1">
            Browse repositories, inspect branches & files, or trigger instant AI Pull Request audits.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!user?.is_github_connected && (
            <button
              onClick={initiateGithubOAuth}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card px-4 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-dark-hover shadow-sm transition-all"
            >
              <Github className="h-4 w-4" />
              <span>Connect GitHub</span>
            </button>
          )}

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-brand-500/20 hover:bg-brand-500 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Connect Repository</span>
          </button>
        </div>
      </div>

      {selectedRepo ? (
        /* Repository Explorer View */
        <div className="space-y-4">
          {/* Breadcrumb / Back button bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border shadow-sm">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedRepo(null)}
                className="flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>All Repositories</span>
              </button>
              <span className="text-slate-300 dark:text-dark-border">/</span>
              <span className="text-xs font-bold text-slate-900 dark:text-white font-mono">
                {selectedRepo.full_name}
              </span>
            </div>

            {/* Branch selector */}
            <div className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-brand-500" />
              <select
                value={selectedBranch}
                onChange={(e) => {
                  setSelectedBranch(e.target.value);
                  const owner = selectedRepo.owner || selectedRepo.full_name.split('/')[0];
                  const repoName = selectedRepo.name || selectedRepo.full_name.split('/')[1];
                  loadRepoContents(owner, repoName, currentPath, e.target.value);
                }}
                className="rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-surface px-3 py-1.5 text-xs font-mono text-slate-800 dark:text-white focus:outline-none"
              >
                {branches.map((b) => (
                  <option key={b.name} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Repo Navigation Tabs */}
          <div className="flex border-b border-slate-200 dark:border-dark-border text-xs font-semibold gap-4">
            <button
              onClick={() => setActiveTab('files')}
              className={`pb-2.5 flex items-center gap-2 border-b-2 transition-all ${
                activeTab === 'files'
                  ? 'border-brand-600 text-brand-600 dark:text-brand-400 font-bold'
                  : 'border-transparent text-slate-500 dark:text-dark-muted hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileCode className="h-4 w-4" />
              <span>Files & Explorer</span>
            </button>
            <button
              onClick={() => setActiveTab('prs')}
              className={`pb-2.5 flex items-center gap-2 border-b-2 transition-all ${
                activeTab === 'prs'
                  ? 'border-brand-600 text-brand-600 dark:text-brand-400 font-bold'
                  : 'border-transparent text-slate-500 dark:text-dark-muted hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <GitPullRequest className="h-4 w-4" />
              <span>Pull Requests ({repoPRs.length})</span>
            </button>
          </div>

          {/* Tab 1: Files & Explorer */}
          {activeTab === 'files' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* File Tree */}
              <div className="lg:col-span-4 rounded-2xl p-4 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border shadow-sm space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-dark-border">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
                    /{currentPath || 'root'}
                  </span>
                  {currentPath && (
                    <button
                      onClick={handleNavigateUp}
                      className="text-[11px] text-brand-600 dark:text-brand-400 font-bold hover:underline"
                    >
                      .. Up One Level
                    </button>
                  )}
                </div>

                {contentsLoading ? (
                  <div className="py-8 text-center text-xs text-slate-400 animate-pulse">
                    Loading directory contents...
                  </div>
                ) : (
                  <div className="space-y-1 max-h-96 overflow-y-auto pr-1">
                    {contents.map((item, idx) => {
                      const isDir = item.type === 'dir';
                      return (
                        <button
                          key={idx}
                          onClick={() => (isDir ? handleNavigatePath(item.name) : handleSelectFile(item))}
                          className={`w-full flex items-center justify-between p-2 rounded-xl text-xs text-left transition-all ${
                            selectedFile?.path === item.path
                              ? 'bg-brand-500/10 text-brand-600 dark:text-brand-300 font-bold border border-brand-500/20'
                              : 'hover:bg-slate-50 dark:hover:bg-dark-hover text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            {isDir ? (
                              <Folder className="h-4 w-4 text-amber-500 flex-shrink-0" />
                            ) : (
                              <FileCode className="h-4 w-4 text-brand-500 flex-shrink-0" />
                            )}
                            <span className="truncate">{item.name}</span>
                          </div>
                          {isDir && <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* File Preview & Review Action */}
              <div className="lg:col-span-8 rounded-2xl p-5 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border shadow-sm space-y-4">
                {selectedFile ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-dark-border pb-3">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white font-mono">
                          {selectedFile.path}
                        </h4>
                        <span className="text-[11px] text-slate-400 font-mono">
                          Branch: {selectedBranch}
                        </span>
                      </div>

                      <button
                        onClick={handleSendFileToStudio}
                        className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-brand-500/20 hover:bg-brand-500 transition-all"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Send to AI Studio for Review</span>
                      </button>
                    </div>

                    {fileLoading ? (
                      <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
                        Fetching raw source code...
                      </div>
                    ) : (
                      <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto max-h-96 leading-relaxed">
                        {fileContent}
                      </pre>
                    )}
                  </div>
                ) : (
                  <div className="py-16 text-center text-xs text-slate-500 dark:text-dark-muted space-y-2">
                    <FileCode className="h-8 w-8 mx-auto text-slate-300 dark:text-dark-border" />
                    <p>Select a file from the explorer on the left to preview and audit with AI.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 2: Pull Requests in Repo */}
          {activeTab === 'prs' && (
            <div className="rounded-2xl p-6 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border shadow-sm">
              {prsLoading ? (
                <div className="py-8 text-center text-xs text-slate-400 animate-pulse">
                  Loading Pull Requests...
                </div>
              ) : repoPRs.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500 dark:text-dark-muted">
                  No open Pull Requests found for this repository.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                    <thead className="bg-slate-50 dark:bg-dark-surface uppercase text-[10px] font-bold text-slate-400 dark:text-dark-muted border-b border-slate-200 dark:border-dark-border">
                      <tr>
                        <th className="px-4 py-3 rounded-l-xl">PR Number & Title</th>
                        <th className="px-4 py-3">Branch</th>
                        <th className="px-4 py-3">Author</th>
                        <th className="px-4 py-3">State</th>
                        <th className="px-4 py-3 rounded-r-xl text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-dark-border font-medium">
                      {repoPRs.map((pr) => (
                        <tr key={pr.id} className="hover:bg-slate-50 dark:hover:bg-dark-hover/50 transition-colors">
                          <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white max-w-sm truncate">
                            <div className="flex items-center gap-2">
                              <GitPullRequest className="h-4 w-4 text-brand-500 flex-shrink-0" />
                              <span className="font-mono text-brand-600 dark:text-brand-400">#{pr.number}</span>
                              <span className="truncate">{pr.title}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 font-mono text-[11px] text-slate-500">
                            {pr.head?.ref || 'head'}
                          </td>
                          <td className="px-4 py-3.5">
                            @{pr.user?.login || 'unknown'}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 capitalize">
                              {pr.state}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <button
                              onClick={() => handleReviewPR(pr.number)}
                              disabled={reviewingPrId === pr.number}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:from-brand-500 hover:to-indigo-500 disabled:opacity-50 transition-all"
                            >
                              {reviewingPrId === pr.number ? (
                                <>
                                  <div className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                                  <span>Auditing Diff...</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles className="h-3.5 w-3.5" />
                                  <span>Review with AI</span>
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Repositories Cards List View */
        <div className="space-y-4">
          {/* Search bar */}
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search repositories by name or language..."
              className="w-full rounded-2xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-brand-500 focus:outline-none shadow-sm"
            />
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
              Loading repositories...
            </div>
          ) : filteredRepos.length === 0 ? (
            <div className="rounded-2xl p-12 text-center bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border shadow-sm space-y-3">
              <FolderGit2 className="h-8 w-8 mx-auto text-slate-400" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                No Repositories Found
              </h3>
              <p className="text-xs text-slate-500 dark:text-dark-muted max-w-sm mx-auto">
                Connect a GitHub repository or link your GitHub account to begin browsing repositories and pull requests.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRepos.map((repo) => (
                <div
                  key={repo.id}
                  className="rounded-2xl p-5 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
                          <FolderGit2 className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[180px]">
                            {repo.name}
                          </h3>
                          <p className="text-[11px] text-slate-500 dark:text-dark-muted font-mono truncate">
                            {repo.full_name}
                          </p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-dark-surface text-slate-600 dark:text-slate-400">
                        {repo.language || 'Code'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                      {repo.description || 'Monitored repository for automated code intelligence.'}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-dark-border flex items-center justify-between">
                    <span className="text-[11px] font-mono text-slate-400">
                      branch: {repo.default_branch || 'main'}
                    </span>

                    <button
                      onClick={() => handleSelectRepo(repo)}
                      className="flex items-center gap-1 text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline"
                    >
                      <span>Explore & Review</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Repository Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-dark-border pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Connect New Repository
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddRepo} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Owner / Org</label>
                <input
                  type="text"
                  required
                  value={newRepo.owner}
                  onChange={(e) => setNewRepo({ ...newRepo, owner: e.target.value })}
                  placeholder="e.g. acme-corp"
                  className="w-full rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-surface p-2.5 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Repository Name</label>
                <input
                  type="text"
                  required
                  value={newRepo.name}
                  onChange={(e) => setNewRepo({ ...newRepo, name: e.target.value })}
                  placeholder="e.g. payment-service"
                  className="w-full rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-surface p-2.5 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Language</label>
                  <select
                    value={newRepo.language}
                    onChange={(e) => setNewRepo({ ...newRepo, language: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-surface p-2.5 text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="Python">Python</option>
                    <option value="TypeScript">TypeScript</option>
                    <option value="JavaScript">JavaScript</option>
                    <option value="Go">Go</option>
                    <option value="Rust">Rust</option>
                    <option value="Java">Java</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Default Branch</label>
                  <input
                    type="text"
                    value={newRepo.default_branch}
                    onChange={(e) => setNewRepo({ ...newRepo, default_branch: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-surface p-2.5 text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-2 rounded-xl bg-brand-600 py-3 font-semibold text-white hover:bg-brand-500 transition-all shadow-md shadow-brand-500/20"
              >
                Register Repository
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
