import { getAuthSession, isCloud, rest, uploadMarketPhoto } from "./supabase.js?v=auth3";

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
    const rows = await rest("listings?select=*&order=created_at.desc");
    return Array.isArray(rows) ? rows.map(toItem) : [];
  } catch {
    return [];
  }
};

export const deleteListing = async (id) => {
  if (!id) throw new Error("Missing listing.");
  await rest(`listings?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
};

export const createListing = async (input) => {
  const session = getAuthSession();
  if (!session?.user?.id) throw new Error("Sign in as a marketplace seller first.");
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
  };
  const saved = await rest("listings", { method: "POST", body: row });
  return (saved || [row]).map?.(toItem)?.[0] || toItem({ ...row, id: `tmp-${Date.now()}` });
};
