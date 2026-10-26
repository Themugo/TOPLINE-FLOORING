// The auth redirect (verification, password recovery, expired link) arrives as URL parameters that supabase-js reads and
// then removes. This module is imported by the Supabase client before the client is created, so the value below is
// captured while the parameters are still in the address bar and pages loaded later can still explain what happened.
export const INITIAL_AUTH_URL_HASH: string = typeof window !== 'undefined' ? window.location.hash : '';
