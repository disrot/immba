import { getAuthSession, rpc } from "./supabase.js?v=secure1";
import { PACKETS } from "./marketplace.js?v=trade1";
import { availableQty, defaultOnHand, placeOrders } from "./trade.js?v=trade1";

const list = document.querySelector("[data-cart]");
const status = document.querySelector("[data-cart-status]");

const esc = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const LOCAL_BAG = "immba-local-bag";

const sellerBooks = () => {
  try {
    const rows = JSON.parse(localStorage.getItem("immba-seller-books") || "[]");
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
};

const productFor = (id) => {
  const packet = PACKETS.find((item) => item.id === id);
  if (packet) {
    return {
      id,
      title: packet.en.title,
      unit: packet.price,
      image: packet.image,
      onHand: packet.sold ? 0 : defaultOnHand(id),
      sellerId: "shelf",
      sellerName: "imMBA shelf",
    };
  }
  const book = sellerBooks().find((row) => row.id === id);
  if (!book || book.status !== "active") return null;
  return {
    id,
    title: book.title,
    unit: Number(book.price) || 0,
    image: book.photos?.[0] || "",
    onHand: Number(book.quantity || 1),
    sellerId: book.sellerEmail || "local",
    sellerName: book.sellerName || "Classmate",
  };
};

const imageFor = (id) => productFor(id)?.image || "";

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
  const product = productFor(id);
  const left = product ? availableQty(id, product.onHand) : 0;
  if (!product || left <= 0) throw new Error("This listing is not available.");
  const rows = readLocal().filter((row) => row.listing_id !== id);
  rows.push({
    listing_id: id,
    title: product.title,
    quantity: Math.min(left, qty),
    unit_amount: product.unit,
    image: product.image,
    onHand: product.onHand,
    sellerId: product.sellerId,
    sellerName: product.sellerName,
    local: true,
  });
  writeLocal(rows);
};

let shown = [];

const paintItems = (items) => {
  shown = items;
  const total = items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unit_amount || 0), 0);
  list.innerHTML = items.length
    ? `${items
        .map((item) => {
          const photo = item.image || imageFor(item.listing_id);
          const left = availableQty(item.listing_id, item.onHand ?? productFor(item.listing_id)?.onHand);
          const thumb = photo
            ? `<img src="${esc(photo)}" alt="">`
            : `<span class="bag-fallback" aria-hidden="true"></span>`;
          return `<article class="bag-line">
            ${thumb}
            <div>
              <h2>${esc(item.title)}</h2>
              <div class="bag-qty">
                <button type="button" data-bag-qty="-1" data-id="${esc(item.listing_id)}" ${item.quantity <= 1 ? "disabled" : ""} aria-label="Decrease quantity">−</button>
                <span class="trade-money">${esc(item.quantity)}</span>
                <button type="button" data-bag-qty="1" data-id="${esc(item.listing_id)}" ${item.quantity >= left ? "disabled" : ""} aria-label="Increase quantity">+</button>
              </div>
            </div>
            <p class="trade-money">NT$ ${esc(item.unit_amount)}</p>
          </article>`;
        })
        .join("")}
      <p class="trade-total trade-money">NT$ ${total.toLocaleString("en-US")}</p>`
    : `<p class="bag-empty">Your bag is empty.</p>`;
  const button = document.querySelector("[data-place]");
  if (button) button.disabled = items.length === 0;
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

list?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-bag-qty]");
  if (!button) return;
  const id = button.getAttribute("data-id");
  const item = shown.find((row) => row.listing_id === id);
  if (!item) return;
  const left = availableQty(id, item.onHand ?? productFor(id)?.onHand);
  const quantity = Math.min(left, Math.max(1, Number(item.quantity) + Number(button.getAttribute("data-bag-qty"))));
  const next = readLocal().filter((row) => row.listing_id !== id);
  next.push({ ...item, quantity, local: true });
  writeLocal(next);
  paintItems(shown.map((row) => (row.listing_id === id ? { ...row, quantity } : row)));
});

document.querySelector("[data-place]")?.addEventListener("click", async () => {
  const button = document.querySelector("[data-place]");
  const session = getAuthSession();
  if (!session?.email) {
    status.textContent = "Sign in before placing an order.";
    return;
  }
  if (!shown.length) return;
  button.disabled = true;
  button.classList.add("is-busy");
  button.textContent = "Placing order…";
  try {
    const created = placeOrders({
      buyer: session.email.split("@")[0],
      buyerEmail: session.email,
      lines: shown.map((item) => {
        const product = productFor(item.listing_id);
        return {
          id: item.listing_id,
          title: item.title,
          qty: item.quantity,
          unit: item.unit_amount,
          image: item.image || product?.image || "",
          onHand: item.onHand ?? product?.onHand,
          sellerId: item.sellerId || product?.sellerId || "shelf",
          sellerName: item.sellerName || product?.sellerName || "imMBA shelf",
        };
      }),
    });
    writeLocal([]);
    for (const item of shown) {
      try {
        await rpc("cart_upsert", { p_listing_id: item.listing_id, p_quantity: 0 });
      } catch {
        /* Shelf packets are kept in this browser when the server has no listing row. */
      }
    }
    location.href = `orders.html?placed=${encodeURIComponent(created[0]?.id || "")}`;
  } catch (error) {
    status.textContent = error.message || "Could not place this order.";
    button.disabled = false;
    button.classList.remove("is-busy");
    button.textContent = "Place order";
  }
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
