import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { constantTimeEqual, hmacSha256Hex } from "../_shared/security.ts";
type JsonValue = null | boolean | number | string | JsonValue[] | { [key:string]: JsonValue };
type JsonRecord = { [key:string]: JsonValue };
const asRecord=(value:JsonValue):JsonRecord|null=>typeof value==='object'&&value!==null&&!Array.isArray(value)?value as JsonRecord:null;
const asString=(value:JsonValue|undefined):string|null=>typeof value==='string'?value:value==null?null:String(value);
const url=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),verifyToken=Deno.env.get("WHATSAPP_VERIFY_TOKEN"),appSecret=Deno.env.get("WHATSAPP_APP_SECRET"),phoneNumberId=Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
if(!url||!key||!verifyToken||!appSecret)throw new Error("WhatsApp webhook is not configured");
const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
Deno.serve(async(req)=>{
 if(req.method==='GET'){const u=new URL(req.url);if(!constantTimeEqual(u.searchParams.get('hub.verify_token'),verifyToken))return new Response('Forbidden',{status:403});return new Response(u.searchParams.get('hub.challenge')||'',{status:200});}
 if(req.method!=='POST')return new Response('Method Not Allowed',{status:405});
 const rawBody=await req.text();if(rawBody.length>1048576)return new Response('Payload Too Large',{status:413});
 const signature=req.headers.get('x-hub-signature-256')||'';if(!signature.startsWith('sha256=')||!constantTimeEqual(signature.slice(7),await hmacSha256Hex(appSecret,rawBody)))return new Response('Unauthorized',{status:401});
 let body:JsonValue;try{body=JSON.parse(rawBody) as JsonValue;}catch{return Response.json({error:'Invalid JSON'},{status:400});}
 const root=asRecord(body);const entries=Array.isArray(root?.entry)?root.entry:[];
 for(const entryValue of entries){const entry=asRecord(entryValue);const changes=Array.isArray(entry?.changes)?entry.changes:[];
  for(const changeValue of changes){const change=asRecord(changeValue);const value=asRecord(change?.value??null)??{};const metadata=asRecord(value.metadata??null);
   if(phoneNumberId&&metadata?.phone_number_id&&asString(metadata.phone_number_id)!==phoneNumberId)return new Response('Forbidden',{status:403});
   for(const statusValue of (Array.isArray(value.statuses)?value.statuses:[])){const status=asRecord(statusValue);if(!status)continue;const id=asString(status.id);const {error}=await admin.rpc('record_provider_delivery_event_worker',{p_provider:'meta_whatsapp',p_channel:'whatsapp',p_event_type:asString(status.status)||'unknown',p_provider_message_id:id,p_provider_reference:id,p_recipient:asString(status.recipient_id),p_payload:status});if(error)return Response.json({error:error.message},{status:500});}
   for(const messageValue of (Array.isArray(value.messages)?value.messages:[])){const message=asRecord(messageValue);if(!message)continue;const textObject=asRecord(message.text??null),button=asRecord(message.button??null),interactive=asRecord(message.interactive??null),buttonReply=asRecord(interactive?.button_reply??null),listReply=asRecord(interactive?.list_reply??null);const sender=asString(message.from)||'';const text=asString(textObject?.body)||asString(button?.text)||asString(buttonReply?.title)||asString(listReply?.title)||'';if(!sender||!text)continue;const id=asString(message.id);const {error}=await admin.rpc('record_inbound_communication_worker',{p_provider:'meta_whatsapp',p_channel:'whatsapp',p_sender:sender,p_recipient:asString(metadata?.display_phone_number),p_message:text,p_provider_message_id:id,p_payload:message});if(error)return Response.json({error:error.message},{status:500});}
  }
 }
 return Response.json({ok:true});
});
