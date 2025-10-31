// supabase/functions/public/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const url = Deno.env.get("SB_URL")!;                 // https://<ref>.supabase.co
const key = Deno.env.get("SB_SERVICE_ROLE_KEY")!;    // service role
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

// Hent "count" fra Content-Range med Prefer: count=exact
async function getCount(path: string): Promise<number> {
  const r = await fetch(`${url}/rest/v1/${path}`, {
    headers: { ...svcHdrs, Prefer: "count=exact" },
  });
  if (!r.ok) throw new Error(`count failed for ${path}`);
  const cr = r.headers.get("content-range") || "0-0/0";
  const total = parseInt(cr.split("/")[1] || "0", 10);
  return Number.isFinite(total) ? total : 0;
}

serve(async (req) => {
  // CORS preflight
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
    // Unike e-postklikkere (distinct på visitor_id)
    const email_unique = await getCount(
      `events?event_type=eq.email&select=visitor_id&distinct=true&limit=1`,
    );

    // Eldste event som kampanjestart
    const rStart = await fetch(
      `${url}/rest/v1/events?select=created_at&order=created_at.asc&limit=1`,
      { headers: svcHdrs },
    );
    let campaign_start: string | null = null;
    if (rStart.ok) {
      const arr = await rStart.json();
      if (Array.isArray(arr) && arr[0]?.created_at) {
        campaign_start = arr[0].created_at;
      }
    }

    return new Response(
      JSON.stringify({ email_unique, campaign_start }),
      { headers: baseHdrs },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500,
      headers: baseHdrs,
    });
  }
});
