/**
 * Dynamic JSON payload from an external webhook/provider (SMS, WhatsApp,
 * email, communications provider). These shapes vary per provider and are
 * accessed defensively (optional chaining / `??`); centralizing the type
 * here — instead of `any` scattered across each function — keeps the
 * escape hatch in one documented, reviewed spot.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WebhookPayload = any;

export function constantTimeEqual(a: string | null, b: string | null): boolean {
  if (a === null || b === null) return false;
  const aa = new TextEncoder().encode(a);
  const bb = new TextEncoder().encode(b);
  if (aa.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < aa.length; i++) diff |= aa[i] ^ bb[i];
  return diff === 0;
}

export async function hmacSha256Hex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function headerOrQuery(req: Request, header: string, query: string): string | null {
  return req.headers.get(header) ?? new URL(req.url).searchParams.get(query);
}
