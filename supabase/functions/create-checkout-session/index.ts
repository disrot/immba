import { cors, json, adminClient } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const secret = Deno.env.get("STRIPE_SECRET_KEY") || "";
    if (!secret) return json({ error: "Stripe is not configured. Checkout stays off until the platform account is approved." }, 503);
    const auth = req.headers.get("Authorization") || "";
    const supabase = await adminClient();
    const { data: userData, error: userError } = await supabase.auth.getUser(auth.replace("Bearer ", ""));
    if (userError || !userData.user) return json({ error: "Sign in required" }, 401);
    const { data: prepared, error } = await supabase.rpc("checkout_prepare");
    if (error) return json({ error: error.message }, 400);
    const body = new URLSearchParams();
    body.set("mode", "payment");
    body.set("success_url", `${new URL(req.url).origin}/checkout-result.html?status=success`);
    body.set("cancel_url", `${new URL(req.url).origin}/checkout-result.html?status=cancel`);
    body.set("client_reference_id", String(prepared.intent_id || ""));
    body.set("metadata[buyer_id]", userData.user.id);
    body.set("metadata[intent_id]", String(prepared.intent_id || ""));
    const lines = Array.isArray(prepared.lines) ? prepared.lines : [];
    lines.forEach((line: { title?: string; unit_amount?: number; quantity?: number; currency?: string }, index: number) => {
      body.set(`line_items[${index}][quantity]`, String(line.quantity || 1));
      body.set(`line_items[${index}][price_data][currency]`, line.currency || "twd");
      body.set(`line_items[${index}][price_data][unit_amount]`, String(line.unit_amount || 0));
      body.set(`line_items[${index}][price_data][product_data][name]`, line.title || "imMBA listing");
    });
    const stripe = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const session = await stripe.json();
    if (!stripe.ok) return json({ error: session.error?.message || "Stripe refused the session" }, 502);
    return json({ url: session.url });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Checkout failed" }, 500);
  }
});
