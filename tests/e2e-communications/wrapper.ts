// E2E harness: runs the REAL deliver-communications function. Only external provider hosts are mocked.
const SUPA = "http://supabase.local";
const PGRST = "http://127.0.0.1:3000";
const state: Record<string, string | number> = { email: "ok", contacts: "ok", sms: "ok", wa: "ok", seq: 0 };
const calls: Array<Record<string, unknown>> = [];
const realFetch = globalThis.fetch.bind(globalThis);
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const hang = (signal?: AbortSignal | null) => new Promise<Response>((_, reject) => {
  const fail = () => reject(signal?.reason ?? new DOMException("The signal has been aborted", "AbortError"));
  if (!signal) return; if (signal.aborted) fail(); else signal.addEventListener("abort", fail);
});
const hdr = (init: RequestInit | undefined, k: string): string | null => {
  const h = init?.headers;
  if (!h) return null;
  if (h instanceof Headers) return h.get(k);
  if (Array.isArray(h)) return h.find(([name]) => name.toLowerCase() === k.toLowerCase())?.[1] ?? null;
  const record = h as Record<string, string>;
  return record[k] ?? record[k.toLowerCase()] ?? null;
};

globalThis.fetch = (async (input: string | URL | Request, init: RequestInit = {}) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (url.startsWith(`${SUPA}/rest/v1/`)) return realFetch(PGRST + url.slice(`${SUPA}/rest/v1`.length), init);
  const seq = () => Number(state.seq = Number(state.seq) + 1);
  if (url === "https://api.brevo.com/v3/smtp/email") {
    const b = JSON.parse(String(init.body));
    const rec = { provider: "brevo", kind: "email", to: b.to?.[0]?.email, subject: b.subject, text: b.textContent, html: b.htmlContent, emailHeaders: b.headers, sender: b.sender, replyTo: b.replyTo, apiKeyPresent: !!hdr(init, "api-key"), httpIdempotencyKey: hdr(init, "Idempotency-Key") };
    switch (state.email) {
      case "ok": calls.push({ ...rec, outcome: "accepted" }); return json(201, { messageId: `<mock-${seq()}@smtp-relay.mailin.fr>` });
      case "reject400": calls.push({ ...rec, outcome: "rejected_400" }); return json(400, { code: "invalid_parameter", message: "Invalid recipient" });
      case "unauthorized401": calls.push({ ...rec, outcome: "rejected_401" }); return json(401, { code: "unauthorized", message: "Key not found" });
      case "rate429": calls.push({ ...rec, outcome: "rejected_429" }); return json(429, { code: "too_many_requests", message: "rate limit" });
      case "unavailable503": calls.push({ ...rec, outcome: "rejected_503" }); return json(503, { message: "unavailable" });
      case "timeout_after_accept": calls.push({ ...rec, outcome: "ACCEPTED_BUT_RESPONSE_LOST" }); return hang(init.signal);
      case "http500_after_accept": calls.push({ ...rec, outcome: "ACCEPTED_BUT_HTTP500" }); return json(500, { message: "internal error after enqueue" });
      case "connect_fail": calls.push({ ...rec, outcome: "NEVER_SENT_connect_failed" }); calls.pop(); throw new TypeError("error sending request for url (https://api.brevo.com/v3/smtp/email): client error (Connect): tcp connect error: Connection refused (os error 111)");
      case "reset_after_accept": calls.push({ ...rec, outcome: "ACCEPTED_BUT_CONNECTION_RESET" }); throw new TypeError("error sending request for url (https://api.brevo.com/v3/smtp/email): client error (SendRequest): connection error: connection reset");
      case "no_message_id": calls.push({ ...rec, outcome: "accepted_no_id" }); return json(201, {});
    }
  }
  if (url.startsWith("https://api.brevo.com/v3/contacts")) {
    calls.push({ provider: "brevo", kind: "contact", method: init.method, url, body: init.body ? JSON.parse(String(init.body)) : null, outcome: String(state.contacts) });
    if (state.contacts === "ok") return json(init.method === "POST" ? 201 : 204, init.method === "POST" ? { id: seq() } : {});
    if (state.contacts === "unavailable503") return json(503, { message: "unavailable" });
    if (state.contacts === "notfound404") return json(404, { message: "Contact does not exist" });
  }
  if (url === "https://api.africastalking.com/version1/messaging") {
    const p = new URLSearchParams(String(init.body));
    const rec = { provider: "africastalking", kind: "sms", to: p.get("to"), text: p.get("message") };
    if (state.sms === "ok") { calls.push({ ...rec, outcome: "accepted" }); return json(201, { SMSMessageData: { Message: "Sent to 1/1", Recipients: [{ statusCode: 101, number: p.get("to"), status: "Success", cost: "KES 0.8000", messageId: `ATXid_mock${seq()}` }] } }); }
    if (state.sms === "timeout_after_accept") { calls.push({ ...rec, outcome: "ACCEPTED_BUT_RESPONSE_LOST" }); return hang(init.signal); }
    if (state.sms === "reject400") { calls.push({ ...rec, outcome: "rejected_400" }); return json(400, { error: "InvalidPhoneNumber" }); }
    if (state.sms === "no_id") { calls.push({ ...rec, outcome: "accepted_no_id" }); return json(201, { SMSMessageData: { Recipients: [{ status: "Success" }] } }); }
  }
  if (url.startsWith("https://graph.facebook.com/")) {
    const b = JSON.parse(String(init.body));
    const rec = { provider: "meta_whatsapp", kind: "whatsapp", to: b.to, text: b.text?.body ?? JSON.stringify(b.template ?? {}) };
    if (state.wa === "ok") { calls.push({ ...rec, outcome: "accepted" }); return json(200, { messages: [{ id: `wamid.mock${seq()}` }] }); }
    if (state.wa === "reject400") { calls.push({ ...rec, outcome: "rejected_400" }); return json(400, { error: { message: "bad recipient" } }); }
  }
  throw new Error(`Unmocked external fetch in e2e harness: ${url}`);
}) as typeof fetch;

const env = Deno.env;
env.set("SUPABASE_URL", SUPA);
env.set("SUPABASE_SERVICE_ROLE_KEY", Deno.readTextFileSync(`${Deno.env.get("E2E_WORK") ?? "/tmp/topline-e2e"}/service.jwt`).trim());
env.set("TOPLINE_WORKER_SECRET", "e2e-worker-secret-value");
env.set("BREVO_API_KEY", "e2e-brevo-key"); env.set("BREVO_SENDER_EMAIL", "no-reply@topline.example");
env.set("BREVO_SENDER_NAME", "Topline Flooring & Waterproofing"); env.set("BREVO_REPLY_TO_EMAIL", "info@topline.example");
env.set("BREVO_MARKETING_LIST_ID", "7");
env.set("AT_USERNAME", "e2e"); env.set("AT_API_KEY", "e2e-at-key"); env.set("AT_SENDER_ID", "TOPLINE");
env.set("WHATSAPP_ACCESS_TOKEN", "e2e-wa-token"); env.set("WHATSAPP_PHONE_NUMBER_ID", "123456");

Deno.serve({ port: 8001, hostname: "127.0.0.1", onListen() {} }, async (req) => {
  const u = new URL(req.url);
  if (u.pathname === "/calls") return json(200, calls);
  if (u.pathname === "/reset") { calls.length = 0; return json(200, { ok: true }); }
  if (u.pathname === "/scenario") { for (const [k, v] of u.searchParams) state[k] = v; return json(200, state); }
  return json(404, {});
});
await import(`file://${Deno.env.get("E2E_REPO")}/supabase/functions/deliver-communications/index.ts`);
