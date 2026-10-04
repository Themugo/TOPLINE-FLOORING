// CORS for Edge Functions that are called directly from the Topline website in a browser.
//
// A browser sends an OPTIONS preflight before any cross-origin request that carries an
// `authorization`/`apikey` header or a JSON body. A function that does not answer it with the right
// headers makes every call fail in the browser with a CORS error, even though the same request
// works from curl. Only the canonical site origins are allowed by default; add preview or staging
// origins with the TOPLINE_WEB_ORIGIN secret (comma separated).

const DEFAULT_ORIGINS = [
  "https://toplineflooringandwaterproofing.co.ke",
  "https://www.toplineflooringandwaterproofing.co.ke",
];

function allowedOrigins(): Set<string> {
  const extra = (Deno.env.get("TOPLINE_WEB_ORIGIN") ?? "")
    .split(",")
    .map((value) => value.trim().replace(/\/$/, ""))
    .filter(Boolean);
  return new Set([...DEFAULT_ORIGINS, ...extra]);
}

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");
  const allowed = origin && allowedOrigins().has(origin) ? origin : null;
  return {
    ...(allowed ? { "Access-Control-Allow-Origin": allowed } : {}),
    "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

/** Returns the preflight response for OPTIONS requests, otherwise null. */
export function handlePreflight(req: Request): Response | null {
  if (req.method !== "OPTIONS") return null;
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}

export function jsonResponse(req: Request, status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...corsHeaders(req) },
  });
}
