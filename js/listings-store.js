import { getAuthSession, isCloud, rest, rpc, supabase, uploadMarketPhoto } from "./supabase.js?v=secure1";

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
  sellerUserId: row.seller_id,
  sellerName: row.seller_name || "",
  sellerPhoto: row.seller_photo || "",
  sellerEmail: row.seller_email || "",
  bumped: row.bumped === true,
  posted: true,
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
    const items = Array.isArray(rows) ? rows.filter((row) => !row.removed).map(toItem) : [];
    let faces = {};
    try {
      faces = (await rpc("market_seller_faces")) || {};
    } catch {
      faces = {};
    }
    return items.map((item) => {
      const face = faces[item.sellerUserId] || {};
      const name = String(face.name || item.sellerName || "").trim();
      return {
        ...item,
        sellerName: name,
        sellerPhoto: String(face.photo || item.sellerPhoto || ""),
        sellerEmail: String(face.email || item.sellerEmail || ""),
      };
    });
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

const PORTRAIT_MAX = 400000;

/** Give an SVG data URL a real pixel size so it can be drawn down to a small JPEG. */
const withSvgSize = (raw) => {
  if (!raw.startsWith("data:image/svg")) return raw;
  const comma = raw.indexOf(",");
  if (comma < 0) return raw;
  let body = raw.slice(comma + 1);
  try {
    body = decodeURIComponent(body);
  } catch {
    return raw;
  }
  if (!/<svg\b/i.test(body)) return raw;
  if (!/\swidth=/i.test(body)) body = body.replace(/<svg\b/i, '<svg width="160" height="160"');
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(body)}`;
};

/** A phone photo is far past the portrait cap. Keep a 160px JPEG instead of dropping it. */
const shrinkPortrait = (photo) =>
  new Promise((resolve) => {
    const raw = String(photo || "").trim();
    if (!raw) {
      resolve("");
      return;
    }
    if (!raw.startsWith("data:image")) {
      resolve(raw.length <= PORTRAIT_MAX ? raw : "");
      return;
    }
    const src = withSvgSize(raw);
    const image = new Image();
    image.onload = () => {
      const side = 160;
      const width = image.naturalWidth || 0;
      const height = image.naturalHeight || 0;
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!width || !height || !ctx) {
        resolve(src.length <= PORTRAIT_MAX ? src : "");
        return;
      }
      canvas.width = side;
      canvas.height = side;
      const scale = Math.max(side / width, side / height);
      const dw = width * scale;
      const dh = height * scale;
      ctx.drawImage(image, (side - dw) / 2, (side - dh) / 2, dw, dh);
      let quality = 0.86;
      let url = canvas.toDataURL("image/jpeg", quality);
      while (url.length > PORTRAIT_MAX && quality > 0.4) {
        quality -= 0.12;
        url = canvas.toDataURL("image/jpeg", quality);
      }
      resolve(url.length <= PORTRAIT_MAX ? url : src.length <= PORTRAIT_MAX ? src : "");
    };
    image.onerror = () => resolve(src.length <= PORTRAIT_MAX ? src : raw.length <= PORTRAIT_MAX ? raw : "");
    image.src = src;
  });

export const saveSellerFace = async (name, photo) => {
  if (!isCloud()) return;
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user?.id && !getAuthSession()?.user?.id) return;
  if (!data.session?.user?.id) throw new Error("Sign in before saving a portrait");
  const portrait = await shrinkPortrait(photo);
  if (String(photo || "").trim() && !portrait) throw new Error("Portrait is too large");
  await rpc("market_save_portrait", {
    p_name: String(name || "").trim().slice(0, 80),
    p_photo: portrait,
  });
  if (portrait.startsWith("data:image")) window.dispatchEvent(new Event("immba:listings"));
};

export const bumpCloudListing = async (title, price) => {
  if (!isCloud() || !getAuthSession()?.user?.id) return 0;
  const updated = await rpc("market_bump_listing", {
    p_title: String(title || "").trim(),
    p_price: Number(price) || 0,
  });
  return Number(updated) || 0;
};

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
    bumped: Boolean(input.bumped),
  };
  const saved = await rpc("market_create_listing", { p_row: row });
  return toItem(saved || { ...row, id: `tmp-${Date.now()}` });
};
