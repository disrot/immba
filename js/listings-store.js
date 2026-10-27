import { getAuthSession, isCloud, rest, uploadMarketPhoto } from "./supabase.js?v=notice1";
import { logAudit } from "./audit-store.js?v=audit1";

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
  await Promise.all(
    ids.map((id) =>
      rest(`listings?id=eq.${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: { seller_seen: true },
      })
    )
  );
};

export const removeListing = async (id) => {
  if (!id) throw new Error("Missing listing.");
  try {
    await rest(`listings?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: {
        removed: true,
        seller_seen: false,
        removed_at: new Date().toISOString(),
      },
    });
  } catch {
    await rest(`listings?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
  }
  void logAudit({
    module: "CMS_PAGES",
    action: "DELETE",
    entityType: "listings",
    entityId: id,
    entityLabel: id,
    isDeleted: true,
    newValues: { id, removed: true },
  });
};

export const deleteListing = removeListing;

export const createListing = async (input) => {
  const session = getAuthSession();
  if (!session?.user?.id || (session.role !== "marketplace" && session.intent !== "marketplace")) {
    throw new Error("Sign in as a marketplace seller first.");
  }
  let image_url = input.image_url || "";
  if (input.file) {
    try {
      image_url = await uploadMarketPhoto(input.file, `market-${Date.now()}-${input.file.name}`);
    } catch {
      image_url = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("read"));
        reader.onload = () => resolve(String(reader.result || ""));
        reader.readAsDataURL(input.file);
      });
    }
  }
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
    sold: false,
    removed: false,
    seller_seen: true,
  };
  const saved = await rest("listings", { method: "POST", body: row });
  const created = (saved || [row]).map?.(toItem)?.[0] || toItem({ ...row, id: `tmp-${Date.now()}` });
  void logAudit({
    module: "CMS_PAGES",
    action: "CREATE",
    entityType: "listings",
    entityId: created.id,
    entityLabel: created.title || row.title,
    newValues: { ...row, id: created.id },
  });
  return created;
};
