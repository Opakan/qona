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
  KeyRound
} from 'lucide-react';

interface AccountSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AccountSettingsModal: React.FC<AccountSettingsModalProps> = ({ isOpen, onClose }) => {
  const { user, dbUser, subscription, hasActiveSubscription } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'billing'>('profile');
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
      <div className="relative w-full max-w-2xl bg-white border border-slate-200/90 rounded-3xl shadow-2xl shadow-slate-900/30 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-extrabold text-sm">
              {(fullName || user?.email || 'U').charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-sm font-black font-display text-slate-950 tracking-tight">
                Account Settings
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                {user?.email}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Layout with Sidebar Tabs */}
        <div className="flex flex-col sm:flex-row min-h-[380px]">
          {/* Navigation Sidebar */}
          <div className="w-full sm:w-48 bg-slate-50/70 border-b sm:border-b-0 sm:border-r border-slate-200/80 p-3 space-y-1">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex w-full items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === 'profile'
                  ? 'bg-white text-indigo-600 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <User className="h-4 w-4" />
              <span>Profile</span>
            </button>

            <button
              onClick={() => setActiveTab('security')}
              className={`flex w-full items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === 'security'
                  ? 'bg-white text-indigo-600 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Lock className="h-4 w-4" />
              <span>Security</span>
            </button>

            <button
              onClick={() => setActiveTab('billing')}
              className={`flex w-full items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === 'billing'
                  ? 'bg-white text-indigo-600 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
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
                  <h3 className="text-base font-black font-display text-slate-950">
                    Profile Information
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Manage your public name and view account identifiers.
                  </p>
                </div>

                {profileSuccess && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>{profileSuccess}</span>
                  </div>
                )}

                {profileError && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-800">
                    <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                    <span>{profileError}</span>
                  </div>
                )}

                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your full name"
                      className="w-full rounded-xl border border-slate-250 bg-white py-2.5 px-3.5 text-xs font-semibold text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Email Address
                    </label>
                    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-600">
                      <span>{user?.email}</span>
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
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

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                  <span>Sign-in Provider:</span>
                  <span className="capitalize font-bold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                    {provider}
                  </span>
                </div>
              </div>
            )}

            {/* SECURITY TAB */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-black font-display text-slate-950">
                    Security &amp; Password
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Update your account password or review login credentials.
                  </p>
                </div>

                {passwordSuccess && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>{passwordSuccess}</span>
                  </div>
                )}

                {passwordError && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-800">
                    <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                    <span>{passwordError}</span>
                  </div>
                )}

                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-slate-250 bg-white py-2.5 px-3.5 text-xs font-semibold text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-slate-250 bg-white py-2.5 px-3.5 text-xs font-semibold text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 transition-all"
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

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                  <div className="flex items-start gap-2 text-xs text-slate-600 font-medium">
                    <Shield className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
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
                  <h3 className="text-base font-black font-display text-slate-950">
                    Plan &amp; Subscription
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Review your active tier, workflow limits, and billing status.
                  </p>
                </div>

                <div className="p-5 rounded-2xl border border-slate-200/90 bg-gradient-to-br from-slate-50 to-indigo-50/30 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                        Current Status
                      </span>
                      <h4 className="text-lg font-black font-display text-slate-900">
                        {hasActiveSubscription ? (subscription?.plan?.name ?? 'Pro Plan') : 'Free Tier'}
                      </h4>
                    </div>

                    <span className={`px-3 py-1 text-xs font-bold rounded-full border ${
                      hasActiveSubscription
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-yellow-50 text-yellow-800 border-yellow-200'
                    }`}>
                      {hasActiveSubscription ? 'Active Subscription' : 'No Active Plan'}
                    </span>
                  </div>

                  <div className="border-t border-slate-200/60 pt-3 flex items-center justify-between text-xs text-slate-600 font-medium">
                    <span>AI Workflow Generation:</span>
                    <span className="font-bold text-slate-900">
                      {hasActiveSubscription ? 'Unlimited' : 'View / Sandbox Only'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
                    <span>Direct n8n Export:</span>
                    <span className="font-bold text-slate-900">
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
                    <span>{hasActiveSubscription ? 'Manage Subscription' : 'Upgrade to Starter or Pro'}</span>
                    <ExternalLink className="h-3.5 w-3.5 ml-1" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
