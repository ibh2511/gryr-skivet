import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const url      = Deno.env.get("SB_URL")!;
const key      = Deno.env.get("SB_SERVICE_ROLE_KEY")!;
const adminKey = Deno.env.get("ADMIN_KEY")!;

const ALLOW_ORIGIN = "https://ibh2511.github.io";

const baseHdrs = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": ALLOW_ORIGIN,
  "Access-Control-Allow-Headers": "content-type,x-admin-key",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Vary": "Origin",
};

const svcHdrs = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  "Content-Type": "application/json",
};

// Robust tekst→JSON (tåler tom body)
async function safeJson(resp: Response) {
  const txt = await resp.text();
  if (!txt) return [];
  try { return JSON.parse(txt); } catch { return []; }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: baseHdrs });
  if (req.method !== "POST")    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: baseHdrs });

  const got = req.headers.get("x-admin-key") || "";
  if (!adminKey || got !== adminKey) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: baseHdrs });

  try {
    const { op } = await req.json().catch(() => ({}));

    if (op === "ping") {
      return new Response(JSON.stringify({ ok: true }), { headers: baseHdrs });
    }

    if (op === "counts") {
      const r = await fetch(`${url}/rest/v1/rpc/admin_counts`, {
        method: "POST",
        headers: svcHdrs,
        body: JSON.stringify({}) // må være POST
      });
      if (!r.ok) {
        const t = await r.text();
        return new Response(JSON.stringify({ error: "admin_counts rpc failed", detail: t }), { status: 500, headers: baseHdrs });
      }
      const data = await r.json(); // jsonb -> rett ut
      return new Response(JSON.stringify(data), { headers: baseHdrs });
    }
    
    if (op === "export") {
      const CHUNK = 1000;
      let start = 0;
      const events: Array<{created_at:string; event_type:string; visitor_id:string|null}> = [];
    
      while (true) {
        const end = start + CHUNK - 1;
        const r = await fetch(
          `${url}/rest/v1/events?select=created_at,event_type,visitor_id&order=created_at.asc`,
          { headers: { ...svcHdrs, Range: `${start}-${end}`, Prefer: "count=exact" } }
        );
        if (!r.ok) {
          const t = await r.text();
          return new Response(JSON.stringify({ error: "export failed", detail: t }), { status: 500, headers: baseHdrs });
        }
        const batch = await r.json();
        events.push(...batch);
        if (batch.length < CHUNK) break; // siste side
        start += CHUNK;
      }
    
      return new Response(JSON.stringify({ events }), { headers: baseHdrs });
    }


    if (op === "reset") {
      const now = new Date().toISOString();

      // Viktig: Prefer: return=representation for å få JSON tilbake
      const delHdrs = { ...svcHdrs, Prefer: "return=representation" };

      const evDel = await fetch(`${url}/rest/v1/events?created_at=lt.${now}&select=event_type`, { method: "DELETE", headers: delHdrs });
      const viDel = await fetch(`${url}/rest/v1/visitors?first_seen=lt.${now}&select=id`,       { method: "DELETE", headers: delHdrs });

      if (!evDel.ok || !viDel.ok) {
        return new Response(JSON.stringify({ error: "Delete failed" }), { status: 500, headers: baseHdrs });
      }

      const evRows = await safeJson(evDel);   // tåler tomt svar
      const viRows = await safeJson(viDel);

      const deletedEvents   = Array.isArray(evRows) ? evRows.length : 0;
      const deletedVisitors = Array.isArray(viRows) ? viRows.length : 0;

      return new Response(JSON.stringify({ ok: true, deletedEvents, deletedVisitors }), { headers: baseHdrs });
    }

    return new Response(JSON.stringify({ error: "Unknown op" }), { status: 400, headers: baseHdrs });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: baseHdrs });
  }
});
