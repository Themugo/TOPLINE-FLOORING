import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { constantTimeEqual, readBoundedBody } from "../_shared/security.ts";
type JsonValue = null | boolean | number | string | JsonValue[] | { [key:string]: JsonValue };
type JsonRecord = { [key:string]: JsonValue };
const url=Deno.env.get("SUPABASE_URL"); const key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"); const secret=Deno.env.get("EMAIL_INBOUND_SECRET");
if(!url||!key||!secret) throw new Error("Email inbound is not configured");
const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
Deno.serve(async(req)=>{
 if(req.method!=="POST") return new Response("Method Not Allowed",{status:405});
 if(!constantTimeEqual(req.headers.get("x-topline-webhook-secret"),secret)) return new Response("Unauthorized",{status:401});
 const {body:raw,tooLarge}=await readBoundedBody(req,262_144); if(tooLarge) return new Response("Payload Too Large",{status:413});
 let body:JsonValue; try { body=JSON.parse(raw) as JsonValue; } catch { return Response.json({error:"Invalid JSON payload"},{status:400}); } const root=typeof body==='object'&&body!==null&&!Array.isArray(body)?body as JsonRecord:null; const items=root?.items; const list:JsonRecord[]=Array.isArray(items)?items.filter((x):x is JsonRecord=>typeof x==='object'&&x!==null&&!Array.isArray(x)):root?[root]:[];
 // Brevo may batch several inbound messages in one request: record every one, not just the first.
 let recorded=0; const failures:string[]=[];
 for(const item of list){
  const sender=String(item?.From?.Email||item?.from?.email||item?.From||""); const message=String(item?.TextBody||item?.textBody||item?.RawTextBody||item?.message||"");
  const providerMessageId=String(item?.MessageId||item?.messageId||"");
  if(!sender||!message||!providerMessageId){ failures.push("Missing sender/message/provider message ID"); continue; }
  const {error}=await admin.rpc("record_inbound_communication_worker",{p_provider:"brevo_inbound",p_channel:"email",p_sender:sender,p_recipient:item?.To?.[0]?.Email||null,p_subject:item?.Subject||null,p_message:message,p_provider_message_id:providerMessageId,p_payload:item});
  if(error) return Response.json({error:error.message,recorded},{status:500}); // provider retries; the RPC is idempotent on provider_message_id
  recorded++;
 }
 if(!recorded&&failures.length) return Response.json({error:failures[0]},{status:400});
 return Response.json({ok:true,recorded,skipped:failures.length});
});
