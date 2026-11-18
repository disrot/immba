import { getAuthSession, rpc } from "./supabase.js?v=secure1";
import { PACKETS } from "./marketplace.js?v=trade1";
import { HOLD_MS, availableQty, clearHold, defaultOnHand, holdListing, placeOrders, quoteLines, releaseExpired } from "./trade.js?v=hold1";

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
    delivery: Boolean(book.delivery),
    bumped: Boolean(book.bumped),
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
  if (!product) throw new Error("This listing is not available.");
  clearHold(id);
  const room = availableQty(id, product.onHand);
  if (room <= 0) throw new Error("This listing is not available.");
  const rows = readLocal().filter((row) => row.listing_id !== id);
  const until = Date.now() + HOLD_MS;
  const quantity = Math.min(room, qty);
  holdListing(id, quantity, until);
  rows.push({
    listing_id: id,
    title: product.title,
    quantity,
    unit_amount: product.unit,
    image: product.image,
    onHand: product.onHand,
    sellerId: product.sellerId,
    sellerName: product.sellerName,
    deliveryOffered: Boolean(product.delivery),
    delivery: Boolean(product.delivery),
    bumped: Boolean(product.bumped),
    holdUntil: until,
    local: true,
  });
  writeLocal(rows);
};

let shown = [];

const zh = () => document.body?.dataset.lang === "zh";
const nt = (value) => `NT$ ${Number(value || 0).toLocaleString(zh() ? "zh-TW" : "en-US")}`;

const withDelivery = (item) => {
  const product = productFor(item.listing_id);
  const offered = Boolean(item.deliveryOffered ?? product?.delivery);
  return {
    ...item,
    deliveryOffered: offered,
    delivery: item.delivery != null ? Boolean(item.delivery) : offered,
    bumped: item.bumped != null ? Boolean(item.bumped) : Boolean(product?.bumped),
  };
};

const paintItems = (items) => {
  shown = items.map(withDelivery);
  const quote = quoteLines(
    shown.map((item) => ({
      qty: item.quantity,
      unit: item.unit_amount,
      delivery: item.delivery,
    }))
  );
  list.innerHTML = shown.length
    ? `${shown
        .map((item) => {
          const photo = item.image || imageFor(item.listing_id);
          const left = availableQty(item.listing_id, item.onHand ?? productFor(item.listing_id)?.onHand) + Number(item.quantity);
          const remain = Math.max(0, Number(item.holdUntil || 0) - Date.now());
          const holdLabel = item.holdUntil
            ? zh()
              ? `保留 ${Math.floor(remain / 60000)}:${String(Math.floor((remain % 60000) / 1000)).padStart(2, "0")}，未完成付款會回到市集`
              : `Hold ${Math.floor(remain / 60000)}:${String(Math.floor((remain % 60000) / 1000)).padStart(2, "0")}. Unpaid items return to the marketplace`
            : "";
          const thumb = photo
            ? `<img src="${esc(photo)}" alt="">`
            : `<span class="bag-fallback" aria-hidden="true"></span>`;
          const delivery = item.deliveryOffered
            ? `<label class="bag-delivery">
                <input type="checkbox" data-bag-delivery="${esc(item.listing_id)}" ${item.delivery ? "checked" : ""}>
                <span>${zh() ? "外送 NT$60" : "Delivery NT$60"}</span>
              </label>`
            : "";
          return `<article class="bag-line">
            ${thumb}
            <div class="bag-copy">
              <div class="bag-top">
                <h2>${esc(item.title)}</h2>
                <p class="bag-price trade-money">${nt(item.unit_amount)}</p>
              </div>
              <div class="bag-qty">
                <button type="button" data-bag-qty="-1" data-id="${esc(item.listing_id)}" ${item.quantity <= 1 ? "disabled" : ""} aria-label="${zh() ? "減少數量" : "Decrease quantity"}">−</button>
                <span class="bag-count">${esc(item.quantity)}</span>
                <button type="button" data-bag-qty="1" data-id="${esc(item.listing_id)}" ${item.quantity >= left ? "disabled" : ""} aria-label="${zh() ? "增加數量" : "Increase quantity"}">+</button>
              </div>
              <p class="bag-fee">${zh() ? `服務費 NT$ ${4 * Number(item.quantity)}` : `Service fee NT$ ${4 * Number(item.quantity)}`}</p>
              ${holdLabel ? `<p class="bag-hold" data-hold-id="${esc(item.listing_id)}" data-hold-until="${esc(item.holdUntil)}">${esc(holdLabel)}</p>` : ""}
              ${delivery}
              <button type="button" class="bag-remove" data-bag-remove="${esc(item.listing_id)}">${zh() ? "移除" : "Remove"}</button>
            </div>
          </article>`;
        })
        .join("")}`
    : `<p class="bag-empty">${zh() ? "袋子是空的。" : "Your bag is empty."}</p>`;
  const totals = document.querySelector("[data-bag-totals]");
  if (totals) {
    totals.innerHTML = shown.length
      ? `<div class="bag-fees">
          <p><span>${zh() ? "小計" : "Subtotal"}</span><span class="trade-money">${nt(quote.goods)}</span></p>
          <p><span>${zh() ? "服務費" : "Service fee"}</span><span class="trade-money">${nt(quote.buyerFee)}</span></p>
          <p><span>${zh() ? "外送" : "Delivery"}</span><span class="trade-money">${nt(quote.deliveryFee)}</span></p>
          <p class="trade-total"><span>${zh() ? "合計" : "Total"}</span><span class="trade-money">${nt(quote.total)}</span></p>
        </div>`
      : "";
  }
  if (shown.length) list.innerHTML = `<div class="bag-lines">${list.innerHTML}</div>`;
  const button = document.querySelector("[data-place]");
  if (button) button.disabled = items.length === 0;
};

