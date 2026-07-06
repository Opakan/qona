import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { Workflow, Sparkles } from 'lucide-react';

export default function SignIn() {
  const { signInWithGoogle, signInAsGuest } = useAuth();

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8 overflow-hidden">
      {/* Background gradient shapes */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-200/20 rounded-full blur-3xl -translate-y-1/2" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-200/20 rounded-full blur-3xl translate-y-1/2" />

      <div className="w-full max-w-md space-y-8 relative">
        <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200 p-8 shadow-xl shadow-slate-100/50">
          <div className="flex flex-col items-center">
            <Link to="/" className="flex items-center gap-2 group transition-transform hover:scale-[1.02]">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Workflow className="h-5 w-5 animate-pulse" />
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900 bg-gradient-to-r from-slate-900 to-indigo-950 bg-clip-text">Qona</span>
            </Link>
            
            <h2 className="mt-6 text-center text-2xl font-extrabold text-slate-900 tracking-tight">
              Sign in to your account
            </h2>
            <p className="mt-2 text-center text-xs font-medium text-slate-500 max-w-xs leading-relaxed">
              Unlock conversational AI workflow generation, direct n8n compiling, and project export capabilities.
            </p>
          </div>

          <div className="mt-8 space-y-4">
            <button
              onClick={signInWithGoogle}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:border-slate-300 cursor-pointer"
            >
              <svg className="h-4.5 w-4.5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </button>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink mx-4 text-[10px] font-bold text-slate-450 uppercase tracking-widest">Developer Sandbox</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            <button
              onClick={signInAsGuest}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-slate-800 hover:shadow-lg cursor-pointer"
            >
              <Sparkles className="h-4 w-4 text-indigo-400" />
              Sign in as Guest (Dev Bypass)
            </button>
          </div>

          <div className="mt-8 border-t border-slate-100 pt-6">
            <p className="text-center text-[10px] leading-relaxed text-slate-400 font-medium">
              By accessing this sandbox system, you agree to our <br />
              <Link to="/terms-of-service" className="underline hover:text-slate-650">Terms of Service</Link> and <Link to="/privacy-policy" className="underline hover:text-slate-650">Privacy Policy</Link>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
