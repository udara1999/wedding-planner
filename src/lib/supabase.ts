import { createClient } from '@supabase/supabase-js';
import { env } from './env';
import type { Database } from '../types/db';

export const supabase = createClient<Database>(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/**
 * PostgREST returns `{ data, error }`. Swallowing the error is how RLS bugs
 * become invisible, so every call goes through this.
 */
export function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  if (result.data === null) throw new Error('Query returned no data');
  return result.data;
}
