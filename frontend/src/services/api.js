import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT auth tokens
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Authentication API
export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  getGithubUrl: () => api.get('/auth/github/url'),
  githubCallback: (data) => api.post('/auth/github/callback', data),
  getGoogleUrl: () => api.get('/auth/google/url'),
  googleCallback: (data) => api.post('/auth/google/callback', data),
  disconnectGithub: () => api.post('/auth/disconnect-github'),
};

// GitHub Integration API
export const githubApi = {
  getStatus: () => api.get('/github/status'),
  getUserRepos: () => api.get('/github/user-repos'),
  getBranches: (owner, repo) => api.get(`/github/repos/${owner}/${repo}/branches`),
  getContents: (owner, repo, params) => api.get(`/github/repos/${owner}/${repo}/contents`, { params }),
  getFile: (owner, repo, params) => api.get(`/github/repos/${owner}/${repo}/file`, { params }),
  getPulls: (owner, repo, params) => api.get(`/github/repos/${owner}/${repo}/pulls`, { params }),
  getPullDiff: (owner, repo, pullNumber) => api.get(`/github/repos/${owner}/${repo}/pulls/${pullNumber}/diff`),
  reviewPull: (owner, repo, pullNumber) => api.post(`/github/repos/${owner}/${repo}/pulls/${pullNumber}/review`),
};

// Dashboard Telemetry API
export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats'),
};

// Reviews & Findings API
export const reviewsApi = {
  list: (params) => api.get('/reviews', { params }),
  getRecent: (limit = 10) => api.get('/reviews/recent', { params: { limit } }),
  get: (id) => api.get(`/reviews/${id}`),
  getFindings: (id, params) => api.get(`/reviews/${id}/findings`, { params }),
  create: (data) => api.post('/reviews', data),
};

// Repositories API
export const reposApi = {
  list: (params) => api.get('/repositories', { params }),
  get: (id) => api.get(`/repositories/${id}`),
  create: (data) => api.post('/repositories', data),
  update: (id, data) => api.put(`/repositories/${id}`, data),
  updateConfig: (id, config) => api.put(`/repositories/${id}/config`, config),
  delete: (id) => api.delete(`/repositories/${id}`),
};

// Pull Requests API
export const prsApi = {
  list: (params) => api.get('/pull-requests', { params }),
  getByRepo: (repoId, params) => api.get(`/repositories/${repoId}/pull-requests`, { params }),
  get: (id) => api.get(`/pull-requests/${id}`),
  getReviews: (prId) => api.get(`/pull-requests/${prId}/reviews`),
};

// AI Direct Review API (Code Studio & Playground)
export const aiApi = {
  reviewDirectCode: (payload) => api.post('/ai/review-code', payload),
};

// Health API
export const healthApi = {
  getHealth: () => api.get('/health'),
};

export default api;
