import React, { useState, useEffect } from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, ArrowLeft, Sparkles, Loader2 } from 'lucide-react';

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, dbUser, isLoading, toggleDeveloperRole } = useAuth();
  const location = useLocation();
  const [waitingForDb, setWaitingForDb] = useState(true);

  useEffect(() => {
    // If dbUser is loaded or user is not authenticated, stop waiting
    if (dbUser !== null || !isAuthenticated) {
      setWaitingForDb(false);
    } else {
      // Grace timeout for async /auth/me call
      const timer = setTimeout(() => setWaitingForDb(false), 600);
      return () => clearTimeout(timer);
    }
  }, [dbUser, isAuthenticated]);

  if (isLoading || (isAuthenticated && dbUser === null && waitingForDb)) {
    return (
      <div className="flex h-screen items-center justify-center bg-white dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-600 dark:text-indigo-400" />
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Verifying admin credentials...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/sign-in" state={{ from: location }} replace />;
  }

  const adminEmails = [
    'opadboss@gmail.com',
    'opadgiant@gmail.com',
    'opakan@gmail.com',
    'admin@qonace.com',
  ];
  const userEmail = (user?.email || dbUser?.email || '').toLowerCase();
  const isOwner = adminEmails.includes(userEmail);
  const isDevAdmin = (() => {
    try {
      return localStorage.getItem('qonace-developer-role') === 'ADMIN';
    } catch {
      return false;
    }
  })();

  const hasAdminAccess = isOwner || isDevAdmin || dbUser?.role === 'ADMIN';

  // If unauthorized, render a clear diagnostic screen with option to toggle dev admin
  if (!hasAdminAccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
        <div className="max-w-md w-full p-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center shadow-xl">
          <div className="h-12 w-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center text-amber-600 dark:text-amber-400 mx-auto mb-4">
            <ShieldAlert className="h-6 w-6" />
          </div>

          <h2 className="text-lg font-black font-display mb-1.5 text-slate-950 dark:text-white">
            Admin Access Required
          </h2>

          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
            Signed in as <strong className="text-slate-800 dark:text-slate-200">{user?.email || 'Guest'}</strong>. 
            This account does not currently have administrator privileges.
          </p>

          <div className="flex flex-col gap-2.5">
            <button
              onClick={() => {
                toggleDeveloperRole();
                window.location.reload();
              }}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Enable Admin Access (Dev Mode)</span>
            </button>

            <Link
              to="/dashboard"
              className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Return to Dashboard</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
