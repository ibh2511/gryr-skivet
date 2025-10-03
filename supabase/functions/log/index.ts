import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const url  = Deno.env.get("SB_URL")!;
const key  = Deno.env.get("SB_SERVICE_ROLE_KEY")!;

const ALLOW_ORIGIN = "https://ibh2511.github.io";

const baseHdrs = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": ALLOW_ORIGIN,
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Vary": "Origin",
};

const svcHdrs = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  "Content-Type": "application/json",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: baseHdrs });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: baseHdrs });
  }

  try {
    const { visitor_id, event_type } = await req.json();
    if (!visitor_id || !event_type) {
      return new Response(JSON.stringify({ error: "Bad request" }), { status: 400, headers: baseHdrs });
    }

    // sørg for visitor
    const check = await fetch(`${url}/rest/v1/visitors?id=eq.${visitor_id}&select=id`, { headers: svcHdrs });
    if (!check.ok) return new Response(JSON.stringify({ error: "visitors check failed" }), { status: 500, headers: baseHdrs });
    const j = await check.json();
    if (!Array.isArray(j) || j.length === 0) {
      const ins = await fetch(`${url}/rest/v1/visitors`, { method: "POST", headers: svcHdrs, body: JSON.stringify({ id: visitor_id }) });
      if (!ins.ok) return new Response(JSON.stringify({ error: "insert visitor failed" }), { status: 500, headers: baseHdrs });
    }

    // logg event
    const ev = await fetch(`${url}/rest/v1/events`, { method: "POST", headers: svcHdrs, body: JSON.stringify({ visitor_id, event_type }) });
    if (!ev.ok) return new Response(JSON.stringify({ error: "insert event failed" }), { status: 500, headers: baseHdrs });

    return new Response(JSON.stringify({ ok: true }), { headers: baseHdrs });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: baseHdrs });
  }
});
