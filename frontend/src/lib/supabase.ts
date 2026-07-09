import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? 'http://localhost:54321';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

export const supabase: SupabaseClient = supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storageKey: 'qona-auth-token',
      },
    })
  : (new Proxy({} as any, {
      get(target, prop) {
        if (prop === 'auth') {
          return new Proxy({} as any, {
            get(authTarget, authProp) {
              if (authProp === 'getSession') {
                return async () => ({ data: { session: null }, error: null });
              }
              if (authProp === 'onAuthStateChange') {
                return () => ({ data: { subscription: { unsubscribe: () => {} } } });
              }
              return () => {
                throw new Error('Supabase is not configured');
              };
            }
          });
        }
        return () => {
          throw new Error('Supabase is not configured');
        };
      }
    }) as unknown as SupabaseClient);
