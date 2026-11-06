import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handlePreflight, jsonResponse } from "../_shared/cors.ts";

const maxAgeSeconds = 300;

function safeStoragePath(customerId: string, value: unknown): string | null {
  if (typeof value !== "string") return null;
  const path = value.trim();
  // Legacy customer_documents.file_url values are usable only when they are already
  // an object path in the customer namespace. Never sign arbitrary URLs or paths.
  if (!new RegExp(`^${customerId}/[^/].*$`).test(path)) return null;
  if (path.includes("..") || path.includes("\\") || path.includes("//")) return null;
  return path;
}

Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;
  if (req.method !== "POST") return jsonResponse(req, 405, { error: "POST required" });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return jsonResponse(req, 401, { error: "Unauthorized" });
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceRoleKey) return jsonResponse(req, 503, { error: "Document service is not configured" });

  const authClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: userData, error: userError } = await authClient.auth.getUser();
  if (userError || !userData.user) return jsonResponse(req, 401, { error: "Unauthorized" });

  let body: { document_id?: unknown };
  try { body = await req.json() as { document_id?: unknown }; } catch { return jsonResponse(req, 400, { error: "Invalid JSON" }); }
  const documentId = typeof body.document_id === "string" ? body.document_id.trim() : "";
  if (!/^[0-9a-f-]{36}$/i.test(documentId)) return jsonResponse(req, 400, { error: "Invalid document id" });

  const admin = createClient(url, serviceRoleKey);
  const { data: access, error: accessError } = await admin
    .from("customer_portal_access")
    .select("customer_id")
    .eq("auth_user_id", userData.user.id)
    .eq("is_active", true)
    .maybeSingle();
  if (accessError || !access?.customer_id) return jsonResponse(req, 403, { error: "Customer portal access is not available" });

  const { data: document, error: documentError } = await admin
    .from("customer_documents")
    .select("id, customer_id, document_type, document_name, description, created_at, file_url")
    .eq("id", documentId)
    .eq("customer_id", access.customer_id)
    .maybeSingle();
  if (documentError || !document) return jsonResponse(req, 404, { error: "Document not found" });

  const storagePath = safeStoragePath(access.customer_id, document.file_url);
  if (!storagePath) return jsonResponse(req, 409, { error: "This document needs to be re-linked by the document administrator" });
  const { data: signed, error: signedError } = await admin.storage.from("private-documents").createSignedUrl(storagePath, maxAgeSeconds);
  if (signedError || !signed?.signedUrl) return jsonResponse(req, 503, { error: "Document download is temporarily unavailable" });

  return jsonResponse(req, 200, {
    document: {
      id: document.id,
      document_type: document.document_type,
      document_name: document.document_name,
      description: document.description,
      created_at: document.created_at,
    },
    url: signed.signedUrl,
    expires_in: maxAgeSeconds,
  });
});
