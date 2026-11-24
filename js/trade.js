const KEY = "immba-c2c";
const MODE_KEY = "immba-market-mode";

const NEXT = {
  waiting_payment: "payment_confirmed",
  payment_confirmed: "ready_to_ship",
  ready_to_ship: "shipped",
  shipped: "completed",
};

const GENERATED_IDS = new Set([
  "ibm",
  "ethics",
  "strategy",
  "supply",
  "marketing",
  "org",
  "finance",
  "hr",
  "analytics",
  "ai",
  "ibm-used",
  "thesis",
]);

export const isGeneratedListing = (id) => GENERATED_IDS.has(id) || String(id || "").startsWith("rot-");

const read = () => {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || "{}");
    return {
      stock: data.stock && typeof data.stock === "object" ? data.stock : {},
      purchased: data.purchased && typeof data.purchased === "object" ? data.purchased : {},
      holds: data.holds && typeof data.holds === "object" ? data.holds : {},
      orders: Array.isArray(data.orders) ? data.orders : [],
    };
  } catch {
    return { stock: {}, purchased: {}, holds: {}, orders: [] };
  }
};

const write = (data) => {
  localStorage.setItem(KEY, JSON.stringify(data));
  window.dispatchEvent(new CustomEvent("immba:trade"));
};

export const marketMode = () => (localStorage.getItem(MODE_KEY) === "seller" ? "seller" : "buyer");

export const setMarketMode = (mode) => {
  localStorage.setItem(MODE_KEY, mode === "seller" ? "seller" : "buyer");
  window.dispatchEvent(new CustomEvent("immba:mode"));
};

export const defaultOnHand = () => 3;

export const onHand = (id, fallback) => {
  const data = read();
  if (data.stock[id] != null) return Number(data.stock[id]);
  return fallback == null ? defaultOnHand(id) : Number(fallback);
};

export const purchasedQty = (id) => Number(read().purchased[id] || 0);

export const availableQty = (id, fallbackOnHand) => {
  const data = fresh(read());
  const hand = data.stock[id] != null ? Number(data.stock[id]) : fallbackOnHand == null ? defaultOnHand() : Number(fallbackOnHand);
  return Math.max(0, hand - Number(data.purchased[id] || 0) - heldQty(data, id));
};

export const setOnHand = (id, qty) => {
  const data = read();
  data.stock[id] = Math.max(0, Math.round(Number(qty) || 0));
  write(data);
  void pushC2c({ id, onHand: data.stock[id] }, "hand");
};

export const statusText = (status, zh) => {
  const labels = {
    placed: zh ? "已下單" : "Order placed",
    waiting_payment: zh ? "等待確認付款" : "Waiting for payment confirmation",
    expired: zh ? "已退回市集" : "Returned to the marketplace",
    payment_confirmed: zh ? "已確認付款" : "Payment confirmed",
    ready_to_ship: zh ? "可面交" : "Ready for hand-off",
    shipped: zh ? "已面交" : "Handed off",
    completed: zh ? "已完成" : "Completed",
  };
  return labels[status] || status;
};

export const actionText = (status, zh) => {
  const labels = {
    waiting_payment: zh ? "確認已收款" : "Confirm payment received",
    payment_confirmed: zh ? "標為可面交" : "Mark ready for hand-off",
    ready_to_ship: zh ? "確認已面交" : "Confirm hand-off",
    shipped: zh ? "標為完成" : "Mark completed",
  };
  return labels[status] || "";
};

export const HOLD_MS = 10 * 60 * 1000;

const fresh = (data) => {
  const now = Date.now();
  let changed = false;
  const holds = { ...data.holds };
  for (const [id, hold] of Object.entries(holds)) {
    if (!hold || Number(hold.until) <= now) {
      delete holds[id];
      changed = true;
    }
  }
  const purchased = { ...data.purchased };
  const orders = data.orders.map((order) => {
    if (order.sellerId === "shelf" && order.status === "waiting_payment") {
      changed = true;
      return {
        ...order,
        status: "payment_confirmed",
        payBy: "",
        history: [...(order.history || []), { status: "payment_confirmed", at: new Date(now).toISOString() }],
      };
    }
    if (order.status !== "waiting_payment" || !order.payBy || Date.parse(order.payBy) > now) return order;
    changed = true;
    for (const item of order.items || []) {
      purchased[item.id] = Math.max(0, Number(purchased[item.id] || 0) - Number(item.qty || 0));
    }
    return {
      ...order,
      status: "expired",
      history: [...(order.history || []), { status: "expired", at: new Date(now).toISOString() }],
    };
  });
  if (!changed) return data;
  const next = { ...data, holds, purchased, orders };
  write(next);
  return next;
};

