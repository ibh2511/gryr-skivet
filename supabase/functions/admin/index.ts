import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const url      = Deno.env.get("SB_URL")!;
const key      = Deno.env.get("SB_SERVICE_ROLE_KEY")!;
const adminKey = Deno.env.get("ADMIN_KEY")!;

const hdrs = { "apikey": key, "Authorization": `Bearer ${key}`, "Content-Type":"application/json" };

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const got = req.headers.get("x-admin-key") || "";
  if (!adminKey || got !== adminKey) return new Response("Unauthorized", { status: 401 });

  try{
    const { op } = await req.json().catch(() => ({}));

    if (op === "ping") return new Response(JSON.stringify({ ok:true }), { headers: { "Content-Type":"application/json" }});

    if (op === "counts") {
      const v = await fetch(`${url}/rest/v1/visitors?select=id`, { headers: hdrs });
      const e = await fetch(`${url}/rest/v1/events?select=event_type,visitor_id,created_at&order=created_at.desc`, { headers: hdrs });
      if (!v.ok || !e.ok) return new Response("Fetch failed", { status: 500 });
      return new Response(JSON.stringify({ visitors: await v.json(), events: await e.json() }), { headers: { "Content-Type":"application/json" }});
    }

    if (op === "reset") {
      const now = new Date().toISOString();
      const evDel = await fetch(`${url}/rest/v1/events?created_at=lt.${now}&select=event_type`, { method:"DELETE", headers: hdrs });
      const viDel = await fetch(`${url}/rest/v1/visitors?first_seen=lt.${now}&select=id`, { method:"DELETE", headers: hdrs });
      if (!evDel.ok || !viDel.ok) return new Response("Delete failed", { status: 500 });

      const deletedEvents   = ((await evDel.json()) as any[])?.length ?? 0;
      const deletedVisitors = ((await viDel.json()) as any[])?.length ?? 0;

      return new Response(JSON.stringify({ ok:true, deletedEvents, deletedVisitors }), { headers: { "Content-Type":"application/json" }});
    }

    return new Response("Unknown op", { status: 400 });
  }catch(e){
    return new Response(String(e?.message || e), { status: 500 });
  }
});
