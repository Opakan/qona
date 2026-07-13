import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, Workflow, BarChart3, Plus, History, Sparkles } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

export default function Dashboard() {
  const { user, dbUser, signOut, toggleDeveloperRole } = useAuth();
  const navigate = useNavigate();

  // Dynamic redirect if user typed a prompt on the homepage
  useEffect(() => {
    const pendingPrompt = sessionStorage.getItem('qonace_pending_prompt');
    if (pendingPrompt) {
      sessionStorage.removeItem('qonace_pending_prompt');
      navigate('/chat', { state: { initialPrompt: pendingPrompt } });
    }
  }, [navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/sign-in');
  };

  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Good morning';
    if (hr < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50/50 text-slate-900 antialiased">
      <header className="sticky top-0 z-40 border-b border-slate-200/60 bg-white/75 backdrop-blur-md px-6 py-4 shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-semibold text-slate-900 hover:scale-[1.02] transition-transform">
            <Workflow className="h-4.5 w-4.5 text-indigo-600 animate-pulse" />
            <span className="bg-gradient-to-r from-slate-900 via-indigo-950 to-indigo-900 bg-clip-text text-transparent">Qonace</span>
          </Link>
          <div className="flex items-center gap-4">
            {dbUser?.role === 'ADMIN' && (
              <Link
                to="/admin"
                className="rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 transition-colors px-3 py-1.5 text-xs font-bold shadow-2xs"
              >
                Admin Panel
              </Link>
            )}
            
            <button
              onClick={toggleDeveloperRole}
              className="flex items-center gap-1 rounded-lg border border-yellow-250 bg-yellow-50 px-2 py-1 text-[10px] font-semibold text-yellow-800 hover:bg-yellow-100 transition-colors shadow-2xs cursor-pointer"
              title="Quick toggle ADMIN/USER role for easy testing."
            >
              <Sparkles className="h-3 w-3 text-yellow-600 animate-spin" style={{ animationDuration: '3s' }} />
              Dev: Toggle Admin
            </button>

            <div className="flex flex-col items-end">
              <span className="text-xs font-semibold text-slate-800">
                {dbUser?.name ?? user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'User'}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">{dbUser?.email ?? user?.email}</span>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-500 transition-all hover:bg-slate-50 hover:text-slate-955 shadow-sm cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-6 py-12">
          {/* Hero Greeting */}
          <div className="mb-12">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
              {getGreeting()}{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name.split(' ')[0]}` : ''}
            </h2>
            <p className="mt-2 text-sm text-slate-500 font-medium">Create and manage your AI-powered automation workflows.</p>
          </div>

          {/* Cards Grid */}
          <div className="grid gap-6 sm:grid-cols-3">
            <Link
              to="/chat"
              className="group relative flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-indigo-400 hover:shadow-md cursor-pointer overflow-hidden"
            >
              <div className="absolute top-0 right-0 h-24 w-24 bg-gradient-to-br from-indigo-50/40 to-transparent rounded-bl-full -z-0" />
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition-colors group-hover:bg-indigo-600 group-hover:text-white">
                <Plus className="h-5 w-5" />
              </div>
              <span className="text-sm font-semibold text-slate-950">New workflow</span>
              <span className="mt-2 text-xs leading-relaxed text-slate-500">Start from a descriptive plain-English prompt.</span>
            </Link>
            
            <Link
              to="/dashboard"
              className="group relative flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-indigo-400 hover:shadow-md cursor-pointer overflow-hidden"
            >
              <div className="absolute top-0 right-0 h-24 w-24 bg-gradient-to-br from-indigo-50/40 to-transparent rounded-bl-full -z-0" />
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition-colors group-hover:bg-indigo-600 group-hover:text-white">
                <History className="h-5 w-5" />
              </div>
              <span className="text-sm font-semibold text-slate-955">Recent workflows</span>
              <span className="mt-2 text-xs leading-relaxed text-slate-500">Continue building or editing your active projects.</span>
            </Link>

            <button className="group relative flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-indigo-400 hover:shadow-md cursor-pointer text-left overflow-hidden">
              <div className="absolute top-0 right-0 h-24 w-24 bg-gradient-to-br from-indigo-50/40 to-transparent rounded-bl-full -z-0" />
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition-colors group-hover:bg-indigo-600 group-hover:text-white">
                <BarChart3 className="h-5 w-5" />
              </div>
              <span className="text-sm font-semibold text-slate-955">Analytics</span>
              <span className="mt-2 text-xs leading-relaxed text-slate-500">Track and monitor your execution rates and triggers.</span>
            </button>
          </div>

          {/* Stats Overview */}
          <div className="mt-16">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Usage Overview</h3>
            <div className="mt-4 grid grid-cols-3 gap-6">
              {[
                { value: '0', label: 'Workflows Created' },
                { value: '0', label: 'Exports This Month' },
                { value: '—', label: 'Compilation Success Rate' },
              ].map((stat, i) => (
                <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="text-2xl font-bold tracking-tight text-slate-900">{stat.value}</div>
                  <div className="mt-1.5 text-xs font-semibold text-slate-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