export const releaseExpired = () => fresh(read());

export const holdListing = (id, qty, until = Date.now() + HOLD_MS) => {
  const data = fresh(read());
  const prev = data.holds[id];
  const nextQty = Math.max(1, Math.round(Number(qty) || 1));
  const nextUntil = Number(until);
  if (prev && Number(prev.qty) === nextQty && Number(prev.until) === nextUntil) return prev;
  data.holds[id] = { qty: nextQty, until: nextUntil };
  write(data);
  return data.holds[id];
};

export const clearHold = (id) => {
  const data = read();
  if (!data.holds[id]) return;
  delete data.holds[id];
  write(data);
};

const heldQty = (data, id) => {
  const hold = data.holds?.[id];
  if (!hold || Number(hold.until) <= Date.now()) return 0;
  return Number(hold.qty) || 0;
};

export const BUYER_ITEM_FEE = 4;
export const SELLER_FEE_RATE = 0.04;
export const SELLER_BUMP_RATE = 0.1;
export const DELIVERY_FEE = 60;

export const sellerTake = (unit, bumped = false) => {
  const price = Math.max(0, Math.round(Number(unit) || 0));
  const rate = bumped ? SELLER_BUMP_RATE : SELLER_FEE_RATE;
  const fee = Math.round(price * rate);
  return { price, fee, net: price - fee, rate };
};

export const quoteLines = (lines) => {
  const items = (lines || []).map((line) => {
    const qty = Math.max(1, Math.round(Number(line.qty ?? line.quantity) || 1));
    const unit = Math.max(0, Math.round(Number(line.unit ?? line.unit_amount) || 0));
    const take = sellerTake(unit, Boolean(line.bumped));
    const delivery = Boolean(line.delivery);
    return {
      ...line,
      qty,
      unit,
      buyerFee: BUYER_ITEM_FEE * qty,
      sellerFee: take.fee * qty,
      sellerNet: take.net * qty,
      deliveryFee: delivery ? DELIVERY_FEE : 0,
    };
  });
  const goods = items.reduce((sum, item) => sum + item.qty * item.unit, 0);
  const buyerFee = items.reduce((sum, item) => sum + item.buyerFee, 0);
  const sellerFee = items.reduce((sum, item) => sum + item.sellerFee, 0);
  const deliveryFee = items.reduce((sum, item) => sum + item.deliveryFee, 0);
  const bookNet = items.reduce((sum, item) => sum + item.sellerNet, 0);
  return {
    items,
    goods,
    buyerFee,
    sellerFee,
    deliveryFee,
    sellerNet: bookNet + deliveryFee,
    total: goods + buyerFee + deliveryFee,
  };
};

export const sellerProceeds = (order) => (order?.sellerNet != null ? Number(order.sellerNet) : Number(order?.total || 0));

const norm = (value) => String(value || "").trim().toLowerCase();

export const listingSeller = (item = {}) => {
  const raw = norm(item.sellerId);
  const email = norm(item.sellerEmail || (raw.includes("@") ? raw : ""));
  const userId =
    norm(item.sellerUserId) ||
    (raw && !raw.includes("@") && raw !== "shelf" && raw !== "local" ? raw : "");
  const classmate = Boolean(email || userId || (raw && raw !== "shelf"));
  return {
    sellerId: classmate ? email || userId || (item.posted ? "local" : raw || "local") : "shelf",
    sellerEmail: email,
    sellerUserId: userId,
    generated: !classmate,
  };
};

