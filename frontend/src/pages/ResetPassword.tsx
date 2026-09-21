import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Supabase passes access_token or recovery type in the hash or query
    const hash = window.location.hash;
    if (hash && hash.includes('type=recovery')) {
      // Recovery session established
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) throw updateError;

      setSuccess(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err: any) {
      setError(err?.message || 'Failed to update password. Your reset link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-[calc(100vh-8rem)] items-center justify-center bg-slate-50/50 px-4 py-12 sm:px-6 lg:px-8 overflow-hidden">
      <div className="w-full max-w-md relative">
        <div className="bg-white border border-slate-200/90 p-8 sm:p-10 rounded-3xl shadow-xl shadow-slate-200/40">
          <div className="flex flex-col items-center text-center">
            <Link to="/" className="flex items-center gap-2.5 group transition-transform hover:scale-[1.02]">
              <img src="/logo.png" alt="Qonace" className="h-6 w-6 object-contain" />
              <span className="text-xl font-black font-display tracking-tight text-slate-950">Qonace</span>
            </Link>

            <h2 className="mt-6 text-2xl sm:text-3xl font-black font-display text-slate-950 tracking-tight">
              Create new password
            </h2>
            <p className="mt-2 text-xs font-semibold text-slate-500 max-w-xs leading-relaxed">
              Your new password must be at least 6 characters long.
            </p>
          </div>

          {error && (
            <div className="mt-6 flex items-start gap-2.5 rounded-xl bg-red-50 p-3.5 border border-red-200 text-xs font-semibold text-red-800 animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mt-6 flex items-start gap-2.5 rounded-xl bg-emerald-50 p-3.5 border border-emerald-200 text-xs font-semibold text-emerald-800 animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
              <span>Password updated successfully! Redirecting to dashboard...</span>
            </div>
          )}

          {!success && (
            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-250 bg-white py-2.5 pl-10 pr-10 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-250 bg-white py-2.5 pl-10 pr-3.5 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] px-4 py-3 text-sm font-bold text-white shadow-md shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                ) : (
                  <span>Update Password</span>
                )}
              </button>
            </form>
          )}

          <div className="mt-8 border-t border-slate-100 pt-6 text-center">
            <Link to="/sign-in" className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline">
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
