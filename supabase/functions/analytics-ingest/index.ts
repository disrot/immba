import { cors, json, adminClient } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const body = await req.json().catch(() => ({}));
  const supabase = await adminClient();
  const { data, error } = await supabase.rpc("analytics_ingest", { p_events: body.events || [] });
  if (error) return json({ error: error.message }, 400);
  return json({ accepted: data });
});