const ownPostedIds = (who) => {
  const email = norm(typeof who === "string" ? who : who?.email);
  const userId = norm(typeof who === "string" ? "" : who?.user?.id || who?.id);
  let rows = [];
  try {
    rows = JSON.parse(localStorage.getItem("immba-seller-books") || "[]");
  } catch {
    rows = [];
  }
  if (!Array.isArray(rows)) return new Set();
  return new Set(
    rows
      .filter((book) => {
        const owner = norm(book?.sellerEmail);
        const ownerId = norm(book?.sellerUserId);
        if (!owner || owner === "local") return true;
        if (email && owner === email) return true;
        return Boolean(userId) && ownerId === userId;
      })
      .map((book) => book.id)
      .filter(Boolean),
  );
};

const orderId = () => `C2C-${Math.floor(100000 + Math.random() * 900000)}`;

export const placeOrders = ({ buyer, buyerEmail, lines }) => {
  const data = fresh(read());
  const groups = new Map();
  for (const line of lines) {
    const qty = Math.round(Number(line.qty) || 0);
    if (qty < 1) {
      const error = new Error(`${line.title || "This item"} needs a quantity of at least 1.`);
      error.code = "qty";
      throw error;
    }
    const hand = data.stock[line.id] != null ? Number(data.stock[line.id]) : Number(line.onHand ?? defaultOnHand());
    const listed = Math.max(0, Math.round(hand));
    const left = Math.max(0, listed - Number(data.purchased[line.id] || 0));
    if (qty > left) {
      const error = new Error(left ? `Only ${left} left for ${line.title}.` : `${line.title} is sold out.`);
      error.code = "stock";
      throw error;
    }
    const ident = listingSeller(line);
    const sellerId = ident.sellerId || (line.generated ? "shelf" : "local");
    if (!groups.has(sellerId)) {
      groups.set(sellerId, {
        sellerId,
        sellerEmail: ident.sellerEmail,
        sellerUserId: ident.sellerUserId,
        sellerName: line.sellerName || "imMBA shelf",
        items: [],
      });
    }
    groups.get(sellerId).items.push({ ...line, qty });
  }

  const now = new Date().toISOString();
  const created = [];
  for (const group of groups.values()) {
    for (const item of group.items) {
      if (data.stock[item.id] == null) data.stock[item.id] = Number(item.onHand ?? defaultOnHand(item.id));
      data.purchased[item.id] = Number(data.purchased[item.id] || 0) + item.qty;
      delete data.holds[item.id];
    }
    const quote = quoteLines(group.items);
    const shelfOrder = group.sellerId === "shelf";
    const payByMs = group.items.reduce((soonest, item) => {
      const until = Number(item.holdUntil);
      if (!until || until <= Date.now()) return soonest;
      return Math.min(soonest, until);
    }, Date.now() + HOLD_MS);
    const order = {
      id: orderId(),
      buyer: buyer || "Buyer",
      buyerEmail: buyerEmail || "",
      sellerId: group.sellerId,
      sellerEmail: group.sellerEmail || "",
      sellerUserId: group.sellerUserId || "",
      sellerName: group.sellerName,
      items: quote.items.map(({ id, title, qty, unit, image, delivery, buyerFee, sellerNet }) => ({
        id,
        title,
        qty,
        unit,
        image: image || "",
        delivery: Boolean(delivery),
        buyerFee,
        sellerNet,
      })),
      goods: quote.goods,
      buyerFee: quote.buyerFee,
      sellerFee: quote.sellerFee,
      deliveryFee: quote.deliveryFee,
      sellerNet: quote.sellerNet,
      total: quote.total,
      updatedAt: now,
      status: shelfOrder ? "payment_confirmed" : "waiting_payment",
      payBy: shelfOrder ? "" : new Date(payByMs).toISOString(),
      createdAt: now,
      history: shelfOrder
        ? [
            { status: "placed", at: now },
            { status: "waiting_payment", at: now },
            { status: "payment_confirmed", at: now },
          ]
        : [
            { status: "placed", at: now },
            { status: "waiting_payment", at: now },
          ],
    };
    data.orders.unshift(order);
    created.push(order);
  }
  write(data);
  for (const order of created) void pushC2c(order, "place");
  return created;
};

export const advanceOrder = (id) => {
  const data = read();
  const order = data.orders.find((row) => row.id === id);
  const next = order ? NEXT[order.status] : "";
  if (!order || !next) return order || null;
  order.status = next;
  order.updatedAt = new Date().toISOString();
  order.history = [...(order.history || []), { status: next, at: order.updatedAt }];
  write(data);
  void pushC2c(order, "advance");
  return order;
};

