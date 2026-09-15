import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const brevoApiKey = Deno.env.get("BREVO_API_KEY");
const senderEmail = Deno.env.get("BREVO_SENDER_EMAIL") ?? "no-reply@toplineflooringandwaterproofing.co.ke";
const senderName = Deno.env.get("BREVO_SENDER_NAME") ?? "Topline Flooring & Waterproofing";
const replyTo = Deno.env.get("BREVO_REPLY_TO_EMAIL") ?? "support@toplineflooringandwaterproofing.co.ke";

const ALLOWED_ORIGINS = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://toplineflooringandwaterproofing.co.ke",
  "https://www.toplineflooringandwaterproofing.co.ke",
]);

const corsHeaders = (req: Request): Record<string, string> => {
  const origin = req.headers.get("origin");
  const allowedOrigin = origin && ALLOWED_ORIGINS.has(origin) ? origin : "";
  return {
    ...(allowedOrigin ? { "Access-Control-Allow-Origin": allowedOrigin } : {}),
    "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Cache-Control": "no-store",
    Vary: "Origin",
  };
};

function response(req: Request, body: BodyInit | null, status: number, contentType = "application/json") {
  return new Response(body, {
    status,
    headers: { "Content-Type": contentType, ...corsHeaders(req) },
  });
}

function json(req: Request, status: number, body: Record<string, unknown>) {
  return response(req, JSON.stringify(body), status);
}

type StaffPermission = { resource: string; action: string };
type StaffRolePermission = { staff_permissions?: StaffPermission[] | null };
type StaffRoleAssignment = { staff_role_permissions?: StaffRolePermission[] | null };

type IntegrationUpdate = {
  status: "not_configured" | "configured" | "testing" | "healthy" | "degraded" | "disabled";
  secret_configured: boolean;
  last_tested_at: string;
  last_test_message: string;
};

if (!supabaseUrl || !serviceRoleKey) throw new Error("Missing Supabase service configuration");
const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

function validEmail(value: unknown): value is string {
  return typeof value === "string" && value.trim().length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function htmlEscape(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

async function recordTest(update: IntegrationUpdate) {
  const { error } = await admin
    .from("site_integration_configs")
    .update(update)
    .eq("integration_key", "communications.email");
  if (error) console.error("Unable to record Brevo test result", { message: error.message });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return response(req, null, 204, "text/plain");
  if (req.method !== "POST") return json(req, 405, { ok: false, error: "Method Not Allowed" });

  if (!brevoApiKey) {
    await recordTest({
      status: "not_configured",
      secret_configured: false,
      last_tested_at: new Date().toISOString(),
      last_test_message: "Brevo provider secret is not configured",
    });
    return json(req, 503, { ok: false, error: "Brevo provider secret is not configured" });
  }

  const authorization = req.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return json(req, 401, { ok: false, error: "Unauthorized" });
  const token = authorization.slice("Bearer ".length).trim();
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) return json(req, 401, { ok: false, error: "Unauthorized" });

  const { data: staff, error: staffError } = await admin
    .from("staff_profiles")
    .select("user_id,is_active")
    .eq("user_id", authData.user.id)
    .maybeSingle();
  if (staffError || !staff?.is_active) return json(req, 403, { ok: false, error: "Forbidden" });

  const { data: permissions, error: permissionError } = await admin
    .from("staff_role_assignments")
    .select("role_id,staff_role_permissions!inner(permission_id,staff_permissions!inner(resource,action))")
    .eq("user_id", authData.user.id);
  if (permissionError) return json(req, 500, { ok: false, error: "Unable to verify staff permission" });

  const allowed = (permissions ?? []).some((row: StaffRoleAssignment) =>
    Array.isArray(row.staff_role_permissions) && row.staff_role_permissions.some((rp: StaffRolePermission) =>
      Array.isArray(rp.staff_permissions) && rp.staff_permissions.some((p: StaffPermission) =>
        p.resource === "settings" && ["update", "insert"].includes(p.action),
      ),
    ),
  );
  if (!allowed) return json(req, 403, { ok: false, error: "Forbidden" });

  let body: Record<string, unknown> = {};
  try {
    const parsed = await req.json();
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) body = parsed as Record<string, unknown>;
  } catch {
    return json(req, 400, { ok: false, error: "Invalid JSON body" });
  }

  const recipient = body.recipient;
  if (!validEmail(recipient)) return json(req, 400, { ok: false, error: "A valid test recipient email is required" });

  const normalizedRecipient = recipient.trim().toLowerCase();
  const testedAt = new Date().toISOString();
  const subject = "Topline Flooring & Waterproofing — Brevo test";
  const textContent = "This is a provider connectivity test from the Topline Flooring & Waterproofing control plane. No customer notification was generated.";

  const providerResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": brevoApiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: { email: senderEmail, name: senderName },
      to: [{ email: normalizedRecipient }],
      replyTo: { email: replyTo },
      subject,
      textContent,
      htmlContent: `<div style="font-family:Arial,sans-serif;line-height:1.6"><p>${htmlEscape(textContent)}</p></div>`,
    }),
  });

  const raw = await providerResponse.text();
  if (!providerResponse.ok) {
    const message = `Brevo API returned HTTP ${providerResponse.status}: ${raw.slice(0, 450)}`;
    await recordTest({
      status: "degraded",
      secret_configured: true,
      last_tested_at: testedAt,
      last_test_message: message,
    });
    return json(req, 502, { ok: false, provider_status: providerResponse.status, error: message });
  }

  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    // Brevo may return an empty/non-JSON success body.
  }

  const messageId = parsed.messageId ?? null;
  await recordTest({
    status: "healthy",
    secret_configured: true,
    last_tested_at: testedAt,
    last_test_message: messageId ? `Test accepted by Brevo for ${normalizedRecipient} (message ${String(messageId)})` : `Test accepted by Brevo for ${normalizedRecipient}`,
  });

  return json(req, 200, { ok: true, provider: "brevo", message_id: messageId });
});
