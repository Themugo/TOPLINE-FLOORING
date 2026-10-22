// Generic harness: run a real Edge Function against PostgREST. Usage: deno run -A wrapper_fn.ts <function> [ENV=VAL ...]
const name = Deno.args[0];
for (const kv of Deno.args.slice(1)) { const i = kv.indexOf("="); Deno.env.set(kv.slice(0, i), kv.slice(i + 1)); }
const SUPA = "http://supabase.local", PGRST = "http://127.0.0.1:3000";
const realFetch = globalThis.fetch.bind(globalThis);
globalThis.fetch = ((input: string | URL | Request, init: RequestInit = {}) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (url.startsWith(`${SUPA}/rest/v1/`)) return realFetch(PGRST + url.slice(`${SUPA}/rest/v1`.length), init);
  if (url.startsWith(`${SUPA}/functions/v1/deliver-communications`)) return realFetch("http://127.0.0.1:8000/", init);
  throw new Error(`Unmocked external fetch in e2e harness: ${url}`);
}) as typeof fetch;
Deno.env.set("SUPABASE_URL", SUPA);
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", Deno.readTextFileSync(`${Deno.env.get("E2E_WORK") ?? "/tmp/topline-e2e"}/service.jwt`).trim());
await import(`file://${Deno.env.get("E2E_REPO")}/supabase/functions/${name}/index.ts`);