export const allOrders = () => fresh(read()).orders;

export const buyerOrders = (email) => allOrders().filter((order) => order.buyerEmail === email);

export const sellerOwns = (order, who) => {
  if (!order) return false;
  const email = norm(typeof who === "string" ? who : who?.email);
  const userId = norm(typeof who === "string" ? "" : who?.user?.id || who?.id);
  const keys = new Set([email, userId].filter(Boolean));
  const marks = [order.sellerId, order.sellerEmail, order.sellerUserId].map(norm).filter((value) => value && value !== "shelf");
  if (marks.includes("local")) return true;
  if (marks.some((value) => keys.has(value))) return true;
  const ids = (order.items || []).map((item) => item.id).filter(Boolean);
  if (!ids.length || ids.some((id) => isGeneratedListing(id))) return false;
  const mine = ownPostedIds(who);
  return ids.every((id) => mine.has(id));
};

export const sellerOrders = (who) => allOrders().filter((order) => sellerOwns(order, who));

export const isAbnormal = (order) => !order.buyer || !order.items?.length || Number(order.total) <= 0;

export const money = (value, zh) => `NT$${Number(value || 0).toLocaleString(zh ? "zh-TW" : "en-US")}`;

export const when = (value, zh) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(zh ? "zh-TW" : "en-US", { dateStyle: "medium", timeStyle: "short" });
};

export const monthSales = (rows) => {
  const now = new Date();
  return rows
    .filter((order) => {
      if (order.status !== "completed") return false;
      const date = new Date(order.createdAt);
      return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    })
    .reduce((sum, order) => sum + sellerProceeds(order), 0);
};

export const ordersToCsv = (rows) => {
  const cell = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const header = ["Order ID", "Date", "Buyer", "Seller", "Status", "Items", "Books TWD", "Buyer fee TWD", "Delivery TWD", "Buyer pays TWD", "Seller receives TWD"];
  const lines = rows.map((order) =>
    [
      order.id,
      order.createdAt,
      order.buyer,
      order.sellerName,
      order.status,
      (order.items || []).map((item) => `${item.title} x${item.qty}${item.delivery ? " + delivery" : ""}`).join("; "),
      order.goods ?? order.total,
      order.buyerFee ?? "",
      order.deliveryFee ?? "",
      order.total,
      sellerProceeds(order),
    ]
      .map(cell)
      .join(",")
  );
  return [header.join(","), ...lines].join("\n");
};

export const downloadCsv = (filename, rows) => {
  const blob = new Blob([ordersToCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const newer = (order, other) => {
  const stamp = (row) => Date.parse(row?.updatedAt || row?.createdAt || "") || 0;
  return stamp(order) >= stamp(other);
};

const pushC2c = async (payload, kind) => {
  try {
    const { rpc, supabase } = await import("./supabase.js?v=secure2");
    if (kind === "place") await rpc("c2c_place", { p_order: payload });
    else if (kind === "advance") await rpc("c2c_advance", { p_order: payload });
    else await rpc("c2c_hand", { p_listing: payload.id, p_on_hand: payload.onHand });
    if (kind !== "hand") await supabase.functions.invoke("process-email-outbox", { body: {} });
  } catch {
    /* This browser keeps the order when the shared desk is offline. */
  }
};

let pulling = false;

export const syncC2c = async () => {
  if (pulling) return;
  pulling = true;
  try {
    const { rpc } = await import("./supabase.js?v=secure2");
    const remote = await rpc("c2c_pull");
    const local = read();
    const byId = new Map(local.orders.map((order) => [order.id, order]));
    for (const order of remote?.orders || []) {
      if (!order?.id) continue;
      const current = byId.get(order.id);
      if (!current || newer(order, current)) byId.set(order.id, order);
    }
    local.orders = [...byId.values()].sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
    const stock = remote?.stock && typeof remote.stock === "object" ? remote.stock : {};
    for (const [id, row] of Object.entries(stock)) {
      if (row?.onHand != null) local.stock[id] = Number(row.onHand);
      if (row?.purchased != null) local.purchased[id] = Math.max(Number(local.purchased[id] || 0), Number(row.purchased));
    }
    write(local);
  } catch {
    /* Local orders stay available. */
  } finally {
    pulling = false;
  }
};
