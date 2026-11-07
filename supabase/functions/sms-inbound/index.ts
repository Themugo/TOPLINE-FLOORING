import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { constantTimeEqual, headerOrQuery, readBoundedBody } from "../_shared/security.ts";
const url=Deno.env.get("SUPABASE_URL"); const key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"); const secret=Deno.env.get("AT_INBOUND_SECRET");
if(!url||!key||!secret) throw new Error("SMS inbound is not configured");
const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
Deno.serve(async(req)=>{
 if(req.method!=="POST") return new Response("Method Not Allowed",{status:405});
 if(!constantTimeEqual(headerOrQuery(req,"x-topline-callback-secret","secret"),secret)) return new Response("Unauthorized",{status:401});
 const {body:raw,tooLarge}=await readBoundedBody(req,65_536); if(tooLarge) return new Response("Payload Too Large",{status:413});
 const contentType=req.headers.get("content-type")||""; let p:Record<string,string>={};
 if(contentType.includes("application/x-www-form-urlencoded")||contentType.includes("multipart/form-data")){
  const parsed=await new Request(req.url,{method:"POST",headers:req.headers,body:raw}).formData().catch(()=>null);
  if(parsed) for(const [k,v] of parsed.entries()) p[k]=String(v);
 } else {
  try { const parsed=JSON.parse(raw); if(!parsed||typeof parsed!=="object"||Array.isArray(parsed)) return Response.json({error:"Invalid payload"},{status:400}); p=Object.fromEntries(Object.entries(parsed).map(([k,v])=>[k,String(v??"")])); }
  catch { return Response.json({error:"Invalid JSON payload"},{status:400}); }
 }
 const sender=p.from||p.phoneNumber||p.phone||""; const message=p.text||p.message||""; const providerMessageId=p.id||p.messageId||"";
 if(!sender||!message||!providerMessageId) return new Response("Missing sender/message/provider message ID",{status:400});
 const {error}=await admin.rpc("record_inbound_communication_worker",{p_provider:"africastalking",p_channel:"sms",p_sender:sender,p_recipient:p.to||null,p_message:message,p_provider_message_id:providerMessageId,p_payload:p});
 if(error) return Response.json({error:error.message},{status:500}); return new Response("OK");
});
