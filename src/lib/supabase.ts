import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

/**
 * Supabase is the persistence/auth boundary for the single Topline business.
 *
 * The application may be built without a database during UI/infrastructure
 * work. In that state we expose a client whose transport fails locally with a
 * clear configuration error instead of sending requests to a fake project.
 * Production deployments must provide both public Supabase values.
 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

const CONFIGURATION_ERROR =
  'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY before using database-backed features.';

const noOpFetch: typeof fetch = async () => {
  throw new Error(CONFIGURATION_ERROR);
};

export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://missing-supabase-configuration.invalid',
  supabaseAnonKey || 'missing-supabase-anon-key',
  {
    global: {
      fetch: isSupabaseConfigured ? fetch : noOpFetch,
    },
  }
);

if (!isSupabaseConfigured && import.meta.env.DEV) {
  console.info(`[Database] ${CONFIGURATION_ERROR}`);
}
