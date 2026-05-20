import { useAuth } from '../context/AuthContext';
import { LogOut, Workflow, BarChart3, Plus, History } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/sign-in');
  };

  return (
    <div className="flex min-h-screen flex-col bg-white text-gray-900 antialiased">
      <header className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <Link to="/" className="flex items-center gap-2">
          <Workflow className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium tracking-tight text-gray-900">Qona</span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">
            {user?.user_metadata?.full_name ?? user?.email ?? 'User'}
          </span>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="mb-12">
            <h2 className="text-2xl font-semibold tracking-tight text-gray-900">
              Good afternoon{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name.split(' ')[0]}` : ''}
            </h2>
            <p className="mt-1.5 text-sm text-gray-500">Create and manage your AI-powered workflows.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Link
              to="/chat"
              className="group flex flex-col rounded-xl border border-gray-200 p-6 text-left transition-colors hover:border-gray-300 hover:bg-gray-50"
            >
              <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100">
                <Plus className="h-4 w-4 text-gray-500" />
              </div>
              <span className="text-sm font-medium text-gray-900">New workflow</span>
              <span className="mt-1 text-sm text-gray-500">Start from a prompt</span>
            </Link>
            <Link
              to="/dashboard"
              className="group flex flex-col rounded-xl border border-gray-200 p-6 text-left transition-colors hover:border-gray-300 hover:bg-gray-50"
            >
              <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100">
                <History className="h-4 w-4 text-gray-500" />
              </div>
              <span className="text-sm font-medium text-gray-900">Recent workflows</span>
              <span className="mt-1 text-sm text-gray-500">Continue where you left off</span>
            </Link>
            <button className="group flex flex-col rounded-xl border border-gray-200 p-6 text-left transition-colors hover:border-gray-300 hover:bg-gray-50">
              <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100">
                <BarChart3 className="h-4 w-4 text-gray-500" />
              </div>
              <span className="text-sm font-medium text-gray-900">Analytics</span>
              <span className="mt-1 text-sm text-gray-500">Track performance</span>
            </button>
          </div>

          <div className="mt-16">
            <h3 className="text-xs font-medium text-gray-400">OVERVIEW</h3>
            <div className="mt-4 grid grid-cols-3 gap-4">
              {[
                { value: '0', label: 'Workflows' },
                { value: '0', label: 'Exports this month' },
                { value: '—', label: 'Success rate' },
              ].map((stat, i) => (
                <div key={i} className="rounded-xl border border-gray-200 p-4">
                  <div className="text-xl font-semibold tracking-tight text-gray-900">{stat.value}</div>
                  <div className="mt-1 text-xs text-gray-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