const sweepLocal = () => {
  releaseExpired();
  const now = Date.now();
  const rows = readLocal();
  const kept = [];
  let expired = false;
  for (const row of rows) {
    if (row.holdUntil && Number(row.holdUntil) <= now) {
      expired = true;
      clearHold(row.listing_id);
      continue;
    }
    const until = Number(row.holdUntil) > now ? Number(row.holdUntil) : now + HOLD_MS;
    holdListing(row.listing_id, row.quantity, until);
    kept.push(until === Number(row.holdUntil) ? row : { ...row, holdUntil: until });
  }
  if (expired || kept.some((row, index) => row !== rows[index])) writeLocal(kept);
  if (expired && status) {
    status.textContent = zh()
      ? "保留時間結束。未完成付款的教材已回到市集。"
      : "The 10-minute hold ended. Unpaid items are back on the marketplace.";
  }
  return kept;
};

const paint = async () => {
  const kept = sweepLocal();
  let server = [];
  if (getAuthSession()?.access_token) {
    try {
      const cart = await rpc("cart_get");
      server = cart?.items || [];
    } catch {
      server = [];
    }
  }
  const local = kept.filter((row) => !server.some((item) => item.listing_id === row.listing_id));
  paintItems([...server, ...local]);
};

list?.addEventListener("change", (event) => {
  const box = event.target.closest("[data-bag-delivery]");
  if (!box) return;
  const id = box.getAttribute("data-bag-delivery");
  const item = shown.find((row) => row.listing_id === id);
  if (!item) return;
  const next = readLocal().filter((row) => row.listing_id !== id);
  next.push({ ...item, delivery: box.checked, deliveryOffered: true, local: true });
  writeLocal(next);
  paintItems(shown.map((row) => (row.listing_id === id ? { ...row, delivery: box.checked } : row)));
});

list?.addEventListener("click", async (event) => {
  const remove = event.target.closest("[data-bag-remove]");
  if (remove) {
    const id = remove.getAttribute("data-bag-remove");
    clearHold(id);
    writeLocal(readLocal().filter((row) => row.listing_id !== id));
    try {
      await rpc("cart_upsert", { p_listing_id: id, p_quantity: 0 });
    } catch {
      /* Local shelf lines are only stored in this browser. */
    }
    paintItems(shown.filter((row) => row.listing_id !== id));
    return;
  }
  const button = event.target.closest("[data-bag-qty]");
  if (!button) return;
  const id = button.getAttribute("data-id");
  const item = shown.find((row) => row.listing_id === id);
  if (!item) return;
  const left = availableQty(id, item.onHand ?? productFor(id)?.onHand) + Number(item.quantity);
  const quantity = Math.min(left, Math.max(1, Number(item.quantity) + Number(button.getAttribute("data-bag-qty"))));
  const until = Number(item.holdUntil) > Date.now() ? Number(item.holdUntil) : Date.now() + HOLD_MS;
  holdListing(id, quantity, until);
  const next = readLocal().filter((row) => row.listing_id !== id);
  next.push({ ...item, quantity, holdUntil: until, local: true });
  writeLocal(next);
  paintItems(shown.map((row) => (row.listing_id === id ? { ...row, quantity } : row)));
});

