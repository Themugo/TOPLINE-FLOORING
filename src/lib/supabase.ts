import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const TOPLINE_SUPABASE_URL = 'https://zmbsskvnzjdaxuxlauyx.supabase.co';
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || TOPLINE_SUPABASE_URL)?.trim();
const isSupabaseUrlValid = supabaseUrl === TOPLINE_SUPABASE_URL;
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
export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey && isSupabaseUrlValid);

const CONFIGURATION_ERROR = !isSupabaseUrlValid
  ? 'Supabase target mismatch. VITE_SUPABASE_URL must point to the dedicated Topline Supabase project.'
  : 'Supabase is not configured. Set VITE_SUPABASE_PUBLISHABLE_KEY before using database-backed features. The project URL is pinned to the dedicated Topline Supabase project.';

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

/**
 * Public read client for anonymous CMS/site content. It deliberately does not
 * persist or attach a user session, so a stale/expired admin JWT cannot turn
 * an otherwise public read into a 401. Never use this client for mutations or
 * privileged/admin data.
 */
export const publicSupabase: SupabaseClient = createClient(
  supabaseUrl || 'https://missing-supabase-configuration.invalid',
  supabasePublishableKey || 'missing-supabase-publishable-key',
  {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: isSupabaseConfigured ? fetch : noOpFetch,
    },
  }
);

if (!isSupabaseConfigured && import.meta.env.DEV) {
  console.info(`[Database] ${CONFIGURATION_ERROR}`);
}
