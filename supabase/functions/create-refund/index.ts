import { json, adminClient } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*" } });
  const secret = Deno.env.get("STRIPE_SECRET_KEY") || "";
  if (!secret) return json({ error: "Stripe is not configured" }, 503);
  const body = await req.json();
  const supabase = await adminClient();
  const { data: userData } = await supabase.auth.getUser((req.headers.get("Authorization") || "").replace("Bearer ", ""));
  if (!userData.user) return json({ error: "Sign in required" }, 401);
  const stripe = await fetch("https://api.stripe.com/v1/refunds", {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ payment_intent: body.payment_intent, amount: String(body.amount) }),
  });
  const refund = await stripe.json();
  if (!stripe.ok) return json({ error: refund.error?.message || "Refund failed" }, 502);
  return json({ id: refund.id, status: refund.status });
});