const receiveOrder = () =>
  new Promise((resolve) => {
    const zh = document.body?.dataset.lang === "zh";
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const steps = zh
      ? ["連上 imMBA 書架", "連上賣方", "寫入你的訂單"]
      : ["Connecting to the imMBA shelf", "Connecting to the seller", "Connecting to your order"];
    const gate = document.createElement("div");
    gate.className = "listing-gate";
    gate.setAttribute("role", "dialog");
    gate.setAttribute("aria-modal", "true");
    gate.setAttribute("aria-label", zh ? "正在收下訂單" : "Receiving your order");
    gate.innerHTML = `
      <div class="listing-gate-card order-receive">
        <img src="images/logo.png" alt="" width="64" height="64">
        <h2>${zh ? "正在收下你的訂單" : "We're receiving your order"}</h2>
        <p>${zh ? "付款仍由賣方確認。" : "The seller still confirms payment."}</p>
        <div class="order-progress" aria-hidden="true"><i data-order-bar></i></div>
        <p class="order-hint">${zh ? "點正在亮的那一行，就會往下。" : "Tap the highlighted line to move on."}</p>
        <ol class="order-steps">
          ${steps
            .map(
              (label, index) => `<li data-order-step="${index}">
                <button type="button" data-order-go="${index}">
                  <span class="step-mark" aria-hidden="true"></span>
                  <span>${label}</span>
                </button>
              </li>`
            )
            .join("")}
        </ol>
      </div>`;
    document.body.append(gate);
    document.body.classList.add("is-gated");
    const bar = gate.querySelector("[data-order-bar]");
    const items = [...gate.querySelectorAll("[data-order-step]")];
    let index = 0;
    let timer = 0;
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve();
    };
    const paint = () => {
      items.forEach((item, itemIndex) => {
        const on = itemIndex === index;
        item.classList.toggle("is-on", on);
        item.classList.toggle("is-done", itemIndex < index);
        const button = item.querySelector("button");
        if (button) button.disabled = !on;
      });
      if (bar) bar.style.width = `${Math.round((index / steps.length) * 100)}%`;
    };
    const go = (next) => {
      if (settled) return;
      window.clearTimeout(timer);
      index = next;
      paint();
      if (index >= steps.length) {
        if (bar) bar.style.width = "100%";
        timer = window.setTimeout(finish, reduce ? 120 : 420);
        return;
      }
      timer = window.setTimeout(() => go(index + 1), reduce ? 280 : 1400);
    };
    gate.addEventListener("click", (event) => {
      const button = event.target.closest("[data-order-go]");
      if (!button || Number(button.getAttribute("data-order-go")) !== index) return;
      go(index + 1);
    });
    go(0);
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
  await receiveOrder();
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
          delivery: Boolean(item.delivery),
          bumped: Boolean(item.bumped),
          holdUntil: item.holdUntil,
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
    document.querySelector(".listing-gate")?.remove();
    document.body.classList.remove("is-gated");
    status.textContent = error.message || "Could not place this order.";
    button.disabled = false;
    button.classList.remove("is-busy");
    button.textContent = "Place order";
  }
});

window.addEventListener("immba:lang", () => {
  if (shown.length) paintItems(shown);
});

window.setInterval(() => {
  const now = Date.now();
  if (readLocal().some((row) => row.holdUntil && Number(row.holdUntil) <= now)) {
    void paint();
    return;
  }
  document.querySelectorAll("[data-hold-until]").forEach((node) => {
    const remain = Math.max(0, Number(node.getAttribute("data-hold-until")) - Date.now());
    const clock = `${Math.floor(remain / 60000)}:${String(Math.floor((remain % 60000) / 1000)).padStart(2, "0")}`;
    node.textContent = zh()
      ? `保留 ${clock}，未完成付款會回到市集`
      : `Hold ${clock}. Unpaid items return to the marketplace`;
  });
}, 1000);

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
