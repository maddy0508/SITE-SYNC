import { createClient } from '@supabase/supabase-js';

/**
 * M1.7 physical QA target only. This is deliberately the isolated test project,
 * never the production SITE-SYNC project. The publishable key is client-safe;
 * no service-role or secret key is embedded here.
 */
export const M17_SUPABASE_URL = 'https://fuaiodkyaqfandbenuol.supabase.co';
const M17_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_o2Plx8R7mc0HJmemEsktYw_EuYevbzG';

export function createM17SupabaseClient() {
  return createClient(M17_SUPABASE_URL, M17_SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
}
