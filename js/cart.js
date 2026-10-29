import { getAuthSession, getSupabase, rpc, supabase } from "./supabase.js?v=secure1";

const list = document.querySelector("[data-cart]");
const status = document.querySelector("[data-cart-status]");

const paint = async () => {
  if (!getAuthSession()?.access_token) {
    status.textContent = "Sign in before adding a listing to the cart.";
    return;
  }
  const cart = await rpc("cart_get");
  const items = cart?.items || [];
  list.innerHTML = items.length
    ? items.map((item) => `<p>${item.title} · ${item.quantity} × NT$ ${item.unit_amount}</p>`).join("")
    : "<p>Your cart is empty.</p>";
};

document.querySelector("[data-checkout]")?.addEventListener("click", async () => {
  status.textContent = "Asking the server for a checkout session…";
  const { data } = await supabase.auth.getSession();
  const { url, key } = getSupabase();
  const response = await fetch(`${url}/functions/v1/create-checkout-session`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${data.session?.access_token || ""}`,
      "Content-Type": "application/json",
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.url) {
    status.textContent = body.error || "Checkout is not live. The platform account must be approved before payments are turned on.";
    return;
  }
  location.href = body.url;
});

const params = new URLSearchParams(location.search);
if (params.get("listing")) {
  rpc("cart_upsert", { p_listing_id: params.get("listing"), p_quantity: Number(params.get("qty") || 1) })
    .then(paint)
    .catch((error) => {
      status.textContent = error.message;
    });
} else {
  paint().catch((error) => {
    status.textContent = error.message;
  });
}
