import { useAuth } from '../context/AuthContext';
import { LogOut, Workflow, BarChart3, LayoutDashboard, Plus } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/sign-in');
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#0A0A0A] text-white">
      <header className="flex items-center justify-between border-b border-white/5 px-6 py-4">
        <Link to="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-violet-500 to-purple-600 text-xs font-bold text-white">Q</div>
          <span>Qona</span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-white/50">
            {user?.user_metadata?.full_name ?? user?.email ?? 'User'}
          </span>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/40 transition-colors hover:bg-white/5 hover:text-white/70"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </header>

      <main className="flex-1 p-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10">
            <h2 className="text-3xl font-bold tracking-tight">
              Welcome back{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : ''}
            </h2>
            <p className="mt-2 text-white/40">Manage your workflows and automations</p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              to="/dashboard"
              className="group rounded-2xl border border-white/5 bg-white/[0.01] p-6 transition-all hover:border-violet-500/20 hover:bg-violet-500/[0.02]"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 ring-1 ring-violet-500/20">
                <Plus className="h-6 w-6 text-violet-400" />
              </div>
              <h3 className="font-semibold">New Workflow</h3>
              <p className="mt-1 text-sm text-white/40">Create an AI-powered workflow from a prompt</p>
            </Link>
            <div className="rounded-2xl border border-white/5 bg-white/[0.01] p-6 transition-all hover:border-white/10">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10 ring-1 ring-violet-500/20">
                <Workflow className="h-6 w-6 text-violet-400" />
              </div>
              <h3 className="font-semibold">Workflows</h3>
              <p className="mt-1 text-sm text-white/40">View and manage your saved workflows</p>
            </div>
            <div className="rounded-2xl border border-white/5 bg-white/[0.01] p-6 transition-all hover:border-white/10">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 ring-1 ring-purple-500/20">
                <BarChart3 className="h-6 w-6 text-purple-400" />
              </div>
              <h3 className="font-semibold">Analytics</h3>
              <p className="mt-1 text-sm text-white/40">Monitor workflow execution and performance</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
