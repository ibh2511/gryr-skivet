// supabase/functions/public/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const url = Deno.env.get("SB_URL")!;
const key = Deno.env.get("SB_SERVICE_ROLE_KEY")!;
const ALLOW_ORIGIN = "https://ibh2511.github.io";

const baseHdrs = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": ALLOW_ORIGIN,
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Vary": "Origin",
};

const svcHdrs = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  "Content-Type": "application/json",
};

// Hent antall fra Content-Range (Prefer: count=exact)
async function countDistinctEmailers(): Promise<number> {
  const r = await fetch(
    `${url}/rest/v1/events?event_type=eq.email&select=visitor_id&distinct=true&limit=1`,
    { headers: { ...svcHdrs, Prefer: "count=exact" } }
  );
  if (!r.ok) throw new Error("email_unique failed");
  const cr = r.headers.get("content-range") || "0-0/0";
  const total = parseInt(cr.split("/")[1] || "0", 10);
  return Number.isFinite(total) ? total : 0;
}

async function getCampaignStart(): Promise<string|null> {
  const r = await fetch(
    `${url}/rest/v1/events?select=created_at&order=created_at.asc&limit=1`,
    { headers: svcHdrs }
  );
  if (!r.ok) return null;
  const arr = await r.json();
  return (Array.isArray(arr) && arr[0]?.created_at) ? arr[0].created_at : null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: baseHdrs });
  if (req.method !== "GET")     return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: baseHdrs });

  try {
    const [email_unique, campaign_start] = await Promise.all([
      countDistinctEmailers(),
      getCampaignStart()
    ]);

    return new Response(JSON.stringify({ email_unique, campaign_start }), { headers: baseHdrs });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: baseHdrs });
  }
});
