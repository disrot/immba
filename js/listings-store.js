import { getAuthSession, isCloud, rest, rpc, uploadMarketPhoto } from "./supabase.js?v=secure1";

const toItem = (row) => ({
  id: row.id,
  sku: `USR-${String(row.id).slice(0, 6).toUpperCase()}`,
  image: row.image_url || "images/marketplace/ibm.jpg",
  gallery: [row.image_url || "images/marketplace/ibm.jpg"],
  family: row.id,
  price: Number(row.price) || 0,
  tag: row.tag || "elective",
  kind: row.kind || "book",
  sold: Boolean(row.sold),
  removed: Boolean(row.removed),
  sellerSeen: row.seller_seen !== false,
  sellerId: row.seller_id,
  en: {
    title: row.title,
    format: row.format || (row.kind === "digital" ? "Digital packet" : "Used book · campus pickup"),
    style: "Listing",
    blurb: row.blurb || "",
    details: [row.format || "", row.kind || ""].filter(Boolean),
    pickup: "Arrange with the student seller after you write.",
  },
  zh: {
    title: row.title_zh || row.title,
    format: row.format || (row.kind === "digital" ? "數位教材包" : "二手書 · 校園面交"),
    style: "刊登",
    blurb: row.blurb_zh || row.blurb || "",
    details: [row.format || "", row.kind || ""].filter(Boolean),
    pickup: "與刊登同學約定後面交或寄檔。",
  },
});

export const listCloudListings = async () => {
  if (!isCloud()) return [];
  try {
    let rows;
    try {
      rows = await rest("listings?removed=eq.false&select=*&order=created_at.desc");
    } catch {
      rows = await rest("listings?select=*&order=created_at.desc");
    }
    return Array.isArray(rows) ? rows.filter((row) => !row.removed).map(toItem) : [];
  } catch {
    return [];
  }
};

export const listRemovedNotices = async () => {
  const uid = getAuthSession()?.user?.id;
  if (!isCloud() || !uid) return [];
  try {
    const rows = await rest(
      `listings?seller_id=eq.${uid}&removed=eq.true&seller_seen=eq.false&select=id,title,title_zh,removed_at&order=removed_at.desc`
    );
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
};

export const ackRemovedNotices = async (ids) => {
  if (!ids?.length) return;
  await rpc("market_ack_removed", { p_ids: ids });
};

export const removeListing = async (id) => {
  if (!id) throw new Error("Missing listing.");
  await rpc("office_remove_listing", { p_id: id });
};

export const deleteListing = removeListing;

export const createListing = async (input) => {
  const session = getAuthSession();
  if (!session?.user?.id || (session.role !== "marketplace" && session.intent !== "marketplace")) {
    throw new Error("Sign in as a marketplace seller first.");
  }
  let image_url = input.image_url || "";
  if (input.file) image_url = await uploadMarketPhoto(input.file);
  const row = {
    seller_id: session.user.id,
    title: input.title,
    title_zh: input.title_zh || "",
    blurb: input.blurb || "",
    blurb_zh: input.blurb_zh || "",
    format: input.format || "",
    price: Number(input.price) || 0,
    kind: input.kind || "book",
    tag: input.tag || "elective",
    image_url,
    inventory_on_hand: Number(input.inventory_on_hand) || 1,
  };
  const saved = await rpc("market_create_listing", { p_row: row });
  return toItem(saved || { ...row, id: `tmp-${Date.now()}` });
};
