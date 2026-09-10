import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const TOPLINE_SUPABASE_URL = 'https://jypkhvknfgoqrhwzbdwi.supabase.co';
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || TOPLINE_SUPABASE_URL)?.trim();
const supabasePublishableKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY
)?.trim();

/**
 * Supabase is the persistence/auth boundary for the single Topline business.
 *
 * The application may be built without a database during UI/infrastructure
 * work. In that state we expose a client whose transport fails locally with a
 * clear configuration error instead of sending requests to a fake project.
 * Production deployments must provide both public Supabase values.
 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

const CONFIGURATION_ERROR =
  'Supabase is not configured. Set VITE_SUPABASE_PUBLISHABLE_KEY before using database-backed features. The project URL is pinned to the dedicated Topline Supabase project.';

const noOpFetch: typeof fetch = async () => {
  throw new Error(CONFIGURATION_ERROR);
};

export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://missing-supabase-configuration.invalid',
  supabasePublishableKey || 'missing-supabase-publishable-key',
  {
    global: {
      fetch: isSupabaseConfigured ? fetch : noOpFetch,
    },
  }
);

if (!isSupabaseConfigured && import.meta.env.DEV) {
  console.info(`[Database] ${CONFIGURATION_ERROR}`);
}
