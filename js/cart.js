import { getAuthSession, getSupabase, rpc, supabase } from "./supabase.js?v=secure1";
import { PACKETS } from "./marketplace.js?v=atelier1";

const list = document.querySelector("[data-cart]");
const status = document.querySelector("[data-cart-status]");

const esc = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const LOCAL_BAG = "immba-local-bag";

const imageFor = (id) => PACKETS.find((item) => item.id === id)?.image || "";

const readLocal = () => {
  try {
    const rows = JSON.parse(localStorage.getItem(LOCAL_BAG) || "[]");
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
};

const writeLocal = (rows) => localStorage.setItem(LOCAL_BAG, JSON.stringify(rows));

const holdLocal = (id, qty) => {
  const packet = PACKETS.find((item) => item.id === id);
  if (!packet || packet.sold) throw new Error("This listing is not available.");
  const rows = readLocal().filter((row) => row.listing_id !== id);
  rows.push({
    listing_id: id,
    title: packet.en.title,
    quantity: qty,
    unit_amount: packet.price,
    image: packet.image,
    local: true,
  });
  writeLocal(rows);
};

const paintItems = (items) => {
  list.innerHTML = items.length
    ? items
        .map((item) => {
          const photo = item.image || imageFor(item.listing_id);
          const thumb = photo
            ? `<img src="${esc(photo)}" alt="">`
            : `<span class="bag-fallback" aria-hidden="true"></span>`;
          return `<article class="bag-line">
            ${thumb}
            <div>
              <h2>${esc(item.title)}</h2>
              <p>Qty ${esc(item.quantity)}</p>
            </div>
            <p>NT$ ${esc(item.unit_amount)}</p>
          </article>`;
        })
        .join("")
    : `<p class="bag-empty">Your bag is empty.</p>`;
};

const paint = async () => {
  let server = [];
  if (getAuthSession()?.access_token) {
    try {
      const cart = await rpc("cart_get");
      server = cart?.items || [];
    } catch {
      server = [];
    }
  }
  const local = readLocal().filter((row) => !server.some((item) => item.listing_id === row.listing_id));
  paintItems([...server, ...local]);
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
  const listing = params.get("listing");
  const qty = Number(params.get("qty") || 1);
  rpc("cart_upsert", { p_listing_id: listing, p_quantity: qty })
    .then(() => {
      writeLocal(readLocal().filter((row) => row.listing_id !== listing));
      return paint();
    })
    .catch(() => {
      try {
        holdLocal(listing, qty);
        status.textContent = "Held in this browser. A classmate listing is saved on the server once you are signed in.";
        return paint();
      } catch (error) {
        status.textContent = error.message;
      }
    });
} else {
  paint().catch((error) => {
    status.textContent = error.message;
  });
}
