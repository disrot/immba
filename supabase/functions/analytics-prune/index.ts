import { json, adminClient } from "../_shared/auth.ts";

Deno.serve(async () => {
  const supabase = await adminClient();
  const { data, error } = await supabase.rpc("analytics_prune");
  if (error) return json({ error: error.message }, 500);
  return json({ removed: data });
});
