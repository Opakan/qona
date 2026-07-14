import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LogOut,
  Workflow,
  Users,
  Briefcase,
  Layers,
  ChevronLeft,
  ChevronRight,
  Search,
  Trash2,
  ShieldCheck,
  ShieldAlert,
  MapPin,
  Mail,
  Calendar,
  Sparkles,
  ArrowUpDown,
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '../api/client';

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalWorkflows: number;
  avgWorkflows: number;
  emailDomains: Array<{ name: string; count: number }>;
  countryDistribution: Array<{ name: string; count: number }>;
  planDistribution: Array<{ name: string; count: number }>;
  growth: Array<{ date: string; count: number }>;
}

interface UserListItem {
  id: string;
  authId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: 'USER' | 'ADMIN';
  country: string | null;
  createdAt: string;
  updatedAt: string;
  workflowsCount: number;
  conversationsCount: number;
  planName: string;
}

export default function AdminDashboard() {
  const { dbUser, signOut, toggleDeveloperRole } = useAuth();
  const navigate = useNavigate();

  // Stats State
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Users List State
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Interactive Actions State
  const [roleUpdatingId, setRoleUpdatingId] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserListItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Fetch Dashboard Stats
  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const response = await apiClient.get('/admin/stats');
      if (response.data?.stats) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch admin stats:', error);
      showToast('Failed to load dashboard statistics.', 'error');
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Fetch Users Table
  const fetchUsers = useCallback(async () => {
    try {
      setUsersLoading(true);
      const response = await apiClient.get('/admin/users', {
        params: {
          page,
          limit,
          search: search.trim() || undefined,
          sortBy,
          sortOrder,
        },
      });
      if (response.data) {
        setUsers(response.data.users || []);
        setTotal(response.data.total || 0);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
      showToast('Failed to load users list.', 'error');
    } finally {
      setUsersLoading(false);
    }
  }, [page, limit, search, sortBy, sortOrder]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/sign-in');
  };

  // Toggle role helper
  const handleToggleRole = async (targetUser: UserListItem) => {
    if (roleUpdatingId) return;
    const newRole = targetUser.role === 'ADMIN' ? 'USER' : 'ADMIN';
    
    // Prevent demoting self in database
    if (targetUser.authId === dbUser?.authId) {
      showToast('For safety, you cannot modify your own active account role.', 'error');
      return;
    }

    try {
      setRoleUpdatingId(targetUser.id);
      await apiClient.patch(`/admin/users/${targetUser.id}/role`, { role: newRole });
      
      // Update locally
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, role: newRole } : u))
      );
      showToast(`Successfully changed ${targetUser.name}'s role to ${newRole}.`, 'success');
      fetchStats(); // Refresh stats in case breakdown changes
    } catch (error) {
      console.error('Failed to update role:', error);
      showToast('Failed to update user role.', 'error');
    } finally {
      setRoleUpdatingId(null);
    }
  };

  // Delete User handler
  const handleDeleteUser = async () => {
    if (!userToDelete || deleting) return;

    try {
      setDeleting(true);
      await apiClient.delete(`/admin/users/${userToDelete.id}`);
      showToast(`User ${userToDelete.name} deleted successfully.`, 'success');
      setUserToDelete(null);
      // If we deleted the last user on a page, go back
      if (users.length === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        fetchUsers();
      }
      fetchStats();
    } catch (error) {
      console.error('Failed to delete user:', error);
      showToast('Failed to delete user account.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setPage(1);
  };

  // Resolve country flag emoji
  const getFlagEmoji = (countryCode: string | null) => {
    if (!countryCode || countryCode === 'Unknown') return '🌐';
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map((char) =>  127397 + char.charCodeAt(0));
    try {
      return String.fromCodePoint(...codePoints);
    } catch {
      return countryCode;
    }
  };

  // Calculate stats summaries
  const maxGrowth = stats?.growth && stats.growth.length > 0
    ? Math.max(...stats.growth.map((g) => g.count), 1)
    : 1;

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50/50 text-slate-900 antialiased font-sans">
      
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl px-4 py-3 shadow-lg transition-all duration-300 border animate-bounce ${
          toast.type === 'success' ? 'bg-emerald-50 border-emerald-250 text-emerald-800' : 'bg-rose-50 border-rose-250 text-rose-800'
        }`}>
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200/60 bg-white/75 backdrop-blur-md px-6 py-4 shadow-xs">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="flex items-center gap-2 font-semibold text-slate-900 hover:scale-[1.02] transition-transform">
              <Workflow className="h-4.5 w-4.5 text-indigo-600 animate-pulse" />
              <span className="bg-gradient-to-r from-slate-900 via-indigo-950 to-indigo-900 bg-clip-text text-transparent">Qona</span>
            </Link>
            <div className="rounded-md bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-bold text-indigo-700 tracking-wider uppercase">
              Admin Portal
            </div>
          </div>

          <div className="flex items-center gap-6">
            <button
              onClick={toggleDeveloperRole}
              className="flex items-center gap-1 rounded-lg border border-yellow-200 bg-yellow-50 px-2.5 py-1 text-[10px] font-semibold text-yellow-800 hover:bg-yellow-100 transition-colors shadow-2xs"
              title="Quick toggle ADMIN/USER role for easy frontend testing."
            >
              <Sparkles className="h-3 w-3 text-yellow-600" />
              Dev: Toggle Role
            </button>

            <div className="flex items-center gap-4">
              <div className="flex flex-col items-end">
                <span className="text-xs font-semibold text-slate-800">
                  {dbUser?.name ?? 'Admin'}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">{dbUser?.email}</span>
              </div>
              <div className="h-8 w-px bg-slate-200" />
              <button
                onClick={handleSignOut}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-500 transition-all hover:bg-slate-50 hover:text-slate-955 shadow-xs cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-6 py-10">
          
          {/* Hero section */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Dashboard Metrics</h2>
              <p className="mt-1.5 text-xs text-slate-500 font-medium">Real-time usage and geolocation user logs.</p>
            </div>
            <Link
              to="/dashboard"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-850 flex items-center gap-1 transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Back to User App
            </Link>
          </div>

          {/* Key Metrics Cards */}
          <div className="grid gap-6 grid-cols-2 lg:grid-cols-4 mb-10">
            {statsLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-28 rounded-2xl border border-slate-200 bg-white p-5 animate-pulse" />
              ))
            ) : stats ? (
              <>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs relative overflow-hidden group">
                  <div className="absolute right-3 top-3 rounded-lg bg-indigo-50 p-2 text-indigo-600">
                    <Users className="h-5 w-5" />
                  </div>
                  <div className="text-2xl font-black text-slate-900">{stats.totalUsers}</div>
                  <div className="mt-1 text-xs font-bold text-slate-400 uppercase tracking-wide">Total Users</div>
                  <div className="mt-2.5 text-[10px] text-emerald-600 font-bold bg-emerald-50 border border-emerald-100 rounded-md px-1.5 py-0.5 inline-block">
                    Active & Registered
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs relative overflow-hidden group">
                  <div className="absolute right-3 top-3 rounded-lg bg-sky-50 p-2 text-sky-600">
                    <Briefcase className="h-5 w-5" />
                  </div>
                  <div className="text-2xl font-black text-slate-900">{stats.activeUsers}</div>
                  <div className="mt-1 text-xs font-bold text-slate-400 uppercase tracking-wide">Active Creators</div>
                  <div className="mt-2.5 text-[10px] text-sky-700 font-bold bg-sky-50 border border-sky-100 rounded-md px-1.5 py-0.5 inline-block">
                    {stats.totalUsers > 0 ? `${Math.round((stats.activeUsers / stats.totalUsers) * 100)}% Conversion` : '0%'}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs relative overflow-hidden group">
                  <div className="absolute right-3 top-3 rounded-lg bg-violet-50 p-2 text-violet-600">
                    <Layers className="h-5 w-5" />
                  </div>
                  <div className="text-2xl font-black text-slate-900">{stats.totalWorkflows}</div>
                  <div className="mt-1 text-xs font-bold text-slate-400 uppercase tracking-wide">Total Workflows</div>
                  <div className="mt-2.5 text-[10px] text-violet-700 font-bold bg-violet-50 border border-violet-100 rounded-md px-1.5 py-0.5 inline-block">
                    Across entire system
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs relative overflow-hidden group">
                  <div className="absolute right-3 top-3 rounded-lg bg-amber-50 p-2 text-amber-600">
                    <Workflow className="h-5 w-5" />
                  </div>
                  <div className="text-2xl font-black text-slate-900">{stats.avgWorkflows}</div>
                  <div className="mt-1 text-xs font-bold text-slate-400 uppercase tracking-wide">Avg Workflows / User</div>
                  <div className="mt-2.5 text-[10px] text-amber-700 font-bold bg-amber-50 border border-amber-100 rounded-md px-1.5 py-0.5 inline-block">
                    Creation density
                  </div>
                </div>
              </>
            ) : null}
          </div>

          {/* Visual Statistics Charts Grid */}
          <div className="grid gap-6 grid-cols-1 md:grid-cols-3 mb-10">
            
            {/* User Growth Line Chart */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs md:col-span-2">
              <h3 className="text-sm font-bold text-slate-800 mb-4">User Growth Trends (Last 30 Days)</h3>
              {statsLoading ? (
                <div className="h-36 flex items-center justify-center">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" />
                </div>
              ) : stats?.growth ? (
                <div className="relative">
                  {/* Custom SVG line / Bar chart */}
                  <div className="flex h-36 items-end gap-1.5 pt-4">
                    {stats.growth.map((g, idx) => {
                      const pct = (g.count / maxGrowth) * 100;
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                          <div 
                            className="w-full bg-gradient-to-t from-indigo-500 to-violet-500 rounded-t-sm group-hover:from-indigo-600 group-hover:to-violet-600 transition-all duration-300 shadow-2xs"
                            style={{ height: `${pct || 4}%`, minHeight: '4px' }}
                          />
                          {/* Tooltip */}
                          <div className="absolute bottom-full mb-1 scale-0 group-hover:scale-100 bg-slate-900 text-white text-[9px] px-1.5 py-0.5 rounded shadow-md pointer-events-none transition-all duration-200 z-10 whitespace-nowrap">
                            {g.date}: {g.count} signups
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="border-t border-slate-100 pt-2 flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wide">
                    <span>{stats.growth[0]?.date}</span>
                    <span>{stats.growth[Math.floor(stats.growth.length / 2)]?.date}</span>
                    <span>{stats.growth[stats.growth.length - 1]?.date}</span>
                  </div>
                </div>
              ) : (
                <div className="h-36 flex items-center justify-center text-xs text-slate-400">No data available</div>
              )}
            </div>

            {/* Email Provider & Country Distribution charts */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-800 mb-4">Email Domains & Subscription Plans</h3>
              {statsLoading ? (
                <div className="h-36 flex items-center justify-center">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" />
                </div>
              ) : stats ? (
                <div className="space-y-4">
                  {/* Email breakdown */}
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Email Providers</h4>
                    <div className="space-y-1.5">
                      {stats.emailDomains.slice(0, 4).map((d, i) => {
                        const totalDomains = stats.emailDomains.reduce((acc, current) => acc + current.count, 0) || 1;
                        const pct = Math.round((d.count / totalDomains) * 100);
                        return (
                          <div key={i} className="text-xs">
                            <div className="flex justify-between font-medium text-slate-700 mb-0.5 text-[11px]">
                              <span>{d.name}</span>
                              <span className="font-semibold text-slate-500">{d.count} ({pct}%)</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Subscriptions */}
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Subscription Tiers</h4>
                    <div className="space-y-1.5">
                      {stats.planDistribution.map((p, i) => {
                        const pct = Math.round((p.count / stats.totalUsers) * 100) || 0;
                        return (
                          <div key={i} className="text-xs">
                            <div className="flex justify-between font-medium text-slate-700 mb-0.5 text-[11px]">
                              <span>{p.name}</span>
                              <span className="font-semibold text-slate-500">{p.count} ({pct}%)</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div className="bg-violet-600 h-full rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-36 flex items-center justify-center text-xs text-slate-400">No data available</div>
              )}
            </div>

          </div>

          {/* Geography Distribution Breakdown */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs mb-10">
            <h3 className="text-sm font-bold text-slate-800 mb-3.5 flex items-center gap-1.5">
              <MapPin className="h-4.5 w-4.5 text-indigo-500" />
              Country Demographic Distribution
            </h3>
            {statsLoading ? (
              <div className="h-10 flex items-center justify-center">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" />
              </div>
            ) : stats?.countryDistribution && stats.countryDistribution.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {stats.countryDistribution.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-xl border border-slate-200/60 bg-slate-50/50 px-3.5 py-2 shadow-2xs">
                    <span className="text-lg">{getFlagEmoji(c.name)}</span>
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold text-slate-800">{c.name === 'Unknown' ? 'Global / Proxy' : c.name}</span>
                      <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">{c.count} {c.count === 1 ? 'User' : 'Users'}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-400 text-center py-4">No countries geolocated yet. Try creating/signing in a new user.</div>
            )}
          </div>

          {/* User Management Section */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            
            {/* Search/Sort controls header */}
            <div className="border-b border-slate-100 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/20">
              <div>
                <h3 className="text-sm font-extrabold text-slate-800">User Directory</h3>
                <p className="text-[10px] text-slate-400 font-medium">Manage user profiles, active scopes, and permissions.</p>
              </div>

              <div className="flex items-center gap-3">
                {/* Search bar */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by name, email, or country..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    className="w-64 rounded-xl border border-slate-200 pl-9 pr-4 py-2 text-xs font-semibold text-slate-700 bg-white placeholder-slate-400 focus:outline-hidden focus:border-indigo-400 transition-colors shadow-2xs"
                  />
                  <Search className="absolute left-3.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-150 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                    <th className="px-6 py-3.5 font-bold">User</th>
                    <th className="px-6 py-3.5 font-bold cursor-pointer hover:bg-slate-100/50" onClick={() => handleSort('email')}>
                      <div className="flex items-center gap-1">
                        Email / Domain
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th className="px-6 py-3.5 font-bold cursor-pointer hover:bg-slate-100/50" onClick={() => handleSort('country')}>
                      <div className="flex items-center gap-1">
                        Country
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th className="px-6 py-3.5 font-bold cursor-pointer hover:bg-slate-100/50" onClick={() => handleSort('role')}>
                      <div className="flex items-center gap-1">
                        Role
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th className="px-6 py-3.5 font-bold">Plan</th>
                    <th className="px-6 py-3.5 font-bold text-center">Workflows</th>
                    <th className="px-6 py-3.5 font-bold cursor-pointer hover:bg-slate-100/50" onClick={() => handleSort('createdAt')}>
                      <div className="flex items-center gap-1 justify-end">
                        Registered
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th className="px-6 py-3.5 font-bold text-right pr-8">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {usersLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan={8} className="px-6 py-5">
                          <div className="h-4 bg-slate-100 rounded-sm w-full" />
                        </td>
                      </tr>
                    ))
                  ) : users.length > 0 ? (
                    users.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50/40 transition-colors">
                        {/* Name/Avatar */}
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 border border-slate-200 overflow-hidden font-bold text-slate-600">
                              {user.avatarUrl ? (
                                <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
                              ) : (
                                user.name.slice(0, 2).toUpperCase()
                              )}
                            </div>
                            <div className="font-semibold text-slate-800 leading-tight">
                              {user.name}
                            </div>
                          </div>
                        </td>

                        {/* Email */}
                        <td className="px-6 py-3 text-slate-500 font-medium">
                          <div className="flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5 text-slate-350" />
                            {user.email}
                          </div>
                        </td>

                        {/* Country */}
                        <td className="px-6 py-3 text-slate-700 font-semibold">
                          <div className="flex items-center gap-1.5">
                            <span className="text-base">{getFlagEmoji(user.country)}</span>
                            {user.country ? (user.country === 'Unknown' ? 'Global' : user.country) : '—'}
                          </div>
                        </td>

                        {/* Role Toggle */}
                        <td className="px-6 py-3">
                          <button
                            onClick={() => handleToggleRole(user)}
                            disabled={roleUpdatingId === user.id}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-0.5 text-[10px] font-bold border transition-colors shadow-2xs ${
                              user.role === 'ADMIN'
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                            title="Click to toggle user role"
                          >
                            {user.role === 'ADMIN' ? (
                              <>
                                <ShieldCheck className="h-3 w-3 text-indigo-500" />
                                Admin
                              </>
                            ) : (
                              <>
                                <ShieldAlert className="h-3 w-3 text-slate-400" />
                                User
                              </>
                            )}
                          </button>
                        </td>

                        {/* Plan */}
                        <td className="px-6 py-3 font-semibold text-slate-600">
                          <span className={`inline-block px-2 py-0.5 rounded-md text-[9px] font-bold ${
                            user.planName === 'Pro' ? 'bg-violet-50 text-violet-700 border border-violet-200' :
                            user.planName === 'Starter' ? 'bg-sky-50 text-sky-700 border border-sky-200' :
                            'bg-slate-50 text-slate-500 border border-slate-200'
                          }`}>
                            {user.planName}
                          </span>
                        </td>

                        {/* Workflows count */}
                        <td className="px-6 py-3 text-center font-bold text-slate-600">
                          {user.workflowsCount}
                        </td>

                        {/* Registered Date */}
                        <td className="px-6 py-3 text-right text-slate-500 font-medium whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-slate-350" />
                            {new Date(user.createdAt).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-3 text-right">
                          <button
                            onClick={() => setUserToDelete(user)}
                            className="rounded-lg p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer inline-block"
                            title="Delete User Account"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="text-center py-10 text-slate-400 font-semibold">
                        No users match the search filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination controls */}
            {totalPages > 1 && (
              <div className="border-t border-slate-100 p-5 flex items-center justify-between bg-slate-50/10">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                  Page {page} of {totalPages} ({total} Users total)
                </span>

                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    disabled={page === 1}
                    className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition-colors shadow-2xs cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                    disabled={page === totalPages}
                    className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition-colors shadow-2xs cursor-pointer"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

          </div>

        </div>
      </main>

      {/* Delete User Modal Dialog */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-slate-900">Permanently delete user?</h3>
            <p className="mt-2.5 text-xs leading-relaxed text-slate-500">
              Are you sure you want to delete <span className="font-semibold text-slate-800">{userToDelete.name}</span> ({userToDelete.email})?
              All of their workflows, conversations, API keys, and records will be immediately and permanently destroyed.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setUserToDelete(null)}
                disabled={deleting}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={deleting}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50 transition-colors shadow-sm cursor-pointer flex items-center gap-1.5"
              >
                {deleting && <div className="h-3 w-3 animate-spin rounded-full border-2 border-white/20 border-t-white" />}
                Yes, Delete Account
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
