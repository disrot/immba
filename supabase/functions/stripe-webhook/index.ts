import { json, adminClient } from "../_shared/auth.ts";

const hex = (bytes: ArrayBuffer) => [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");

Deno.serve(async (req) => {
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";
  if (!secret) return json({ error: "Webhook secret is not configured" }, 503);
  const payload = await req.text();
  const signature = req.headers.get("stripe-signature") || "";
  const parts = Object.fromEntries(signature.split(",").map((part) => part.split("=")));
  const signed = `${parts.t}.${payload}`;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signed)));
  const offered = (parts.v1 || "").split(" ");
  if (!offered.includes(digest)) return json({ error: "Invalid signature" }, 400);
  const event = JSON.parse(payload);
  const supabase = await adminClient();
  const { data, error } = await supabase.rpc("commerce_apply_stripe_event", {
    p_id: event.id,
    p_type: event.type,
    p_payload: event,
  });
  if (error) return json({ error: error.message }, 500);
  return json(data || { ok: true });
});
