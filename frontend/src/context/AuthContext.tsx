import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signInWithGoogle: () => Promise<void>;
  signInAsGuest: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    supabase.auth
      .getSession()
      .then(({ data: { session: initialSession } }) => {
        if (cancelled) return;
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
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
      if (newSession) setIsLoading(false);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

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
      email: 'tester@qona.ai',
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
      email: 'tester@qona.ai',
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
      localStorage.setItem('qona-auth-token', JSON.stringify(mockSession));
      localStorage.setItem('qona-guest-token', token);
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
  }, []);

  const signOut = useCallback(async () => {
    try {
      localStorage.removeItem('qona-guest-token');
      localStorage.removeItem('qona-auth-token');
    } catch { /* ignore */ }
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, session, isLoading, isAuthenticated: !!user, signInWithGoogle, signInAsGuest, signOut }}
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
