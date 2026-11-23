import { getAuthSession, rpc } from "./supabase.js?v=secure1";
import { PACKETS } from "./marketplace.js?v=apple7";
import { rotatedPackets } from "./shelf-rotation.js?v=pass2";
import { HOLD_MS, availableQty, clearHold, defaultOnHand, holdListing, isGeneratedListing, placeOrders, quoteLines, releaseExpired } from "./trade.js?v=stock1";

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
  const packet = PACKETS.find((item) => item.id === id) || rotatedPackets().find((item) => item.id === id);
  if (packet) {
    return {
      id,
      title: packet.en.title,
      unit: packet.price,
      image: packet.image,
      onHand: defaultOnHand(id),
      sellerId: "shelf",
      sellerName: packet.sellerName || "imMBA shelf",
      delivery: Boolean(packet.delivery),
      bumped: Boolean(packet.bumped),
      generated: true,
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
    generated: Boolean(product.generated),
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

const withDelivery = (item) => {
  const product = productFor(item.listing_id);
  const offered = Boolean(item.deliveryOffered ?? product?.delivery);
  return {
    ...item,
    deliveryOffered: offered,
    delivery: offered ? (item.delivery != null ? Boolean(item.delivery) : false) : false,
    bumped: item.bumped != null ? Boolean(item.bumped) : Boolean(product?.bumped),
  };
};

let cartView = null;
let totalsView = null;
let cartGen = 0;
let totalsGen = 0;

const forgetLine = async (id) => {
  clearHold(id);
  writeLocal(readLocal().filter((row) => row.listing_id !== id));
  try {
    await rpc("cart_upsert", { p_listing_id: id, p_quantity: 0 });
  } catch {
    /* Local shelf lines are only stored in this browser. */
  }
  paintItems(shown.filter((row) => row.listing_id !== id));
};

const stockCap = (item) => {
  const listed = Math.max(1, Math.round(Number(item.onHand ?? productFor(item.listing_id)?.onHand) || defaultOnHand()));
  if (isGeneratedListing(item.listing_id)) return listed;
  const outside = availableQty(item.listing_id, listed);
  return Math.max(1, Math.min(listed, outside + Number(item.quantity || 0)));
};

const commitQty = (id, quantity) => {
  const item = shown.find((row) => row.listing_id === id);
  if (!item) return;
  if (quantity <= 0) {
    queueMicrotask(() => forgetLine(id));
    return;
  }
  const nextQty = Math.min(stockCap(item), Math.max(1, quantity));
  const until = Number(item.holdUntil) > Date.now() ? Number(item.holdUntil) : Date.now() + HOLD_MS;
  holdListing(id, nextQty, until);
  const next = readLocal().filter((row) => row.listing_id !== id);
  next.push({ ...item, quantity: nextQty, holdUntil: until, local: true });
  writeLocal(next);
  shown = shown.map((row) => (row.listing_id === id ? { ...row, quantity: nextQty, holdUntil: until } : row));
  syncBag();
};

const quoteFor = (items) =>
  quoteLines(
    items.map((item) => ({
      qty: item.quantity,
      unit: item.unit_amount,
      delivery: item.delivery,
    }))
  );

const totalRows = (quote) => [
  { id: "goods", label: zh() ? "小計" : "Subtotal", amount: quote.goods },
  { id: "fee", label: zh() ? "服務費" : "Service fee", amount: quote.buyerFee },
  { id: "delivery", label: zh() ? "外送" : "Delivery", amount: quote.deliveryFee },
  { id: "total", label: zh() ? "合計" : "Total", amount: quote.total, strong: true },
];

const cartProps = (items) => {
  const lines = items.map((item) => {
    const handoff = item.delivery
      ? zh()
        ? "外送 NT$60"
        : "Delivery NT$60"
      : zh()
        ? "校園面交"
        : "Campus hand-off";
    const cap = stockCap(item);
    return {
      id: item.listing_id,
      name: item.title,
      detail: handoff,
      price: Number(item.unit_amount) || 0,
      image: item.image || productFor(item.listing_id)?.image || "",
      max: cap,
      quantity: Math.min(cap, Number(item.quantity) || 1),
    };
  });
  return {
    lines,
    currency: "NT$",
    digits: 0,
    quantities: Object.fromEntries(lines.map((line) => [line.id, line.quantity])),
    checkoutLabel: zh() ? "下單" : "Place order",
    emptyLabel: zh() ? "袋子是空的" : "Your bag is empty",
    limitFor: (max) => (zh() ? `最多 ${max}` : `Max ${max}`),
    summaryFor: (count) => (zh() ? `袋子裡 ${count} 件` : `${count} in your bag`),
    onQuantitiesChange: (next) => {
      const changed = shown.find((item) => Number(next[item.listing_id] ?? 0) !== Number(item.quantity));
      if (changed) commitQty(changed.listing_id, Number(next[changed.listing_id] ?? 0));
    },
    onCheckout: () => document.querySelector("button[data-place-order]")?.click(),
  };
};

const paintExtras = (items) => {
  const extra = list.querySelector("[data-bag-extra]");
  if (!extra) return;
  const key = `${zh() ? "zh" : "en"}|${items.map((item) => `${item.listing_id}:${item.deliveryOffered ? 1 : 0}`).join("|")}`;
  if (extra.dataset.key !== key) {
    extra.dataset.key = key;
    extra.innerHTML = items
      .map((item) => {
        const label = item.deliveryOffered
          ? zh()
            ? "外送 NT$60"
            : "Delivery NT$60"
          : zh()
            ? "僅校園面交"
            : "Campus hand-off only";
        return `<label class="bag-delivery"><input type="checkbox" data-bag-delivery="${esc(item.listing_id)}" ${item.delivery ? "checked" : ""} ${item.deliveryOffered ? "" : "disabled"}><span>${esc(item.title)} · ${label}</span></label>`;
      })
      .join("");
    return;
  }
  for (const item of items) {
    const box = extra.querySelector(`[data-bag-delivery="${CSS.escape(item.listing_id)}"]`);
    if (box) box.checked = Boolean(item.delivery);
  }
};

const syncBag = () => {
  const locale = zh() ? "zh-TW" : "en-US";
  const totals = document.querySelector("[data-bag-totals]");
  if (totals) {
    if (!shown.length) {
      totalsGen += 1;
      totalsView?.unmount();
      totalsView = null;
      totals.replaceChildren();
    } else if (totalsView) {
      totalsView.update(totalRows(quoteFor(shown)), locale);
    } else if (totals.dataset.mounting !== "1") {
      totals.dataset.mounting = "1";
      const generation = ++totalsGen;
      void import("../src/bag-totals.tsx").then(({ mountTotals }) => {
        delete totals.dataset.mounting;
        if (generation !== totalsGen || !totals.isConnected || !shown.length) return;
        totalsView = mountTotals(totals, totalRows(quoteFor(shown)), zh() ? "zh-TW" : "en-US");
      });
    }
  }
  if (shown.length && cartView) cartView.update(cartProps(shown));
  const button = document.querySelector("button[data-place-order]");
  if (button) button.disabled = shown.length === 0;
};

const paintItems = (items) => {
  let trimmed = false;
  shown = items.map(withDelivery).map((item) => {
    const cap = stockCap(item);
    const quantity = Math.min(cap, Math.max(1, Number(item.quantity) || 1));
    if (quantity === Number(item.quantity)) return item;
    trimmed = true;
    const until = Number(item.holdUntil) > Date.now() ? Number(item.holdUntil) : Date.now() + HOLD_MS;
    holdListing(item.listing_id, quantity, until);
    return { ...item, quantity, holdUntil: until };
  });
  if (trimmed) {
    const localIds = new Set(readLocal().map((row) => row.listing_id));
    writeLocal(shown.filter((item) => item.local || localIds.has(item.listing_id)));
  }
  if (!shown.length) {
    cartGen += 1;
    totalsGen += 1;
    cartView?.unmount();
    cartView = null;
    totalsView?.unmount();
    totalsView = null;
    if (list) list.innerHTML = `<p class="bag-empty">${zh() ? "袋子是空的。" : "Your bag is empty."}</p>`;
    document.querySelector("[data-bag-totals]")?.replaceChildren();
    const button = document.querySelector("button[data-place-order]");
    if (button) button.disabled = true;
    return;
  }
  if (!list.querySelector("[data-cart-button]")) {
    cartView?.unmount();
    cartView = null;
    list.innerHTML = `<div class="kokonut-surface" data-cart-button></div><div class="bag-extra" data-bag-extra></div>`;
  }
  paintExtras(shown);
  syncBag();
  if (!cartView && list.dataset.cartMounting !== "1") {
    const host = list.querySelector("[data-cart-button]");
    list.dataset.cartMounting = "1";
    const generation = ++cartGen;
    void import("../src/mount-cart.tsx").then(({ mountCart }) => {
      delete list.dataset.cartMounting;
      if (generation !== cartGen || !host?.isConnected || !shown.length) return;
      cartView = mountCart(host, cartProps(shown));
    });
  }
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

list?.addEventListener("click", (event) => {
  const remove = event.target.closest("[data-bag-remove]");
  if (!remove) return;
  void forgetLine(remove.getAttribute("data-bag-remove"));
});

const receiveOrder = () =>
  new Promise((resolve) => {
    const zh = document.body?.dataset.lang === "zh";
    const shelfOnly = shown.length > 0 && shown.every((item) => item.generated || item.sellerId === "shelf");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const quote = quoteLines(shown);
    const sellers = [...new Set(shown.map((item) => item.sellerName || "imMBA shelf"))];
    const seller = sellers.length === 1 ? sellers[0] : zh ? "多位賣方" : "Several sellers";
    const steps = zh
      ? [
          { id: "shelf", title: "連上 imMBA 書架", detail: "確認教材還在架上" },
          { id: "seller", title: "連上賣方", detail: seller },
          { id: "order", title: "寫入你的訂單", detail: shelfOnly ? "書架會直接接受付款" : "同學刊登仍由賣方確認付款" },
        ]
      : [
          { id: "shelf", title: "Connecting to the imMBA shelf", detail: "Checking the books are still there" },
          { id: "seller", title: "Connecting to the seller", detail: seller },
          { id: "order", title: "Connecting to your order", detail: shelfOnly ? "Shelf listings accept the payment" : "A classmate still confirms payment" },
        ];
    const gate = document.createElement("div");
    gate.className = "listing-gate transfer-gate";
    gate.setAttribute("role", "dialog");
    gate.setAttribute("aria-modal", "true");
    gate.setAttribute("aria-label", zh ? "正在收下訂單" : "Receiving your order");
    gate.innerHTML = `<div data-transfer></div><p class="order-hint">${zh ? "點正在亮的那一行，就會往下。" : "Tap the highlighted line to move on."}</p>`;
    document.body.append(gate);
    document.body.classList.add("is-gated");
    const ref = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;
    let index = 0;
    let timer = 0;
    let settled = false;
    let view = null;
    const card = (status) => ({
      from: { amount: quote.total, currency: "TWD", symbol: "NT$", bank: zh ? "你的袋子" : "Your bag" },
      to: { amount: quote.total, currency: "TWD", symbol: "NT$", bank: seller, name: zh ? "你的訂單" : "Your order" },
      rate: 1,
      digits: 0,
      locale: zh ? "zh-TW" : "en",
      txnId: ref,
      status,
      progress: status === "completed" ? steps.length : index,
      steps,
      summary: zh ? `合計 NT$${quote.total}，含服務費與外送` : `NT$${quote.total} total, with the service fee and delivery`,
      note: zh ? "點亮的步驟可以往下" : "The lit step moves you on",
      labels: {
        processing: zh ? "進行中" : "In progress",
        completed: zh ? "已收下" : "Received",
        failed: zh ? "失敗" : "Failed",
      },
      onStepClick: (step) => {
        if (step === index) go(index + 1);
      },
    });
    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve();
    };
    const go = (next) => {
      if (settled) return;
      window.clearTimeout(timer);
      index = next;
      if (index >= steps.length) {
        view?.update(card("completed"));
        timer = window.setTimeout(finish, reduce ? 120 : 420);
        return;
      }
      view?.update(card("processing"));
      timer = window.setTimeout(() => go(index + 1), reduce ? 280 : 1400);
    };
    void import("../src/transfer-gate.tsx")
      .then(({ mountTransfer }) => {
        view = mountTransfer(gate.querySelector("[data-transfer]"), card("processing"));
        go(0);
      })
      .catch(() => finish());
  });

document.querySelector("button[data-place-order]")?.addEventListener("click", async () => {
  const button = document.querySelector("button[data-place-order]");
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
          sellerId: item.sellerId || product?.sellerId || "local",
          sellerName: item.sellerName || product?.sellerName || "imMBA shelf",
          generated: Boolean(item.generated || product?.generated),
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

window.addEventListener("immba:bag", () => {
  paint().catch(() => {});
});

window.setInterval(() => {
  const now = Date.now();
  if (readLocal().some((row) => row.holdUntil && Number(row.holdUntil) <= now)) void paint();
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
