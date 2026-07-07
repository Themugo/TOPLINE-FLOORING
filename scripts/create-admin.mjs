// One-time script to create the real admin login for this site.
//
// This uses the Supabase *service role* key, which must NEVER be put in
// .env, committed to git, or shipped in the frontend bundle. Only run
// this from your own machine, then throw the key away from your shell
// history / never store it anywhere else.
//
// Usage:
//   SUPABASE_URL=https://xxxx.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
//   ADMIN_EMAIL=you@example.com \
//   ADMIN_PASSWORD="a-strong-password" \
//   node scripts/create-admin.mjs
//
// Where to find the service role key: Supabase Dashboard -> Project
// Settings -> API -> "service_role" secret (NOT the "anon" key).

import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;

if (!url || !serviceRoleKey || !email || !password) {
  console.error(
    'Missing required env vars. Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL, ADMIN_PASSWORD.'
  );
  process.exit(1);
}

if (password.length < 8) {
  console.error('ADMIN_PASSWORD should be at least 8 characters.');
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true, // skip email verification, this is an internal admin account
});

if (error) {
  console.error('Failed to create admin user:', error.message);
  process.exit(1);
}

console.log(`Admin user created: ${data.user.email} (id: ${data.user.id})`);
console.log('You can now log in at /admin/login with this email and password.');
