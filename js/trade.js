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
  if (isGeneratedListing(id)) return defaultOnHand();
  const hand = data.stock[id] != null ? Number(data.stock[id]) : fallbackOnHand == null ? defaultOnHand() : Number(fallbackOnHand);
  return Math.max(0, hand - Number(data.purchased[id] || 0) - heldQty(data, id));
};

export const setOnHand = (id, qty) => {
  const data = read();
  data.stock[id] = Math.max(0, Math.round(Number(qty) || 0));
  write(data);
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

const orderId = () => `C2C-${Math.floor(100000 + Math.random() * 900000)}`;

export const placeOrders = ({ buyer, buyerEmail, lines }) => {
  const data = fresh(read());
  const groups = new Map();
  for (const line of lines) {
    const qty = Math.max(1, Math.round(Number(line.qty) || 1));
    const generatedLine = Boolean(line.generated) || line.sellerId === "shelf" || isGeneratedListing(line.id);
    const hand = data.stock[line.id] != null ? Number(data.stock[line.id]) : Number(line.onHand ?? defaultOnHand());
    const listed = Math.max(1, Math.round(hand));
    const left = generatedLine ? listed : Math.max(0, listed - Number(data.purchased[line.id] || 0));
    if (qty > left) {
      const error = new Error(left ? `Only ${left} left for ${line.title}.` : `${line.title} is sold out.`);
      error.code = "stock";
      throw error;
    }
    const sellerId = line.sellerId || (line.generated ? "shelf" : "local");
    if (!groups.has(sellerId)) {
      groups.set(sellerId, {
        sellerId,
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
  return created;
};

export const advanceOrder = (id) => {
  const data = read();
  const order = data.orders.find((row) => row.id === id);
  const next = order ? NEXT[order.status] : "";
  if (!order || !next) return order || null;
  order.status = next;
  order.history = [...(order.history || []), { status: next, at: new Date().toISOString() }];
  write(data);
  return order;
};

export const allOrders = () => fresh(read()).orders;

export const buyerOrders = (email) => allOrders().filter((order) => order.buyerEmail === email);

export const sellerOrders = (email) =>
  allOrders().filter((order) => order.sellerId === "shelf" || order.sellerId === "local" || (email && order.sellerId === email));

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
