import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import AuthModal from './components/auth/AuthModal';
import AppLayout from './components/layout/AppLayout';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import CodeStudioPage from './pages/CodeStudioPage';
import RepositoriesPage from './pages/RepositoriesPage';
import PullRequestsPage from './pages/PullRequestsPage';
import ReviewDetailsPage from './pages/ReviewDetailsPage';
import SettingsPage from './pages/SettingsPage';
import OAuthCallbackPage from './pages/OAuthCallbackPage';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AuthModal />
          <Routes>
            {/* Landing & Public Pages */}
            <Route element={<AppLayout withSidebar={false} />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
            </Route>

            {/* Dashboard & Workspace with Sidebar (Studio is public/guest accessible) */}
            <Route element={<AppLayout withSidebar={true} />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/studio" element={<CodeStudioPage />} />
              <Route path="/repositories" element={<RepositoriesPage />} />
              <Route path="/pull-requests" element={<PullRequestsPage />} />
              <Route path="/reviews" element={<ReviewDetailsPage />} />
              <Route path="/reviews/:id" element={<ReviewDetailsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
