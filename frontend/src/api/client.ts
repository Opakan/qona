import axios from 'axios';
import { supabase } from '../lib/supabase';

const rawApiUrl = (import.meta.env.VITE_API_URL || '').trim();
const baseURL = rawApiUrl
  ? (rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl.replace(/\/+$/, '')}/api`)
  : '/api';

const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30_000,
});

apiClient.interceptors.request.use(async (config) => {
  try {
    const devRole = localStorage.getItem('qonace-developer-role');
    if (devRole) {
      config.headers['x-developer-role'] = devRole;
    }
  } catch { /* ignore */ }

  try {
    const guestToken = localStorage.getItem('qonace-guest-token');
    if (guestToken) {
      config.headers.Authorization = `Bearer ${guestToken}`;
      return config;
    }
  } catch { /* ignore */ }

  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('[Qonace API] Unauthorized response received:', error.config?.url);
    }
    return Promise.reject(error);
  },
);

export default apiClient;
