import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { constantTimeEqual, hmacSha256Hex } from "../_shared/security.ts";

const url=Deno.env.get("SUPABASE_URL");
const key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const verifyToken=Deno.env.get("WHATSAPP_VERIFY_TOKEN");
const appSecret=Deno.env.get("WHATSAPP_APP_SECRET");
const phoneNumberId=Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
if(!url||!key||!verifyToken||!appSecret) throw new Error("WhatsApp webhook is not configured");
const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});

Deno.serve(async(req)=>{
 if(req.method==="GET"){
   const u=new URL(req.url);
   if(!constantTimeEqual(u.searchParams.get("hub.verify_token"),verifyToken)) return new Response("Forbidden",{status:403});
   return new Response(u.searchParams.get("hub.challenge")||"",{status:200});
 }
 if(req.method!=="POST") return new Response("Method Not Allowed",{status:405});
 const rawBody=await req.text();
 if(rawBody.length>1_048_576) return new Response("Payload Too Large",{status:413});
 const signature=req.headers.get("x-hub-signature-256")||"";
 if(!signature.startsWith("sha256=")||!constantTimeEqual(signature.slice(7),await hmacSha256Hex(appSecret,rawBody))) return new Response("Unauthorized",{status:401});
 let body:any; try{body=JSON.parse(rawBody);}catch{return Response.json({error:"Invalid JSON"},{status:400});}
 for(const entry of body.entry||[]) for(const change of entry.changes||[]){
   const value=change.value||{};
   if(phoneNumberId && value.metadata?.phone_number_id && String(value.metadata.phone_number_id)!==phoneNumberId) return new Response("Forbidden",{status:403});
   for(const s of value.statuses||[]){
     const {error}=await admin.rpc("record_provider_delivery_event_worker",{p_provider:"meta_whatsapp",p_channel:"whatsapp",p_event_type:String(s.status||"unknown"),p_provider_message_id:s.id?String(s.id):null,p_provider_reference:s.id?String(s.id):null,p_recipient:s.recipient_id?String(s.recipient_id):null,p_payload:s});
     if(error) return Response.json({error:error.message},{status:500});
   }
   for(const m of value.messages||[]){
     const sender=String(m.from||"");
     const text=String(m.text?.body||m.button?.text||m.interactive?.button_reply?.title||m.interactive?.list_reply?.title||"");
     if(!sender||!text) continue;
     const {error}=await admin.rpc("record_inbound_communication_worker",{p_provider:"meta_whatsapp",p_channel:"whatsapp",p_sender:sender,p_recipient:value.metadata?.display_phone_number||null,p_message:text,p_provider_message_id:m.id?String(m.id):null,p_payload:m});
     if(error) return Response.json({error:error.message},{status:500});
   }
 }
 return Response.json({ok:true});
});
