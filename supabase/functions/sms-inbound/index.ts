import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const url=Deno.env.get("SUPABASE_URL"); const key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"); const secret=Deno.env.get("AT_INBOUND_SECRET");
if(!url||!key||!secret) throw new Error("SMS inbound is not configured");
const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
Deno.serve(async(req)=>{
 if(req.method!=="POST") return new Response("Method Not Allowed",{status:405});
 if((req.headers.get("x-topline-callback-secret")||new URL(req.url).searchParams.get("secret"))!==secret) return new Response("Unauthorized",{status:401});
 const form=await req.formData().catch(()=>null); let p:Record<string,string>={}; if(form) for(const [k,v] of form.entries()) p[k]=String(v);
 if(!Object.keys(p).length){const b=await req.json().catch(()=>({}));p=Object.fromEntries(Object.entries(b).map(([k,v])=>[k,String(v??"")]));}
 const sender=p.from||p.phoneNumber||p.phone||""; const message=p.text||p.message||""; if(!sender||!message) return new Response("Missing sender/message",{status:400});
 const {error}=await admin.rpc("record_inbound_communication_worker",{p_provider:"africastalking",p_channel:"sms",p_sender:sender,p_recipient:p.to||null,p_message:message,p_provider_message_id:p.id||p.messageId||null,p_payload:p});
 if(error) return Response.json({error:error.message},{status:500}); return new Response("OK");
});
