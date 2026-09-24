import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Link, useNavigate } from 'react-router-dom';
import { 
  User, 
  Lock, 
  CreditCard, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Shield, 
  Loader2, 
  ExternalLink,
  Sparkles,
  KeyRound,
  Palette,
  Laptop,
  Sun,
  Moon
} from 'lucide-react';
import { ThemeToggle } from './shared/ThemeToggle';
import { useTheme } from '../context/ThemeContext';

interface AccountSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AccountSettingsModal: React.FC<AccountSettingsModalProps> = ({ isOpen, onClose }) => {
  const { user, dbUser, subscription, hasActiveSubscription } = useAuth();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'billing' | 'appearance'>('profile');
  const [fullName, setFullName] = useState(
    dbUser?.name ?? user?.user_metadata?.full_name ?? ''
  );
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Security tab state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);
    setIsUpdatingProfile(true);

    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: fullName },
      });
      if (error) throw error;
      setProfileSuccess('Profile details updated successfully!');
    } catch (err: any) {
      setProfileError(err?.message || 'Failed to update profile.');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      setPasswordSuccess('Password changed successfully!');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err?.message || 'Failed to change password.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const provider = user?.app_metadata?.provider ?? 'email';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-2xl shadow-slate-900/30 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-extrabold text-sm">
              {(fullName || user?.email || 'U').charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-sm font-black font-display text-slate-950 dark:text-white tracking-tight">
                Account Settings
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                {user?.email}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Layout with Sidebar Tabs */}
        <div className="flex flex-col sm:flex-row min-h-[380px]">
          {/* Navigation Sidebar */}
          <div className="w-full sm:w-48 bg-slate-50/70 dark:bg-slate-950/40 border-b sm:border-b-0 sm:border-r border-slate-200/80 dark:border-slate-800 p-3 space-y-1">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex w-full items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === 'profile'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200/80 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <User className="h-4 w-4" />
              <span>Profile</span>
            </button>

            <button
              onClick={() => setActiveTab('appearance')}
              className={`flex w-full items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === 'appearance'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200/80 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Palette className="h-4 w-4" />
              <span>Appearance</span>
            </button>

            <button
              onClick={() => setActiveTab('security')}
              className={`flex w-full items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === 'security'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200/80 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Lock className="h-4 w-4" />
              <span>Security</span>
            </button>

            <button
              onClick={() => setActiveTab('billing')}
              className={`flex w-full items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === 'billing'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200/80 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <CreditCard className="h-4 w-4" />
              <span>Plan &amp; Billing</span>
            </button>
          </div>

          {/* Tab Content Area */}
          <div className="flex-1 p-6 sm:p-8 overflow-y-auto">
            {/* PROFILE TAB */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-black font-display text-slate-950 dark:text-white">
                    Profile Information
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Manage your public name and view account identifiers.
                  </p>
                </div>

                {profileSuccess && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>{profileSuccess}</span>
                  </div>
                )}

                {profileError && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs font-bold text-red-800 dark:text-red-300">
                    <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
                    <span>{profileError}</span>
                  </div>
                )}

                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your full name"
                      className="w-full rounded-xl border border-slate-250 dark:border-slate-700 bg-white dark:bg-slate-950 py-2.5 px-3.5 text-xs font-semibold text-slate-900 dark:text-white focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 transition-all placeholder:text-slate-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Email Address
                    </label>
                    <div className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 px-3.5 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                      <span>{user?.email}</span>
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200/50 dark:border-emerald-800/50">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                        Verified
                      </span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isUpdatingProfile}
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-60"
                    >
                      {isUpdatingProfile ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <span>Save Changes</span>
                      )}
                    </button>
                  </div>
                </form>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
                  <span>Sign-in Provider:</span>
                  <span className="capitalize font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                    {provider}
                  </span>
                </div>
              </div>
            )}

            {/* APPEARANCE TAB */}
            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-black font-display text-slate-950 dark:text-white">
                    Theme &amp; Appearance
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Customize your visual experience or sync with your device settings.
                  </p>
                </div>

                <div className="space-y-4">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Interface Theme
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setTheme('light')}
                      className={`flex flex-col items-center gap-3 p-4 rounded-2xl border text-center transition-all cursor-pointer ${
                        theme === 'light'
                          ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-600/20'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
                        <Sun className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-xs font-black">Light</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Crisp &amp; clean</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTheme('dark')}
                      className={`flex flex-col items-center gap-3 p-4 rounded-2xl border text-center transition-all cursor-pointer ${
                        theme === 'dark'
                          ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-600/20'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                        <Moon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-xs font-black">Dark</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Gentle on eyes</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTheme('system')}
                      className={`flex flex-col items-center gap-3 p-4 rounded-2xl border text-center transition-all cursor-pointer ${
                        theme === 'system'
                          ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-600/20'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300">
                        <Laptop className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-xs font-black">System</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Device match ({resolvedTheme})
                        </div>
                      </div>
                    </button>
                  </div>

                  <div className="mt-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      💡 <strong>System mode</strong> dynamically tracks your operating system or phone setting. If your device toggles between Light and Dark schedules, Qonace adapts automatically.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* SECURITY TAB */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-black font-display text-slate-950 dark:text-white">
                    Security &amp; Password
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Update your account password or review login credentials.
                  </p>
                </div>

                {passwordSuccess && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>{passwordSuccess}</span>
                  </div>
                )}

                {passwordError && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs font-bold text-red-800 dark:text-red-300">
                    <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
                    <span>{passwordError}</span>
                  </div>
                )}

                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-slate-250 dark:border-slate-700 bg-white dark:bg-slate-950 py-2.5 px-3.5 text-xs font-semibold text-slate-900 dark:text-white focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 transition-all placeholder:text-slate-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-slate-250 dark:border-slate-700 bg-white dark:bg-slate-950 py-2.5 px-3.5 text-xs font-semibold text-slate-900 dark:text-white focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 transition-all placeholder:text-slate-400"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isUpdatingPassword}
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-60"
                    >
                      {isUpdatingPassword ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <span>Update Password</span>
                      )}
                    </button>
                  </div>
                </form>

                <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl">
                  <div className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300 font-medium">
                    <Shield className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                    <span>
                      If you signed in with Google or GitHub, your account is protected by your provider's Multi-Factor Authentication.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* BILLING TAB */}
            {activeTab === 'billing' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-black font-display text-slate-950 dark:text-white">
                    Plan &amp; Subscription
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Review your active tier, workflow limits, and billing status.
                  </p>
                </div>

                <div className="p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-gradient-to-br from-slate-50 dark:from-slate-950/70 to-indigo-50/30 dark:to-indigo-950/20 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        Current Status
                      </span>
                      <h4 className="text-lg font-black font-display text-slate-900 dark:text-white">
                        {hasActiveSubscription ? (subscription?.plan?.name ?? 'Pro Plan') : 'No Active Plan'}
                      </h4>
                    </div>

                    <span className={`px-3 py-1 text-xs font-bold rounded-full border ${
                      hasActiveSubscription
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                        : 'bg-yellow-50 dark:bg-yellow-950/50 text-yellow-800 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800'
                    }`}>
                      {hasActiveSubscription ? 'Active Subscription' : 'No Active Plan'}
                    </span>
                  </div>

                  <div className="border-t border-slate-200/60 dark:border-slate-800/80 pt-3 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 font-medium">
                    <span>AI Workflow Generation:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {hasActiveSubscription ? 'Unlimited' : 'View / Sandbox Only'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 font-medium">
                    <span>Direct n8n Export:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {hasActiveSubscription ? 'Enabled' : 'Template Preview Only'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={() => {
                      onClose();
                      navigate('/billing');
                    }}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-yellow-300" />
                    <span>{hasActiveSubscription ? 'Manage Subscription' : 'Get Starter ($1) or Pro'}</span>
                    <ExternalLink className="h-3.5 w-3.5 ml-1" />
                  </button>

                  {hasActiveSubscription && (
                    <button
                      onClick={() => {
                        onClose();
                        navigate('/billing');
                      }}
                      className="text-xs font-bold text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                    >
                      Cancel Plan Anytime
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

