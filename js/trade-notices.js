const KEY = "immba-trade-notices";

const read = () => {
  try {
    const rows = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
};

const write = (rows) => {
  localStorage.setItem(KEY, JSON.stringify(rows.slice(0, 30)));
  window.dispatchEvent(new CustomEvent("immba:notices"));
};

export const pushTradeNotice = (notice) => {
  const email = String(notice.email || "").trim().toLowerCase();
  if (!email) return;
  const rows = read().filter((row) => row.id !== notice.id);
  rows.unshift({
    id: notice.id || `${email}-${Date.now()}`,
    email,
    audience: notice.audience || "buyer",
    orderId: notice.orderId || "",
    text: String(notice.text || ""),
    textZh: String(notice.textZh || notice.text || ""),
    at: new Date().toISOString(),
    seen: false,
  });
  write(rows);
};

export const tradeNoticesFor = (email) => {
  const key = String(email || "").trim().toLowerCase();
  if (!key) return [];
  return read().filter((row) => row.email === key && !row.seen);
};

export const ackTradeNotices = (email) => {
  const key = String(email || "").trim().toLowerCase();
  write(read().map((row) => (row.email === key ? { ...row, seen: true } : row)));
};
