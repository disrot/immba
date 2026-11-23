import { HOLD_MS, availableQty, clearHold, holdListing } from "./trade.js?v=lab2";

const KEY = "immba-local-bag";

export const readBag = () => {
  try {
    const rows = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
};

export const writeBag = (rows) => {
  localStorage.setItem(KEY, JSON.stringify(rows));
  window.dispatchEvent(new Event("immba:bag"));
};

export const addBagLine = (line) => {
  const id = line.id;
  const onHand = Math.max(1, Math.round(Number(line.onHand) || 1));
  clearHold(id);
  const room = availableQty(id, onHand);
  if (room <= 0) throw new Error("This listing is not available.");
  const quantity = Math.min(room, Math.max(1, Math.round(Number(line.qty) || 1)));
  const until = Date.now() + HOLD_MS;
  holdListing(id, quantity, until);
  const rows = readBag().filter((row) => row.listing_id !== id);
  rows.push({
    listing_id: id,
    title: line.title,
    quantity,
    unit_amount: Math.max(0, Math.round(Number(line.unit) || 0)),
    image: line.image || "",
    onHand,
    sellerId: line.sellerId || "shelf",
    sellerName: line.sellerName || "imMBA shelf",
    generated: line.generated !== false,
    deliveryOffered: Boolean(line.delivery),
    delivery: false,
    bumped: Boolean(line.bumped),
    holdUntil: until,
    local: true,
  });
  writeBag(rows);
  return quantity;
};

export const setBagQty = (id, quantity) => {
  const rows = readBag();
  const item = rows.find((row) => row.listing_id === id);
  if (!item) return;
  if (quantity <= 0) {
    clearHold(id);
    writeBag(rows.filter((row) => row.listing_id !== id));
    return;
  }
  const cap = Math.max(1, Math.round(Number(item.onHand) || 1));
  const nextQty = Math.min(cap, availableQty(id, cap) + Number(item.quantity || 0), Math.max(1, quantity));
  const until = Number(item.holdUntil) > Date.now() ? Number(item.holdUntil) : Date.now() + HOLD_MS;
  holdListing(id, nextQty, until);
  writeBag(rows.map((row) => (row.listing_id === id ? { ...row, quantity: nextQty, holdUntil: until } : row)));
};

export const removeBagLine = (id) => {
  clearHold(id);
  writeBag(readBag().filter((row) => row.listing_id !== id));
};
