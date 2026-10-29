import { json, adminClient } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const execute = url.searchParams.get("execute") === "1";
  const supabase = await adminClient();
  const { data, error } = await supabase.rpc("storage_cleanup_candidates");
  if (error) return json({ error: error.message }, 500);
  if (!execute) return json(data);
  const removed: string[] = [];
  for (const item of data.items || []) {
    if (item.referenced) continue;
    const { error: removeError } = await supabase.storage.from(item.bucket).remove([item.path]);
    if (!removeError) removed.push(item.path);
  }
  return json({ ...data, dry_run: false, removed });
});
