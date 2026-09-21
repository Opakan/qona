import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import apiClient from '../api/client';

interface AuthState {
  user: User | null;
  dbUser: any | null;
  subscription: any | null;
  hasActiveSubscription: boolean;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithGitHub: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<{ data: any; error: any }>;
  signUpWithEmail: (email: string, password: string, fullName?: string) => Promise<{ data: any; error: any }>;
  resetPassword: (email: string) => Promise<{ data: any; error: any }>;
  signInAsGuest: () => Promise<void>;
  signOut: () => Promise<void>;
  toggleDeveloperRole: () => void;
  refreshSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [dbUser, setDbUser] = useState<any | null>(null);
  const [subscription, setSubscription] = useState<any | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDbUser = useCallback(async (cancelled = false) => {
    try {
      const response = await apiClient.get('/auth/me');
      if (!cancelled && response.data) {
        if (response.data.user) setDbUser(response.data.user);
        if (response.data.subscription) setSubscription(response.data.subscription);
      }
    } catch (err) {
      console.warn('[AuthContext] Failed to fetch database profile:', err);
    }
  }, []);

  const refreshSubscription = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/payments/subscription');
      setSubscription(data?.subscription ?? null);
    } catch {
      // ignore
    }
  }, []);

  const toggleDeveloperRole = useCallback(() => {
    setDbUser((prev: any) => {
      const currentRole = prev?.role ?? 'USER';
      const newRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN';
      console.log(`[AuthContext] Developer role toggled to: ${newRole}`);
      try {
        localStorage.setItem('qonace-developer-role', newRole);
      } catch { /* ignore */ }
      if (!prev) {
        return {
          id: 'mock-user-12345',
          authId: user?.id ?? 'mock-user-12345',
          email: user?.email ?? 'tester@qonace.com',
          name: user?.user_metadata?.full_name ?? 'Guest User',
          role: newRole,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
      return { ...prev, role: newRole };
    });
  }, [user]);

  useEffect(() => {
    let cancelled = false;

    // Failsafe timeout so loading state never hangs
    const failsafe = setTimeout(() => {
      if (!cancelled) setIsLoading(false);
    }, 1500);

    const cleanHash = () => {
      if (window.location.hash) {
        try {
          const cleanUrl = window.location.pathname + window.location.search;
          window.history.replaceState(null, '', cleanUrl);
        } catch { /* ignore */ }
      }
    };

    supabase.auth
      .getSession()
      .then(({ data: { session: initialSession } }) => {
        if (cancelled) return;
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        if (initialSession?.user) {
          fetchDbUser(cancelled);
          cleanHash();
        } else {
          setDbUser(null);
        }
        setIsLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setIsLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (cancelled) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        fetchDbUser(cancelled);
        cleanHash();
      } else {
        setDbUser(null);
      }
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
      clearTimeout(failsafe);
      subscription.unsubscribe();
    };
  }, [fetchDbUser]);

  const signInWithGoogle = useCallback(async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
  }, []);

  const signInWithGitHub = useCallback(async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string, fullName?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName || undefined,
        },
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });
    return { data, error };
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { data, error };
  }, []);

  const signInAsGuest = useCallback(async () => {
    const header = { alg: 'HS256', typ: 'JWT' };
    const payload = {
      sub: 'mock-user-12345',
      email: 'tester@qonace.com',
      email_verified: true,
      user_metadata: {
        full_name: 'Guest User',
      },
      role: 'USER',
      aud: 'authenticated',
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365,
    };

    const base64UrlEncode = (obj: any) => {
      const str = JSON.stringify(obj);
      return btoa(str)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    };

    const token = `${base64UrlEncode(header)}.${base64UrlEncode(payload)}.mocksignature`;

    const mockUser: any = {
      id: 'mock-user-12345',
      aud: 'authenticated',
      role: 'authenticated',
      email: 'tester@qonace.com',
      email_confirmed_at: new Date().toISOString(),
      last_sign_in_at: new Date().toISOString(),
      user_metadata: {
        full_name: 'Guest User',
      },
      app_metadata: {
        provider: 'google',
        providers: ['google'],
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const mockSession: any = {
      access_token: token,
      refresh_token: 'mock-refresh-token',
      expires_in: 3600 * 24 * 365,
      token_type: 'bearer',
      user: mockUser,
    };

    try {
      localStorage.setItem('qonace-auth-token', JSON.stringify(mockSession));
      localStorage.setItem('qonace-guest-token', token);
      localStorage.removeItem('qonace-developer-role');
    } catch (e) {
      console.warn('Failed to set session in localStorage:', e);
    }

    try {
      await supabase.auth.setSession({
        access_token: token,
        refresh_token: 'mock-refresh-token',
      });
    } catch (e) {
      console.warn('Failed to set session on Supabase client:', e);
    }

    setSession(mockSession);
    setUser(mockUser);
    setDbUser({
      id: 'mock-user-12345',
      authId: 'mock-user-12345',
      email: 'tester@qonace.com',
      name: 'Guest User',
      role: 'USER',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }, []);

  const signOut = useCallback(async () => {
    try {
      localStorage.removeItem('qonace-guest-token');
      localStorage.removeItem('qonace-auth-token');
      localStorage.removeItem('qonace-developer-role');
    } catch { /* ignore */ }
    await supabase.auth.signOut();
  }, []);

  const hasActiveSubscription =
    (user?.email && ['opadgiant@gmail.com', 'opadboss@gmail.com'].includes(user.email.toLowerCase())) ||
    dbUser?.role === 'ADMIN' ||
    Boolean(subscription && subscription.status === 'ACTIVE');

  return (
    <AuthContext.Provider
      value={{
        user,
        dbUser,
        subscription,
        hasActiveSubscription,
        session,
        isLoading,
        isAuthenticated: !!user,
        signInWithGoogle,
        signInWithGitHub,
        signInWithEmail,
        signUpWithEmail,
        resetPassword,
        signInAsGuest,
        signOut,
        toggleDeveloperRole,
        refreshSubscription,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
