import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const url  = Deno.env.get("SB_URL")!;
const key  = Deno.env.get("SB_SERVICE_ROLE_KEY")!; // hemmelig
const hdrs = { "apikey": key, "Authorization": `Bearer ${key}`, "Content-Type":"application/json" };

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  try{
    const { visitor_id, event_type } = await req.json();
    if (!visitor_id || !event_type) return new Response("Bad request", { status: 400 });

    // Opprett visitor hvis den ikke finnes
    await fetch(`${url}/rest/v1/visitors?id=eq.${visitor_id}&select=id`, { headers: hdrs })
      .then(async r => {
        if (!r.ok) throw new Error("visitors check failed");
        const j = await r.json();
        if (!Array.isArray(j) || j.length === 0) {
          return fetch(`${url}/rest/v1/visitors`, { method:"POST", headers: hdrs, body: JSON.stringify({ id: visitor_id }) });
        }
      });

    // Logg event
    const ev = await fetch(`${url}/rest/v1/events`, {
      method: "POST", headers: hdrs, body: JSON.stringify({ visitor_id, event_type })
    });
    if (!ev.ok) return new Response("Insert failed", { status: 500 });

    return new Response(JSON.stringify({ ok:true }), { headers: { "Content-Type":"application/json" }});
  }catch(e){
    return new Response(String(e?.message || e), { status: 500 });
  }
});
