import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const brevoApiKey = Deno.env.get("BREVO_API_KEY");
const senderEmail = Deno.env.get("BREVO_SENDER_EMAIL") ?? "no-reply@toplineflooringandwaterproofing.co.ke";
const senderName = Deno.env.get("BREVO_SENDER_NAME") ?? "Topline Flooring & Waterproofing";
const replyTo = Deno.env.get("BREVO_REPLY_TO_EMAIL") ?? "support@toplineflooringandwaterproofing.co.ke";

if (!supabaseUrl || !serviceRoleKey) throw new Error("Missing Supabase service configuration");
const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

function validEmail(value: unknown): value is string {
  return typeof value === "string" && value.trim().length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function htmlEscape(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  if (!brevoApiKey) return Response.json({ ok: false, error: "Brevo provider secret is not configured" }, { status: 503 });

  const authorization = req.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return new Response("Unauthorized", { status: 401 });
  const token = authorization.slice("Bearer ".length).trim();
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) return new Response("Unauthorized", { status: 401 });

  const { data: staff, error: staffError } = await admin
    .from("staff_profiles")
    .select("user_id,is_active")
    .eq("user_id", authData.user.id)
    .maybeSingle();
  if (staffError || !staff?.is_active) return new Response("Forbidden", { status: 403 });

  const { data: permissions, error: permissionError } = await admin
    .from("staff_role_assignments")
    .select("role_id,staff_role_permissions!inner(permission_id,staff_permissions!inner(resource,action))")
    .eq("user_id", authData.user.id);
  if (permissionError) return Response.json({ ok: false, error: "Unable to verify staff permission" }, { status: 500 });
  const allowed = (permissions ?? []).some((row: any) =>
    Array.isArray(row.staff_role_permissions) && row.staff_role_permissions.some((rp: any) =>
      Array.isArray(rp.staff_permissions) && rp.staff_permissions.some((p: any) => p.resource === "settings" && ["update", "insert"].includes(p.action))
    )
  );
  if (!allowed) return new Response("Forbidden", { status: 403 });

  const body = await req.json().catch(() => ({}));
  const recipient = body?.recipient;
  if (!validEmail(recipient)) return Response.json({ ok: false, error: "A valid test recipient email is required" }, { status: 400 });

  const subject = "Topline Flooring & Waterproofing — Brevo test";
  const textContent = "This is a provider connectivity test from the Topline Flooring & Waterproofing control plane. No customer notification was generated.";
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { accept: "application/json", "api-key": brevoApiKey, "content-type": "application/json" },
    body: JSON.stringify({
      sender: { email: senderEmail, name: senderName },
      to: [{ email: recipient.trim().toLowerCase() }],
      replyTo: { email: replyTo },
      subject,
      textContent,
      htmlContent: `<div style="font-family:Arial,sans-serif;line-height:1.6"><p>${htmlEscape(textContent)}</p></div>`,
    }),
  });
  const raw = await response.text();
  if (!response.ok) return Response.json({ ok: false, provider_status: response.status, error: raw.slice(0, 500) }, { status: 502 });
  let parsed: Record<string, unknown> = {};
  try { parsed = JSON.parse(raw); } catch { /* provider may return empty body */ }
  return Response.json({ ok: true, provider: "brevo", message_id: parsed.messageId ?? null });
});
