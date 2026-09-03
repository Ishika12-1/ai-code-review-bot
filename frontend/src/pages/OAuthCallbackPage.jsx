import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Bot, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/api';

export default function OAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setAuthTokenAndUser } = useAuth();
  const [status, setStatus] = useState('processing'); // 'processing' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('');

  const code = searchParams.get('code');
  const provider = searchParams.get('provider') || 'github';

  useEffect(() => {
    const handleCallback = async () => {
      if (!code) {
        setStatus('error');
        setErrorMessage('No authorization code was returned by the authentication provider.');
        return;
      }

      try {
        let res;
        if (provider === 'google') {
          res = await authApi.googleCallback({ code });
        } else {
          res = await authApi.githubCallback({ code });
        }

        const { access_token, user } = res.data;
        setAuthTokenAndUser(access_token, user);
        setStatus('success');

        // Redirect after brief delay
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      } catch (err) {
        console.error('OAuth Callback processing error:', err);
        setStatus('error');
        setErrorMessage(
          err.response?.data?.detail || 'Failed to complete authentication. Please verify OAuth configuration.'
        );
      }
    };

    handleCallback();
  }, [code, provider, navigate, setAuthTokenAndUser]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border p-8 text-center shadow-xl space-y-6">
        <div className="flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white shadow-lg shadow-brand-500/30">
            <Bot className="h-7 w-7" />
          </div>
        </div>

        {status === 'processing' && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Authenticating with {provider === 'google' ? 'Google' : 'GitHub'}...
            </h2>
            <div className="flex justify-center py-2">
              <div className="h-6 w-6 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
            </div>
            <p className="text-xs text-slate-500 dark:text-dark-muted">
              Securing connection and synchronizing developer profile...
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-3">
            <div className="flex justify-center text-emerald-500">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Authentication Successful!
            </h2>
            <p className="text-xs text-slate-500 dark:text-dark-muted">
              Redirecting you to the developer dashboard...
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="flex justify-center text-rose-500">
              <AlertCircle className="h-8 w-8" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Authentication Failed
            </h2>
            <p className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 p-3 rounded-xl border border-rose-200 dark:border-rose-500/20">
              {errorMessage}
            </p>
            <div className="pt-2">
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-brand-500 transition-all"
              >
                Return to Dashboard
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
