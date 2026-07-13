import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import apiClient from '../api/client';

interface AuthState {
  user: User | null;
  dbUser: any | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signInWithGoogle: () => Promise<void>;
  signInAsGuest: () => Promise<void>;
  signOut: () => Promise<void>;
  toggleDeveloperRole: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [dbUser, setDbUser] = useState<any | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDbUser = useCallback(async (cancelled = false) => {
    try {
      const response = await apiClient.get('/auth/me');
      if (!cancelled && response.data?.user) {
        setDbUser(response.data.user);
      }
    } catch (err) {
      console.warn('[AuthContext] Failed to fetch database profile:', err);
    }
  }, []);

  const toggleDeveloperRole = useCallback(() => {
    setDbUser((prev: any) => {
      if (!prev) return prev;
      const newRole = prev.role === 'ADMIN' ? 'USER' : 'ADMIN';
      console.log(`[AuthContext] Developer role toggled to: ${newRole}`);
      return { ...prev, role: newRole };
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    supabase.auth
      .getSession()
      .then(({ data: { session: initialSession } }) => {
        if (cancelled) return;
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        if (initialSession?.user) {
          fetchDbUser(cancelled);
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
      } else {
        setDbUser(null);
      }
      if (newSession) setIsLoading(false);
    });

    return () => {
      cancelled = true;
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
    } catch { /* ignore */ }
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        dbUser,
        session,
        isLoading,
        isAuthenticated: !!user,
        signInWithGoogle,
        signInAsGuest,
        signOut,
        toggleDeveloperRole,
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
