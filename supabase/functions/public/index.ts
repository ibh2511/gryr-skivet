import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const url = Deno.env.get("SB_URL")!;
const key = Deno.env.get("SB_SERVICE_ROLE_KEY")!;

const ALLOW_ORIGIN = "https://ibh2511.github.io";

const baseHdrs = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": ALLOW_ORIGIN,
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Vary": "Origin",
} as const;

const svcHdrs = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  "Content-Type": "application/json",
} as const;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: baseHdrs });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: baseHdrs,
    });
  }

  try {
    // Kall RPC som gjør distinct-count + kampanjestart
    const r = await fetch(`${url}/rest/v1/rpc/public_stats`, {
      method: "POST",
      headers: svcHdrs,
      body: JSON.stringify({}), // ingen parametre
    });

    if (!r.ok) {
      const txt = await r.text();
      return new Response(
        JSON.stringify({ error: `rpc public_stats failed: ${txt}` }),
        { status: 500, headers: baseHdrs },
      );
    }

    const data = await r.json(); // { email_unique, campaign_start }
    return new Response(JSON.stringify(data), { status: 200, headers: baseHdrs });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500,
      headers: baseHdrs,
    });
  }
});
