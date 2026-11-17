const KEY = "immba-c2c";
const MODE_KEY = "immba-market-mode";

const NEXT = {
  waiting_payment: "payment_confirmed",
  payment_confirmed: "ready_to_ship",
  ready_to_ship: "shipped",
  shipped: "completed",
};

const SHELF_OUT = new Set(["org"]);

const read = () => {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || "{}");
    return {
      stock: data.stock && typeof data.stock === "object" ? data.stock : {},
      purchased: data.purchased && typeof data.purchased === "object" ? data.purchased : {},
      orders: Array.isArray(data.orders) ? data.orders : [],
    };
  } catch {
    return { stock: {}, purchased: {}, orders: [] };
  }
};

const write = (data) => {
  localStorage.setItem(KEY, JSON.stringify(data));
  window.dispatchEvent(new CustomEvent("immba:trade"));
};

export const marketMode = () => (localStorage.getItem(MODE_KEY) === "buyer" ? "buyer" : "seller");

export const setMarketMode = (mode) => {
  localStorage.setItem(MODE_KEY, mode === "seller" ? "seller" : "buyer");
  window.dispatchEvent(new CustomEvent("immba:mode"));
};

export const defaultOnHand = (id) => (SHELF_OUT.has(id) ? 0 : 3);

export const onHand = (id, fallback) => {
  const data = read();
  if (data.stock[id] != null) return Number(data.stock[id]);
  return fallback == null ? defaultOnHand(id) : Number(fallback);
};

export const purchasedQty = (id) => Number(read().purchased[id] || 0);

export const availableQty = (id, fallbackOnHand) => Math.max(0, onHand(id, fallbackOnHand) - purchasedQty(id));

export const setOnHand = (id, qty) => {
  const data = read();
  data.stock[id] = Math.max(0, Math.round(Number(qty) || 0));
  write(data);
};

export const statusText = (status, zh) => {
  const labels = {
    placed: zh ? "已下單" : "Order placed",
    waiting_payment: zh ? "等待確認付款" : "Waiting for payment confirmation",
    payment_confirmed: zh ? "已確認付款" : "Payment confirmed",
    ready_to_ship: zh ? "準備出貨" : "Ready to ship",
    shipped: zh ? "已出貨" : "Shipped",
    completed: zh ? "已完成" : "Completed",
  };
  return labels[status] || status;
};

export const actionText = (status, zh) => {
  const labels = {
    waiting_payment: zh ? "確認付款" : "Confirm payment",
    payment_confirmed: zh ? "標為可出貨" : "Mark ready to ship",
    ready_to_ship: zh ? "確認出貨" : "Confirm shipment",
    shipped: zh ? "標為完成" : "Mark completed",
  };
  return labels[status] || "";
};

const orderId = () => `C2C-${Math.floor(100000 + Math.random() * 900000)}`;

export const placeOrders = ({ buyer, buyerEmail, lines }) => {
  const data = read();
  const groups = new Map();
  for (const line of lines) {
    const qty = Math.max(1, Math.round(Number(line.qty) || 1));
    const hand = data.stock[line.id] != null ? Number(data.stock[line.id]) : Number(line.onHand ?? defaultOnHand(line.id));
    const left = Math.max(0, hand - Number(data.purchased[line.id] || 0));
    if (qty > left) {
      const error = new Error(left ? `Only ${left} left for ${line.title}.` : `${line.title} is sold out.`);
      error.code = "stock";
      throw error;
    }
    const sellerId = line.sellerId || "shelf";
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
    }
    const total = group.items.reduce((sum, item) => sum + item.qty * Number(item.unit || 0), 0);
    const order = {
      id: orderId(),
      buyer: buyer || "Buyer",
      buyerEmail: buyerEmail || "",
      sellerId: group.sellerId,
      sellerName: group.sellerName,
      items: group.items.map(({ id, title, qty, unit, image }) => ({ id, title, qty, unit, image: image || "" })),
      total,
      status: "waiting_payment",
      createdAt: now,
      history: [
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

export const allOrders = () => read().orders;

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
    .reduce((sum, order) => sum + Number(order.total || 0), 0);
};

export const ordersToCsv = (rows) => {
  const cell = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const header = ["Order ID", "Date", "Buyer", "Seller", "Status", "Items", "Total TWD"];
  const lines = rows.map((order) =>
    [
      order.id,
      order.createdAt,
      order.buyer,
      order.sellerName,
      order.status,
      (order.items || []).map((item) => `${item.title} x${item.qty}`).join("; "),
      order.total,
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
