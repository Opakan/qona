import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff, AlertCircle, CheckCircle2, ArrowLeft, Loader2 } from 'lucide-react';

export default function SignIn() {
  const { signInWithGoogle, signInWithGitHub, signInWithEmail, signUpWithEmail, resetPassword } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'github' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const clearMessages = () => {
    setError(null);
    setSuccessMessage(null);
  };

  const handleOAuth = async (provider: 'google' | 'github') => {
    clearMessages();
    setOauthLoading(provider);
    try {
      if (provider === 'google') {
        await signInWithGoogle();
      } else {
        await signInWithGitHub();
      }
    } catch (err: any) {
      setError(err?.message || `Failed to initialize ${provider} sign-in.`);
      setOauthLoading(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!email || !email.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }

    if (mode === 'forgot') {
      setLoading(true);
      try {
        const { error: resetErr } = await resetPassword(email);
        if (resetErr) throw resetErr;
        setSuccessMessage('Password reset link sent! Check your inbox.');
      } catch (err: any) {
        setError(err?.message || 'Failed to send password reset email.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signup') {
        const { data, error: signupErr } = await signUpWithEmail(email, password, fullName);
        if (signupErr) throw signupErr;
        
        if (data?.session) {
          navigate('/dashboard');
        } else {
          setSuccessMessage('Account created! Please check your email to confirm your account, or sign in.');
          setMode('signin');
        }
      } else {
        const { error: signinErr } = await signInWithEmail(email, password);
        if (signinErr) throw signinErr;
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-[calc(100vh-8rem)] items-center justify-center bg-slate-50/50 px-4 py-12 sm:px-6 lg:px-8 overflow-hidden">
      <div className="w-full max-w-md relative">
        <div className="bg-white border border-slate-200/90 p-8 sm:p-10 rounded-3xl shadow-xl shadow-slate-200/40">
          {/* Header */}
          <div className="flex flex-col items-center text-center">
            <Link to="/" className="flex items-center gap-2.5 group transition-transform hover:scale-[1.02]">
              <img src="/logo.png" alt="Qonace" className="h-6 w-6 object-contain" />
              <span className="text-xl font-black font-display tracking-tight text-slate-950">Qonace</span>
            </Link>

            <h2 className="mt-6 text-2xl sm:text-3xl font-black font-display text-slate-950 tracking-tight">
              {mode === 'signin' && 'Sign in to your account'}
              {mode === 'signup' && 'Create your account'}
              {mode === 'forgot' && 'Reset your password'}
            </h2>
            <p className="mt-2 text-xs font-semibold text-slate-500 max-w-xs leading-relaxed">
              {mode === 'signin' && 'Generate and manage production-ready AI workflows with autonomous n8n nodes.'}
              {mode === 'signup' && 'Start building smart automated workflows in seconds. No credit card required.'}
              {mode === 'forgot' && 'Enter your verified account email to receive a secure recovery link.'}
            </p>
          </div>

          {/* Alerts */}
          {error && (
            <div className="mt-6 flex items-start gap-2.5 rounded-xl bg-red-50 p-3.5 border border-red-200 text-xs font-semibold text-red-800 animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="mt-6 flex items-start gap-2.5 rounded-xl bg-emerald-50 p-3.5 border border-emerald-200 text-xs font-semibold text-emerald-800 animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {mode !== 'forgot' && (
            <>
              {/* OAuth Social Buttons */}
              <div className="mt-8 space-y-3">
                {/* Google Button */}
                <button
                  type="button"
                  onClick={() => handleOAuth('google')}
                  disabled={!!oauthLoading || loading}
                  className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-250 bg-white px-4 py-3 text-sm font-bold text-slate-800 shadow-sm transition-all hover:bg-slate-50 hover:border-slate-300 hover:shadow active:scale-[0.99] disabled:opacity-60 cursor-pointer"
                >
                  {oauthLoading === 'google' ? (
                    <Loader2 className="h-5 w-5 animate-spin text-slate-600" />
                  ) : (
                    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                  )}
                  <span>Continue with Google</span>
                </button>

                {/* GitHub Button */}
                <button
                  type="button"
                  onClick={() => handleOAuth('github')}
                  disabled={!!oauthLoading || loading}
                  className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-250 bg-slate-950 px-4 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-slate-900 active:scale-[0.99] disabled:opacity-60 cursor-pointer"
                >
                  {oauthLoading === 'github' ? (
                    <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                  ) : (
                    <svg className="h-5 w-5 fill-current shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                    </svg>
                  )}
                  <span>Continue with GitHub</span>
                </button>
              </div>

              {/* Divider */}
              <div className="relative my-7">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-[11px] uppercase">
                  <span className="bg-white px-3 font-bold text-slate-400 tracking-wider">
                    Or continue with email
                  </span>
                </div>
              </div>
            </>
          )}

          {/* Email / Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Alex Morgan"
                    className="w-full rounded-xl border border-slate-250 bg-white py-2.5 pl-10 pr-3.5 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@company.com"
                  className="w-full rounded-xl border border-slate-250 bg-white py-2.5 pl-10 pr-3.5 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 transition-all"
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-800">
                    Password
                  </label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => {
                        clearMessages();
                        setMode('forgot');
                      }}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
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
            )}

            <button
              type="submit"
              disabled={loading || !!oauthLoading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] px-4 py-3 text-sm font-bold text-white shadow-md shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin text-white" />
              ) : (
                <span>
                  {mode === 'signin' && 'Sign In'}
                  {mode === 'signup' && 'Create Account'}
                  {mode === 'forgot' && 'Send Reset Link'}
                </span>
              )}
            </button>
          </form>

          {/* Mode Switchers */}
          <div className="mt-6 text-center text-xs font-semibold text-slate-500">
            {mode === 'signin' && (
              <p>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    clearMessages();
                    setMode('signup');
                  }}
                  className="font-bold text-indigo-600 hover:text-indigo-700 hover:underline cursor-pointer"
                >
                  Sign up free
                </button>
              </p>
            )}

            {mode === 'signup' && (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    clearMessages();
                    setMode('signin');
                  }}
                  className="font-bold text-indigo-600 hover:text-indigo-700 hover:underline cursor-pointer"
                >
                  Sign in
                </button>
              </p>
            )}

            {mode === 'forgot' && (
              <button
                type="button"
                onClick={() => {
                  clearMessages();
                  setMode('signin');
                }}
                className="inline-flex items-center gap-1.5 font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Sign In
              </button>
            )}
          </div>

          {/* Footer Terms */}
          <div className="mt-8 border-t border-slate-100 pt-6">
            <p className="text-center text-[10px] leading-relaxed text-slate-400 font-medium">
              By continuing, you agree to Qonace's <br />
              <Link to="/terms-of-service" className="underline hover:text-slate-700 font-semibold">Terms of Service</Link> and{' '}
              <Link to="/privacy-policy" className="underline hover:text-slate-700 font-semibold">Privacy Policy</Link>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
