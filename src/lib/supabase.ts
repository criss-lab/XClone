import { createClient } from '@supabase/supabase-js';
import fetchRetry from 'fetch-retry';   // ← Only this new import

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Retry wrapper for low/slow network resilience (applies to storage uploads too)
const fetchWithRetry = fetchRetry(fetch, {
  retries: 3,                          // Try up to 3 extra times
  retryDelay: (attempt: number) => Math.pow(2, attempt) * 1000, // 1s → 2s → 4s backoff
  retryOn: (attempt: number, error: any, response?: Response) => {
    // Retry on network failures, timeouts, or server errors
    return !response || response.status >= 500 || error !== null;
  },
});

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {                    // ← Only this section is added
    fetch: fetchWithRetry,
  },
});
