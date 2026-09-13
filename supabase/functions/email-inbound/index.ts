import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { constantTimeEqual, type WebhookPayload } from "../_shared/security.ts";
const url=Deno.env.get("SUPABASE_URL"); const key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"); const secret=Deno.env.get("EMAIL_INBOUND_SECRET");
if(!url||!key||!secret) throw new Error("Email inbound is not configured");
const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
Deno.serve(async(req)=>{
 if(req.method!=="POST") return new Response("Method Not Allowed",{status:405});
 if(!constantTimeEqual(req.headers.get("x-topline-webhook-secret"),secret)) return new Response("Unauthorized",{status:401});
 const body=await req.json().catch(()=>null) as WebhookPayload; const item=body?.items?.[0]||body;
 const sender=String(item?.From?.Email||item?.from?.email||item?.From||""); const message=String(item?.TextBody||item?.textBody||item?.RawTextBody||item?.message||"");
 if(!sender||!message) return Response.json({error:"Missing sender/message"},{status:400});
 const {error}=await admin.rpc("record_inbound_communication_worker",{p_provider:"brevo_inbound",p_channel:"email",p_sender:sender,p_recipient:item?.To?.[0]?.Email||null,p_subject:item?.Subject||null,p_message:message,p_provider_message_id:item?.MessageId||item?.messageId||null,p_payload:item});
 if(error) return Response.json({error:error.message},{status:500}); return Response.json({ok:true});
});
