// Runs the REAL edge function source files locally. Only three things differ from production:
//  1. supabase-js is resolved from the npm registry instead of esm.sh (import map),
//  2. outbound calls to Safaricom, Brevo, Africa's Talking and WhatsApp are answered by in-process stand-ins that record the request,
//  3. SUPABASE_URL points at PostgREST on a local Postgres that has all migrations applied.
const FN_DIR = (Deno.env.get('REPO') ?? Deno.cwd()) + '/supabase/functions';
const PGRST = 'http://127.0.0.1:3001';
const handlers: Record<string, (req: Request) => Response | Promise<Response>> = {};
let current = '';
const realServe = Deno.serve.bind(Deno);
// deno-lint-ignore no-explicit-any
(Deno as any).serve = (a: any, b?: any) => { handlers[current] = typeof a === 'function' ? a : (b ?? a.handler); return { finished: Promise.resolve(), shutdown() {} }; };

type Call = { service: string; method: string; path: string; body: unknown; headers: Record<string, string> };
let calls: Call[] = [];
const config: Record<string, string> = { mpesaStk: 'ok', brevo: 'ok' };
let n = 0;
const realFetch = globalThis.fetch.bind(globalThis);
const jr = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } });
globalThis.fetch = async (input: string | URL | Request, init?: RequestInit) => {
  const req = new Request(input as Request | string, init);
  const url = new URL(req.url);
  const text = req.method === 'GET' ? '' : await req.clone().text();
  let body: unknown = text; try { body = JSON.parse(text); } catch { /* keep text */ }
  const rec = (service: string) => calls.push({ service, method: req.method, path: url.pathname + url.search, body, headers: Object.fromEntries(req.headers) });
  if (url.host === 'mock.safaricom') {
    rec('mpesa');
    if (url.pathname === '/oauth/v1/generate') return jr({ access_token: 'MOCK-TOKEN', expires_in: '3599' });
    if (url.pathname === '/mpesa/stkpush/v1/processrequest') {
      if (config.mpesaStk === 'reject') return jr({ requestId: 'r-1', errorCode: '400.002.02', errorMessage: 'Bad Request - Invalid PhoneNumber' }, 400);
      if (config.mpesaStk === 'error') return jr({ requestId: 'x', errorCode: '500.001.1001', errorMessage: 'Merchant does not exist' }, 500);
      n++; const uid = `${Date.now()}${n}`; return jr({ MerchantRequestID: `MR-${uid}`, CheckoutRequestID: `ws_CO_MOCK_${uid}`, ResponseCode: '0', ResponseDescription: 'Success. Request accepted for processing', CustomerMessage: 'Success. Request accepted for processing' });
    }
    return jr({ error: 'unknown mock route' }, 404);
  }
  if (url.host === 'api.brevo.com') { rec('brevo'); if (config.brevo === 'error') return jr({ code: 'unauthorized', message: 'Key not found' }, 401); n++; return jr({ messageId: `<mock-${n}@brevo.test>` }, 201); }
  if (url.host === 'api.africastalking.com') { rec('sms'); n++; return jr({ SMSMessageData: { Message: 'Sent to 1/1', Recipients: [{ statusCode: 101, status: 'Success', messageId: `ATXid_${n}`, number: '+254712345678', cost: 'KES 0.8' }] } }); }
  if (url.host === 'graph.facebook.com') { rec('whatsapp'); n++; return jr({ messages: [{ id: `wamid.MOCK${n}` }] }); }
  return realFetch(req);
};

const env: Record<string, string> = {
  SUPABASE_URL: 'http://127.0.0.1:54321', SUPABASE_SERVICE_ROLE_KEY: Deno.env.get('SR_JWT')!, SUPABASE_ANON_KEY: Deno.env.get('ANON_JWT')!,
  MPESA_BASE_URL: 'https://mock.safaricom', MPESA_CONSUMER_KEY: 'ck', MPESA_CONSUMER_SECRET: 'cs', MPESA_SHORTCODE: '174379', MPESA_PASSKEY: 'pk',
  MPESA_CALLBACK_SECRET: 'cb-secret-123', MPESA_CALLBACK_URL: 'https://api.test/fn/payment-callback?secret=cb-secret-123',
  TOPLINE_SITE_URL: 'https://toplinefloorandwaterproofing.co.ke', TOPLINE_WEB_ORIGIN: 'https://toplinefloorandwaterproofing.co.ke',
  TOPLINE_WORKER_SECRET: 'worker-secret-123', BREVO_API_KEY: 'brevo-key', BREVO_SENDER_EMAIL: 'info@toplinefloorandwaterproofing.co.ke', BREVO_SENDER_NAME: 'Topline', BREVO_REPLY_TO_EMAIL: 'support@toplinefloorandwaterproofing.co.ke',
  AT_API_KEY: 'at', AT_USERNAME: 'sandbox', AT_SENDER_ID: 'TOPLINE',
};
for (const [k, v] of Object.entries(env)) Deno.env.set(k, v);
for (const name of ['payment-initiate', 'payment-callback', 'payment-status', 'deliver-communications', 'operations-scheduler']) {
  current = name;
  try { await import(`${FN_DIR}/${name}/index.ts`); } catch (e) { console.error('LOAD FAIL', name, String(e).slice(0, 300)); }
}
console.log('loaded:', Object.keys(handlers).join(', '));
realServe({ port: 54321, hostname: '127.0.0.1', onListen: () => console.log('READY') }, async (req) => {
  const u = new URL(req.url);
  if (u.pathname === '/__mock/calls') return jr(calls);
  if (u.pathname === '/__mock/reset') { calls = []; return jr({ ok: true }); }
  if (u.pathname === '/__mock/config') { Object.assign(config, await req.json()); return jr(config); }
  if (u.pathname.startsWith('/rest/v1/')) {
    const target = PGRST + u.pathname.replace('/rest/v1', '') + u.search;
    const h = new Headers(req.headers); h.delete('host');
    return await realFetch(target, { method: req.method, headers: h, body: ['GET', 'HEAD'].includes(req.method) ? undefined : await req.arrayBuffer() });
  }
  const m = u.pathname.match(/^\/(?:fn|functions\/v1)\/([a-z-]+)/);
  if (m && handlers[m[1]]) return await handlers[m[1]](req);
  return jr({ error: 'no route' }, 404);
});
