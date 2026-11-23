import { odo } from "./odometer.js?v=odo3";
import { bindSelectDrop } from "./ui-drop.js?v=drop3";
import { currentProfile } from "./auth.js?v=notice4";
import { createListing } from "./listings-store.js?v=notice3";
import {
  actionText,
  advanceOrder,
  availableQty,
  downloadCsv,
  DELIVERY_FEE,
  money as tradeMoney,
  monthSales,
  purchasedQty,
  sellerOrders,
  sellerProceeds,
  sellerTake,
  setMarketMode,
  setOnHand,
  when,
  marketMode,
} from "./trade.js?v=hold4";
import { statusRail } from "./order-status.js?v=expand1";

const BOOKS_KEY = "immba-seller-books";
const MEETS_KEY = "immba-seller-meetups";

const CATALOG = {
  "9780134891262": {
    title: "International Business Management",
    author: "Charles W. L. Hill",
    edition: "13th edition",
  },
  "9781260565799": {
    title: "Strategic Management",
    author: "Frank T. Rothaermel",
    edition: "5th edition",
  },
  "9780134731889": {
    title: "Marketing Management",
    author: "Philip Kotler",
    edition: "15th edition",
  },
  "9780134472133": {
    title: "Financial Management",
    author: "Raymond Brooks",
    edition: "4th edition",
  },
};

const esc = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const zh = () => document.body?.dataset.lang === "zh";
const t = (en, tw) => (zh() ? tw : en);

const readJson = (key, fallback) => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "null");
    return value ?? fallback;
  } catch {
    return fallback;
  }
};

const books = () => readJson(BOOKS_KEY, []);
const saveBooks = (rows) => localStorage.setItem(BOOKS_KEY, JSON.stringify(rows));

const seedMeetups = () => {
  if (localStorage.getItem(MEETS_KEY)) return readJson(MEETS_KEY, []);
  const rows = [
    { id: "m1", buyer: "Lin Wei", title: "Financial Management", place: "Library foyer", when: "Thu 16:30" },
    { id: "m2", buyer: "Sofia Rahman", title: "Business Ethics", place: "LM208-1", when: "Fri 12:10" },
  ];
  localStorage.setItem(MEETS_KEY, JSON.stringify(rows));
  return rows;
};

const isbnDigits = (value) => String(value || "").replace(/[^0-9Xx]/g, "").toUpperCase();

const validIsbn = (value) => {
  const code = isbnDigits(value);
  if (/^\d{13}$/.test(code)) {
    const sum = [...code].reduce((total, digit, index) => total + Number(digit) * (index % 2 ? 3 : 1), 0);
    return sum % 10 === 0;
  }
  if (/^\d{9}[\dX]$/.test(code)) {
    const sum = [...code].reduce((total, digit, index) => total + (digit === "X" ? 10 : Number(digit)) * (10 - index), 0);
    return sum % 11 === 0;
  }
  return false;
};

const lookupBook = (code) =>
  CATALOG[code] || {
    title: `Campus textbook ${code.slice(-4)}`,
    author: "Course reading",
    edition: "Current edition",
    cover: "",
  };

const lookupOpenLibrary = async (code) => {
  const local = lookupBook(code);
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(`https://openlibrary.org/isbn/${encodeURIComponent(code)}.json`, { signal: controller.signal });
    if (!res.ok) return local;
    const data = await res.json();
    let author = local.author;
    const authorKey = data.authors?.[0]?.key;
    if (authorKey) {
      const authorRes = await fetch(`https://openlibrary.org${authorKey}.json`, { signal: controller.signal });
      if (authorRes.ok) author = (await authorRes.json()).name || author;
    }
    const coverId = Array.isArray(data.covers) ? data.covers[0] : 0;
    return {
      title: data.title || local.title,
      author,
      edition: data.publish_date ? String(data.publish_date) : local.edition,
      cover: coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : "",
    };
  } catch {
    return local;
  } finally {
    window.clearTimeout(timer);
  }
};

const PROFILE_KEY = "immba-seller-profile";

const profileEmail = () => currentProfile()?.email || "local";

const readSellerProfile = () => {
  try {
    const all = JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}");
    const row = all[profileEmail()];
    return { name: row?.name || "", photo: row?.photo || "", variant: Number(row?.variant) || 0 };
  } catch {
    return { name: "", photo: "" };
  }
};

const writeSellerProfile = (next) => {
  const email = profileEmail();
  let all = {};
  try {
    all = JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}");
  } catch {
    all = {};
  }
  const saved = {
    name: String(next.name || "").trim(),
    photo: next.photo || "",
    variant: Number(next.variant) || 0,
  };
  all[email] = saved;
  localStorage.setItem(PROFILE_KEY, JSON.stringify(all));
  window.dispatchEvent(new CustomEvent("immba:seller-profile"));
  saveBooks(
    books().map((book) =>
      book.sellerEmail === email || book.sellerEmail === "local"
        ? { ...book, sellerName: saved.name || book.sellerName, sellerPhoto: saved.photo }
        : book
    )
  );
  return saved;
};

const sellerIdentity = () => {
  const profile = readSellerProfile();
  const session = currentProfile();
  const email = session?.email || "";
  const handle = String(session?.display_name || "").trim() || (email ? email.split("@")[0] : "Classmate");
  return {
    name: profile.name || handle,
    photo: profile.photo || "",
  };
};

const ensureSellerName = () => {
  const saved = readSellerProfile();
  if (saved.name) return;
  const name = sellerIdentity().name;
  if (!name || name === "Classmate") return;
  writeSellerProfile({ name, photo: saved.photo });
};

const emptyDraft = () => ({
  id: "",
  isbn: "",
  title: "",
  author: "",
  edition: "",
  course: "",
  professor: "",
  category: "elective",
  description: "",
  condition: "",
  price: "",
  quantity: "1",
  kind: "book",
  firm: true,
  delivery: false,
  bumped: false,
  bumpLocked: false,
  bumpTerms: false,
  photos: [],
  status: "active",
});

let view = "dashboard";
let wizardOn = false;
let step = 1;
let draft = emptyDraft();
let looking = false;

const money = (value) => `NT$${Number(value || 0).toLocaleString(zh() ? "zh-TW" : "en-US")}`;

const navItems = () => {
  const waiting = sellerOrders(currentProfile()?.email || "").filter((order) => order.status === "waiting_payment").length;
  return [
    ["dashboard", t("Desk", "書桌")],
    ["listings", t("Inventory", "庫存")],
    ["orders", t(waiting ? `Orders ${waiting}` : "Orders", waiting ? `訂單 ${waiting}` : "訂單")],
    ["sales", t("Sales", "帳務")],
    ["meetups", t("Meetups", "面交")],
  ];
};

const navIcon = (key) =>
  ({
    dashboard: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="7" height="7" rx="1.4" fill="none" stroke="currentColor" stroke-width="1.7"/><rect x="13" y="4" width="7" height="7" rx="1.4" fill="none" stroke="currentColor" stroke-width="1.7"/><rect x="4" y="13" width="7" height="7" rx="1.4" fill="none" stroke="currentColor" stroke-width="1.7"/><rect x="13" y="13" width="7" height="7" rx="1.4" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>`,
    listings: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5.5h9.2L18 8.2V19H6z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>`,
    orders: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5h8M8 9.5h8M8 14h5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>`,
    sales: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 16.5 9.2 12l3 2.4L19 7.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    meetups: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4.5" y="5.5" width="15" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M8 4.5v3M16 4.5v3M4.5 10h15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>`,
  })[key] || "";

const paintNav = () => {
  const items = navItems()
    .map(
      ([key, label]) =>
        `<button type="button" data-seller-view="${key}" aria-current="${view === key ? "page" : "false"}">${navIcon(key)}<span>${label}</span></button>`
    )
    .join("");
  const side = document.querySelector("[data-seller-nav]");
  const tabs = document.querySelector("[data-seller-tabs]");
  if (side) side.innerHTML = items;
  if (tabs) tabs.innerHTML = items;
};

const metric = (label, value) =>
  `<article class="seller-metric"><p>${esc(label)}</p><strong>${esc(value)}</strong></article>`;

const stockLine = (book) => {
  const hand = Number(book.quantity || 1);
  const bought = purchasedQty(book.id);
  const left = availableQty(book.id, hand);
  return t(
    `Available ${left} · on hand ${hand} · purchased ${bought}`,
    `可售 ${left} · 庫存 ${hand} · 已售 ${bought}`
  );
};

const listingCard = (book) => `<article class="seller-row" data-book="${esc(book.id)}">
  <div class="seller-cover">
    ${book.photos?.[0] ? `<img src="${esc(book.photos[0])}" alt="">` : `<span class="seller-row-fallback"></span>`}
  </div>
  <div>
    <h3>${esc(book.title)}</h3>
    <p>${[book.course, book.professor].filter(Boolean).map(esc).join(" · ")}</p>
    <p class="trade-money">${odo(`book-${book.id}-price`, money(book.price))} · ${t("you receive", "你收到")} ${odo(`book-${book.id}-net`, money(sellerTake(book.price, book.bumped).net))}</p>
    <p>${esc(book.condition)}${book.bumped ? ` · ${t("bumped", "已置頂")}` : ""}${book.delivery ? ` · ${t("delivery", "外送")}` : ""} · ${esc(stockLine(book))}</p>
  </div>
  <div class="seller-row-actions">
    <label>
      <span class="sr-only">${t("Quantity on hand", "現有數量")}</span>
      <input data-stock type="number" min="0" step="1" value="${esc(book.quantity || 1)}">
    </label>
    <label>
      <span class="sr-only">${t("Listing status", "刊登狀態")}</span>
      <select data-status>
        ${["active", "hidden", "pending", "sold"]
          .map((status) => {
            const label =
              status === "active"
                ? t("Active", "刊登中")
                : status === "hidden"
                  ? t("Hidden", "已隱藏")
                  : status === "pending"
                    ? t("Pending", "待面交")
                    : t("Sold", "已售出");
            return `<option value="${status}" ${book.status === status ? "selected" : ""}>${label}</option>`;
          })
          .join("")}
      </select>
    </label>
    <a class="btn btn-ghost" href="list.html?id=${encodeURIComponent(book.id)}">${t("Edit", "編輯")}</a>
    <button type="button" class="btn btn-ghost" data-delete>${t("Remove", "下架")}</button>
  </div>
</article>`;

const orderCard = (order, { act = true } = {}) => {
  const items = (order.items || [])
    .map(
      (item) => `<li>
        ${item.image ? `<img src="${esc(item.image)}" alt="">` : `<span class="seller-row-fallback"></span>`}
        <span>${esc(item.title)} ×${esc(item.qty)}</span>
      </li>`
    )
    .join("");
  const action = actionText(order.status, zh());
  return `<article class="trade-card" data-order="${esc(order.id)}">
    <header>
      <p class="trade-id">${esc(order.id)}</p>
    </header>
    <p>${esc(order.buyer)} · ${esc(when(order.createdAt, zh()))}</p>
    <ul class="trade-items">${items}</ul>
    ${order.status === "expired" ? `<p>${t("Returned to the marketplace", "已退回市集")}</p>` : statusRail(order, zh())}
    <p class="trade-money">${t("Buyer pays", "買家支付")} ${odo(`order-${order.id}-pay`, tradeMoney(order.total, zh()))}${order.sellerNet != null ? ` · ${t("you receive", "你收到")} ${odo(`order-${order.id}-net`, tradeMoney(sellerProceeds(order), zh()))}` : ""}</p>
    ${act && action ? `<button type="button" class="btn btn-primary" data-advance="${esc(order.id)}">${esc(action)}</button>` : ""}
  </article>`;
};

const paintBuyer = (root) => {
  document.querySelector(".shop-account-page .shop-hero-title")?.removeAttribute("hidden");
  document.querySelector(".shop-account-page .shop-kicker")?.removeAttribute("hidden");
  document.querySelector(".shop-account-page .login-lede")?.removeAttribute("hidden");
  document.querySelector("[data-seller-nav]")?.replaceChildren();
  document.querySelector("[data-seller-tabs]")?.replaceChildren();
  const email = currentProfile()?.email || "";
  const rows = sellerOrders(email).filter((order) => order.buyerEmail === email);
  root.innerHTML = `
    <header class="seller-head">
      <div>
        <h2>${t("Your purchases", "我的訂單")}</h2>
        <p>${t("You are in buyer mode. The seller desk stays out of the way until you switch.", "目前是買家模式。切換後才會看到賣方書桌。")}</p>
      </div>
      <p>${t("Use Buyer or Seller above to change mode.", "用上方的「買家」或「賣方」切換。")}</p>
    </header>
    <div class="seller-list">
      ${
        rows.length
          ? rows.map((order) => orderCard(order, { act: false })).join("")
          : `<p class="seller-empty">${t("Orders you place will stay here.", "你下的訂單會留在這裡。")}</p>`
      }
      <p><a href="orders.html">${t("Open order history", "打開訂單紀錄")}</a></p>
    </div>`;
};

const accountLede = () => {
  const lede = document.querySelector("[data-login-lede]");
  if (!lede) return;
  lede.removeAttribute("data-i18n");
  const copy =
    marketMode() !== "seller"
      ? ["Orders you placed with classmates.", "你向同學下的訂單。"]
      : {
          dashboard: ["Your listings, payments, and campus hand-offs.", "你的刊登、待確認的付款，以及校園面交。"],
          listings: ["Books and items you have posted.", "你已經刊登的書和物品。"],
          orders: ["Confirm payment, then mark the hand-off.", "先確認付款，再標示面交。"],
          sales: ["What buyers have paid you.", "買家已經付給你的金額。"],
          meetups: ["Where you meet the buyer.", "你和買家碰面的地方。"],
        }[view] || ["Your seller desk.", "你的賣方書桌。"];
  lede.textContent = t(copy[0], copy[1]);
};

let avatarView = null;
let uploadView = null;
let avatarGen = 0;
let uploadGen = 0;
let profileEditing = false;

const profileSettled = () => {
  const saved = readSellerProfile();
  return Boolean(saved.name && saved.photo);
};

const sellerIdentityCard = () => {
  const saved = readSellerProfile();
  return `<section class="seller-card seller-identity">
    <img src="${esc(saved.photo)}" alt="">
    <div>
      <p>${t("Your name on listings", "刊登上的名字")}</p>
      <strong>${esc(saved.name)}</strong>
    </div>
    <button type="button" class="btn btn-ghost" data-profile-edit>${t("Edit", "編輯")}</button>
  </section>`;
};

const mountSellerAvatar = (root) => {
  avatarView?.unmount();
  avatarView = null;
  const host = root.querySelector("[data-avatar-host]");
  if (!host) return;
  const generation = ++avatarGen;
  const saved = readSellerProfile();
  const zhOn = zh();
  void import("../src/mount-avatar.tsx").then(({ mountAvatarPicker, faceDataUrl }) => {
    if (generation !== avatarGen || !host.isConnected) return;
    avatarView = mountAvatarPicker(host, {
      defaultValue: {
        displayName: saved.name || sellerIdentity().name,
        variant: saved.variant,
      },
      title: zhOn ? "刊登上的名字" : "Your name on listings",
      description: zhOn
        ? "轉動頭像。買家會在你的刊登上看到這個名字和照片。"
        : "Turn the portrait. Buyers see this name and face on everything you post.",
      submitLabel: zhOn ? "儲存" : "Save",
      onComplete: async (value) => {
        const photo = await faceDataUrl(value);
        if (!photo || !value.displayName) return;
        writeSellerProfile({ name: value.displayName, photo, variant: value.variant });
        profileEditing = false;
        paintHub();
      },
    });
  });
};

const mountListingPhotos = (root) => {
  uploadView?.unmount();
  uploadView = null;
  const host = root.querySelector("[data-file-upload]");
  const room = 4 - draft.photos.length;
  if (!host || room <= 0) return;
  const generation = ++uploadGen;
  const added = new Map();
  void import("../src/mount-file-upload.tsx").then(({ mountFileUpload }) => {
    if (generation !== uploadGen || !host.isConnected) return;
    uploadView = mountFileUpload(host, {
      acceptedFileTypes: ["image/*"],
      maxFileSize: 2 * 1024 * 1024,
      maxFiles: room,
      multiple: true,
      onUpload: (file, { onProgress }) =>
        new Promise((resolve, reject) => {
          onProgress(35);
          const reader = new FileReader();
          reader.onerror = () => reject(new Error(t("Could not read that photo.", "讀不到這張照片。")));
          reader.onload = () => {
            const url = String(reader.result || "");
            if (!url || draft.photos.length >= 4) {
              reject(new Error(t("Up to 4 photos.", "最多 4 張。")));
              return;
            }
            draft.photos.push(url);
            added.set(file, url);
            onProgress(100);
            const strip = root.querySelector(".wizard-photos");
            const figure = document.createElement("figure");
            const image = document.createElement("img");
            image.src = url;
            image.alt = "";
            const remove = document.createElement("button");
            remove.type = "button";
            remove.setAttribute("data-remove-photo", String(draft.photos.length - 1));
            remove.setAttribute("aria-label", t("Remove photo", "移除照片"));
            remove.textContent = "×";
            figure.append(image, remove);
            strip?.append(figure);
            resolve();
          };
          reader.readAsDataURL(file);
        }),
      onFileRemove: (file) => {
        const url = added.get(file);
        if (!url) return;
        const index = draft.photos.indexOf(url);
        if (index >= 0) draft.photos.splice(index, 1);
        window.setTimeout(() => paintWizard(), 0);
      },
    });
  });
};

const paintHub = () => {
  const root = document.querySelector("[data-seller-main]");
  if (!root || wizardOn) return;
  accountLede();
  if (marketMode() !== "seller") {
    paintBuyer(root);
    return;
  }
  paintNav();
  ensureSellerName();
  const rows = books();
  const active = rows.filter((book) => book.status === "active");
  const orders = sellerOrders(currentProfile()?.email || "");
  const pendingPay = orders.filter((order) => order.status === "waiting_payment");
  const waitingShip = orders.filter((order) => order.status === "payment_confirmed" || order.status === "ready_to_ship");
  const completed = orders.filter((order) => order.status === "completed");
  const meetups = seedMeetups();

  avatarView?.unmount();
  avatarView = null;
  if (view === "dashboard") {
    const settled = profileSettled() && !profileEditing;
    const pageTitle = document.querySelector(".shop-account-page .shop-hero-title");
    const pageKicker = document.querySelector(".shop-account-page .shop-kicker");
    const pageLede = document.querySelector(".shop-account-page .login-lede");
    pageTitle?.setAttribute("hidden", "");
    pageKicker?.setAttribute("hidden", "");
    pageLede?.setAttribute("hidden", "");
    const showPicker = !settled || profileEditing;
    root.innerHTML = `
      <header class="seller-head">
        <div>
          <h2>${t("Seller desk", "賣方書桌")}</h2>
          <p>${t("Track inventory, confirm payments, and manage campus hand-offs.", "看庫存、確認付款，並安排校園面交。")}</p>
        </div>
        <a class="btn btn-primary" href="list.html">${t("Create listing", "建立刊登")}</a>
      </header>
      <div class="seller-metrics">
        <button type="button" class="seller-metric" data-seller-view="listings"><p>${t("Active listings", "刊登中")}</p><strong>${esc(String(active.length))}</strong></button>
        <button type="button" class="seller-metric" data-seller-view="sales"><p>${t("Earned this month", "本月實收")}</p><strong>${esc(money(monthSales(orders)))}</strong></button>
        <button type="button" class="seller-metric${pendingPay.length ? " is-hot" : ""}" data-seller-view="orders"><p>${t("Payments to confirm", "待確認付款")}</p><strong>${esc(String(pendingPay.length))}</strong></button>
        <button type="button" class="seller-metric" data-seller-view="meetups"><p>${t("Waiting for hand-off", "待面交")}</p><strong>${esc(String(waitingShip.length))}</strong></button>
      </div>
      <div class="seller-split">
        <section class="seller-card">
          <h3>${t("Next campus hand-off", "下一場面交")}</h3>
          ${meetups[0] ? `<p><strong>${esc(meetups[0].buyer)}</strong> · ${esc(meetups[0].title)}</p><p>${esc(meetups[0].place)} · ${esc(meetups[0].when)}</p>` : `<p>${t("No meetups yet.", "還沒有面交。")}</p>`}
        </section>
        ${settled ? sellerIdentityCard() : `<section class="seller-card"><p>${t("Add the name and portrait buyers see.", "加上買家會看到的名字和頭像。")}</p><button type="button" class="btn btn-primary" data-profile-edit>${t("Customize portrait and name", "設定頭像與名字")}</button></section>`}
      </div>
      ${showPicker ? `<dialog class="seller-dialog portrait-dialog" data-portrait><div class="portrait-card"><form method="dialog"><button class="shop-close" value="cancel" data-portrait-close aria-label="${t("Close", "關閉")}">×</button></form><div class="kokonut-surface" data-avatar-host></div></div></dialog>` : ""}
    `;
    if (showPicker) {
      root.querySelector("[data-portrait]")?.showModal();
      mountSellerAvatar(root);
    }
    return;
  }

  if (view === "listings") {
    const shown = rows.filter((book) => book.status !== "sold");
    const sold = rows.filter((book) => book.status === "sold");
    root.innerHTML = `
      <header class="seller-head">
        <div>
          <h2>${t("Inventory", "庫存")}</h2>
          <p>${t("Available stock is on hand minus purchased quantity.", "可售數量是現有庫存減去已購買數量。")}</p>
        </div>
        <a class="btn btn-primary" href="list.html">${t("Create listing", "建立刊登")}</a>
      </header>
      <div class="seller-list">${shown.length ? shown.map(listingCard).join("") : `<div class="seller-empty-card"><h3>${t("No textbooks on your shelf yet", "書架上還沒有書")}</h3><p>${t("Scan or type an ISBN to fill the title, author, and cover.", "輸入 ISBN，就會帶入書名、作者和書封。")}</p><a class="btn btn-primary" href="list.html">${t("Create your first listing", "建立第一則刊登")}</a></div>`}</div>
      <h3 class="seller-subhead">${t("Sold listings", "已售出的刊登")}</h3>
      <div class="seller-list">${sold.length ? sold.map(listingCard).join("") : `<p class="seller-empty">${t("Sold books stay here as a record.", "售出的書會留在這裡。")}</p>`}</div>`;
    return;
  }

  if (view === "orders") {
    const pay = orders.filter((order) => order.status === "waiting_payment");
    const ship = orders.filter((order) => order.status === "payment_confirmed" || order.status === "ready_to_ship" || order.status === "shipped");
    const done = orders.filter((order) => order.status === "completed");
    const block = (key, title, list) =>
      `<section class="seller-card" data-order-panel="${key}" ${key === "pay" ? "" : "hidden"}><h3>${title}</h3><div class="seller-list">${list.length ? list.map(orderCard).join("") : `<p class="seller-empty">${t("All caught up.", "目前都處理完了。")}</p>`}</div></section>`;
    root.innerHTML = `
      <header class="seller-head"><h2>${t("Orders to process", "待處理訂單")}</h2></header>
      <div class="seller-order-tabs" role="tablist">
        <button type="button" data-order-tab="pay" aria-selected="true">${t("Payments to confirm", "待確認付款")} (${pay.length})</button>
        <button type="button" data-order-tab="ship" aria-selected="false">${t("Ready for hand-off", "待面交")} (${ship.length})</button>
        <button type="button" data-order-tab="done" aria-selected="false">${t("Completed", "已完成")} (${done.length})</button>
      </div>
      ${block("pay", t("Payments to confirm", "待確認付款"), pay)}
      ${block("ship", t("Ready for hand-off", "待面交"), ship)}
      ${block("done", t("Completed", "已完成"), done)}`;
    return;
  }

  if (view === "sales") {
    root.innerHTML = `
      <header class="seller-head">
        <div>
          <h2>${t("Sales records", "銷售紀錄")}</h2>
          <p>${t("Completed orders are kept. Nothing here is deleted.", "完成的訂單會保留，不會刪除。")}</p>
        </div>
        <button type="button" class="btn btn-ghost" data-csv>${t("Download CSV", "下載 CSV")}</button>
      </header>
      <div class="seller-metrics">
        ${metric(t("You receive this month", "本月實收"), money(monthSales(orders)))}
        ${metric(t("Completed orders", "已完成訂單"), String(completed.length))}
        ${metric(t("Pending payments", "待確認付款"), String(pendingPay.length))}
        ${metric(t("Waiting for hand-off", "待面交"), String(waitingShip.length))}
      </div>
      <div class="seller-list">${orders.length ? orders.map(orderCard).join("") : `<p class="seller-empty">${t("Sales appear after a buyer places an order.", "買家下單後，紀錄會出現在這裡。")}</p>`}</div>`;
    return;
  }

  if (view === "meetups") {
    root.innerHTML = `
      <header class="seller-head"><h2>${t("Meetups", "面交")}</h2></header>
      <div class="seller-list">
        ${meetups
          .map(
            (row) => `<article class="seller-card seller-meet">
              <div>
                <h3>${esc(row.buyer)}</h3>
                <p>${esc(row.title)}</p>
                <p>${esc(row.place)} · ${esc(row.when)}</p>
              </div>
              <a class="btn btn-primary" href="mailto:imMBA@mail.fju.edu.tw?subject=${encodeURIComponent(`Meetup: ${row.title}`)}">${t("Message", "傳訊息")}</a>
            </article>`
          )
          .join("")}
      </div>`;
    return;
  }

  root.innerHTML = `
    <header class="seller-head"><h2>${t("Meetups", "面交")}</h2></header>
    <p class="seller-empty">${t("No meetups yet.", "還沒有面交。")}</p>`;
};

const stepReady = () => {
  if (step === 1) {
    if (draft.kind === "item") return draft.title.trim().length > 0;
    return validIsbn(draft.isbn) && draft.title.trim() && draft.course.trim() && draft.professor.trim();
  }
  if (step === 2) {
    const priced = draft.condition && draft.category && draft.price !== "" && Number(draft.price) >= 0 && Number(draft.quantity) >= 1;
    return priced && (!draft.bumped || draft.bumpTerms);
  }
  return true;
};

const recommendPrice = (isbn, condition) => {
  const anchors = {
    "9780134891262": 450,
    "9781260565799": 380,
    "9780134731889": 340,
    "9780134472133": 310,
  };
  const factor = { New: 1.35, "Like New": 1.15, Good: 1, Fair: 0.7, Worn: 0.5 };
  const anchor = anchors[isbnDigits(isbn)] || 300;
  const scale = factor[condition] || 1;
  return Math.max(10, Math.round((anchor * scale) / 10) * 10);
};

const conditionLabel = () => {
  const labels = {
    New: ["New", "全新"],
    "Like New": ["Like New", "近全新"],
    Good: ["Good", "良好"],
    Fair: ["Fair", "普通"],
    Worn: ["Worn", "有使用痕跡"],
  };
  const pair = labels[draft.condition];
  return pair ? t(pair[0], pair[1]) : t("typical", "一般");
};

const priceGuide = () => {
  const price = draft.price === "" ? 0 : Number(draft.price) || 0;
  const net = sellerTake(price, draft.bumped).net;
  const rate = draft.bumped ? "10%" : "4%";
  const each = draft.kind === "item" ? t("each.", "一件。") : t("per book.", "一本。");
  const receive =
    draft.price === ""
      ? t(`Type a price to see what you keep after the ${rate} fee.`, `輸入價格後，會顯示扣掉 ${rate} 後你收到的金額。`)
      : `${t(`After the ${rate} fee you receive`, `扣掉 ${rate} 後你收到`)} <strong class="trade-money" data-receive>${odo("seller-receive", money(net))}</strong> ${each}`;
  const suggestion =
    draft.kind === "item"
      ? ""
      : `<p>${t(`A ${conditionLabel()} copy usually sells around ${money(recommendPrice(draft.isbn, draft.condition))}.`, `${conditionLabel()}通常賣在 ${money(recommendPrice(draft.isbn, draft.condition))} 左右。`)}</p>
    <button type="button" data-use-suggest>${t("Use this price", "用這個價格")}</button>`;
  return `<div class="fee-box" data-price-guide>
    ${suggestion}
    <p>${receive}</p>
    <p>${draft.delivery ? t(`Buyers also pay ${money(DELIVERY_FEE)} if they keep delivery.`, `買家若保留外送，另付 ${money(DELIVERY_FEE)}。`) : t("Campus pickup has no delivery fee.", "校園面交不收外送費。")}</p>
  </div>`;
};

const bumpMark = () =>
  `<span class="shop-bump" aria-label="${t("Bumped", "已置頂")}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2.2 4.6 13.4h6.1l-.9 8.4 9.6-12.6h-6.3z" fill="currentColor"/></svg></span>`;

const previewCard = () => `<article class="shop-card seller-preview">
  <div class="shop-cover">${draft.bumped ? bumpMark() : ""}${draft.course ? `<span class="shop-code">${esc(draft.course)}</span>` : ""}${draft.photos[0] ? `<img src="${esc(draft.photos[0])}" alt="">` : `<span class="shop-cover-empty"></span>`}</div>
  <div class="shop-card-body">
    <div class="shop-card-titleline"><h2>${esc(draft.title || t("Title", "書名"))}</h2><p class="shop-price-row">${draft.price === "" ? "NT$" : money(draft.price)}</p></div>
    <p class="shop-meta"><span class="shop-cond">${esc(draft.condition ? conditionLabel() : t("Condition", "書況"))}</span></p>
  </div>
</article>`;

const choiceRow = (field, checked, title, detail = "") => `<label class="choice-row">
  <input data-field="${field}" type="checkbox" ${checked ? "checked" : ""}>
  <span><b>${title}</b>${detail ? `<small>${detail}</small>` : ""}</span>
</label>`;

const bookStep = () => `<section class="wizard-step ${step === 1 ? "is-on" : ""}">
  <label>${t("ISBN", "ISBN")}
    <input data-field="isbn" value="${esc(draft.isbn)}" inputmode="numeric" autocomplete="off" placeholder="9780134891262">
  </label>
  <p class="wizard-note" data-isbn-note>${looking ? t("Looking up that ISBN…", "正在查詢 ISBN…") : t("A valid ISBN fills the title, author, and edition.", "有效的 ISBN 會帶入書名、作者與版次。")}</p>
  <p class="not-book"><a href="list.html?kind=item">${t("Not a book?", "不是書？")}</a></p>
  <label>${t("Title", "書名")}<input data-field="title" value="${esc(draft.title)}"></label>
  <div class="wizard-split">
    <label>${t("Author", "作者")}<input data-field="author" value="${esc(draft.author)}"></label>
    <label>${t("Edition", "版次")}<input data-field="edition" value="${esc(draft.edition)}"></label>
  </div>
  <div class="wizard-split">
    <label>${t("Course code", "課程代碼")}<input data-field="course" value="${esc(draft.course)}" placeholder="IBM 501"></label>
    <label>${t("Professor", "授課教師")}<input data-field="professor" value="${esc(draft.professor)}"></label>
  </div>
</section>`;

const itemStep = () => `<section class="wizard-step ${step === 1 ? "is-on" : ""}">
  <label>${t("Item name", "物品名稱")}<input data-field="title" value="${esc(draft.title)}" placeholder="${t("Calculator, case, notes pack", "計算機、盒子、筆記包")}"></label>
  <p class="wizard-note">${t("This listing has no ISBN. Add a photo and a price on the next steps.", "這則刊登沒有 ISBN。接下來加上照片和價格。")}</p>
  <p class="not-book"><a href="list.html">${t("This is a book", "這是一本書")}</a></p>
  <label>${t("Course code", "課程代碼")}<input data-field="course" value="${esc(draft.course)}" placeholder="IBM 501"></label>
</section>`;

const conditionPills = () =>
  [
    ["New", "全新"],
    ["Like New", "近全新"],
    ["Good", "良好"],
    ["Fair", "普通"],
    ["Worn", "有使用痕跡"],
  ]
    .map(
      ([en, tw]) =>
        `<button type="button" data-set-condition="${en}" aria-pressed="${draft.condition === en ? "true" : "false"}">${t(en, tw)}</button>`
    )
    .join("");

const switchRow = (field, checked, title, detail, { locked = false } = {}) => `<label class="switch-row">
  <span><b>${title}</b>${detail ? `<small>${detail}</small>` : ""}</span>
  <input data-field="${field}" type="checkbox" ${checked ? "checked" : ""} ${locked ? "disabled" : ""}>
</label>`;

const paintWizard = () => {
  const root = document.querySelector("[data-list-wizard]");
  if (!root) return;
  const heading = document.querySelector("[data-list-title]");
  if (heading) heading.textContent = t("List your item", "刊登你的物品");
  const lede = document.querySelector(".shop-mast .shop-lede");
  if (lede && !lede.hasAttribute("data-list-gate")) {
    lede.textContent = t("Add photos, set a price, and choose how it changes hands.", "加上照片、定價，並選擇怎麼交給對方。");
  }
  const bumpNote = draft.bumpLocked
    ? `<p class="wizard-note">${t("This listing stays bumped. The 10% fee cannot be turned off.", "這則刊登會一直置頂。10% 的手續費不能取消。")}</p>`
    : draft.bumped
      ? `<div class="fee-box bump-tos">
          <p><strong>${t("Bump terms", "置頂條款")}</strong></p>
          <p>${t("Once you bump, the listing stays first and the bolt stays on the cover. Each sale takes 10% instead of 4%. This cannot be undone.", "一旦置頂，這則刊登會一直排在最前面，封面也會留下閃電。每售出一件收 10%，不是 4%。不能取消。")}</p>
          ${choiceRow("bumpTerms", draft.bumpTerms, t("I agree to the 10% bump fee", "我同意 10% 的置頂手續費"))}
        </div>`
      : "";
  root.innerHTML = `
    <div class="list-sheet">
      <div class="list-col">
        <h2>${t("Add photos", "加入照片")}</h2>
        <div class="kokonut-surface" data-file-upload></div>
        <p class="wizard-note">${t("Add a real cover if you have one. A valid ISBN can fetch the cover. Up to 4 photos.", "有書封就上傳。有效的 ISBN 也能帶入書封。最多 4 張。")}</p>
        <div class="wizard-photos">
          ${draft.photos.map((src, index) => `<figure><img src="${esc(src)}" alt=""><button type="button" data-remove-photo="${index}" aria-label="${t("Remove photo", "移除照片")}">×</button>${index === 0 ? `<span>${t("Cover", "封面")}</span>` : ""}</figure>`).join("")}
        </div>
        <h2>${t("Live preview", "即時預覽")}</h2>
        ${previewCard()}
        ${
          draft.kind === "item"
            ? `<p class="wizard-note">${t("This listing has no ISBN.", "這則刊登沒有 ISBN。")} <a href="list.html">${t("This is a book", "這是一本書")}</a></p>`
            : ""
        }
      </div>
      <div class="list-col">
        ${
          draft.kind === "item"
            ? ""
            : `<section class="list-id">
                <label>${t("ISBN", "ISBN")}
                  <input data-field="isbn" value="${esc(draft.isbn)}" inputmode="numeric" autocomplete="off" placeholder="9780134891262">
                </label>
                <p class="wizard-note" data-isbn-note>${looking ? t("Looking up that ISBN…", "正在查詢 ISBN…") : t("A valid ISBN fills the title, author, and edition, and adds a cover if you have not uploaded one.", "有效的 ISBN 會帶入書名、作者、版次；若你還沒上傳照片，也會加上書封。")}</p>
                <div class="wizard-split">
                  <label>${t("Author", "作者")}<input data-field="author" value="${esc(draft.author)}"></label>
                  <label>${t("Edition", "版次")}<input data-field="edition" value="${esc(draft.edition)}"></label>
                </div>
                <p class="not-book"><a href="list.html?kind=item">${t("Not a book?", "不是書？")}</a></p>
              </section>`
        }
        <label>${draft.kind === "item" ? t("Item name", "物品名稱") : t("Title", "書名")}
          <input data-field="title" value="${esc(draft.title)}" placeholder="${draft.kind === "item" ? t("Calculator, case, notes pack", "計算機、盒子、筆記包") : ""}">
        </label>
        <div class="wizard-split">
          <label>${t("Course code", "課程代碼")}<input data-field="course" value="${esc(draft.course)}" placeholder="IBM 501"></label>
          ${draft.kind === "item" ? "" : `<label>${t("Professor", "授課教師")}<input data-field="professor" value="${esc(draft.professor)}"></label>`}
        </div>
        <label>${t("Category", "分類")}
          <select data-field="category">
            ${[
              ["core", "Core", "核心課程"],
              ["elective", "Elective", "選修"],
              ["spotlight", "Spotlight", "焦點課程"],
            ]
              .map(([value, en, tw]) => `<option value="${value}" ${draft.category === value ? "selected" : ""}>${t(en, tw)}</option>`)
              .join("")}
          </select>
        </label>
        <div class="cond-pills" role="group" aria-label="${t("Condition", "書況")}">
          <p>${t("Condition", "書況")}</p>
          <div>${conditionPills()}</div>
          <p class="wizard-note">${draft.condition === "New" ? t("Unread. No marks.", "未讀過，沒有筆跡。") : draft.condition === "Like New" ? t("Read once. Almost no wear.", "讀過一次，幾乎沒有磨損。") : draft.condition === "Good" ? t("Light notes or wear. Complete.", "有輕微筆記或磨損，內容完整。") : draft.condition === "Fair" ? t("Visible wear. Still usable.", "看得出使用痕跡，仍可使用。") : draft.condition === "Worn" ? t("Heavy notes or damage. Say so in the description.", "筆記或損傷較多，請在說明裡寫清楚。") : t("Pick the closest condition.", "選最接近的書況。")}</p>
        </div>
        <label>${t("Description", "說明")}
          <textarea data-field="description" rows="4">${esc(draft.description)}</textarea>
        </label>
        <div class="price-row">
          <label>${t("Price (NT$)", "價格（新台幣）")}
            <input data-field="price" type="number" min="0" step="1" value="${esc(draft.price)}">
          </label>
          <label>${t("Quantity", "數量")}
            <input data-field="quantity" type="number" min="1" step="1" value="${esc(draft.quantity)}">
          </label>
        </div>
        ${priceGuide()}
        <label class="switch-row">
          <span><b>${t("Negotiable", "可議價")}</b><small>${t("Buyers can ask for another price.", "買家可以提出別的價格。")}</small></span>
          <input data-offer type="checkbox" ${draft.firm ? "" : "checked"}>
        </label>
        ${switchRow("delivery", draft.delivery, t("Offer delivery", "提供外送"), t(`Buyer pays ${money(DELIVERY_FEE)}.`, `買家另付 ${money(DELIVERY_FEE)}。`))}
        ${switchRow("bumped", draft.bumped, t("Bump this listing", "置頂這則刊登"), t("Shown first. The fee becomes 10%, and it cannot be turned off.", "排在最前面。手續費改為 10%，而且不能取消。"), { locked: draft.bumped })}
        ${bumpNote}
      </div>
    </div>
    <p class="wizard-status" data-wizard-status></p>
    <div class="wizard-actions">
      <button type="button" class="btn btn-ghost" data-wizard-cancel>${t("Cancel", "取消")}</button>
      <button type="button" class="btn btn-primary" data-wizard-publish ${!draft.bumped || draft.bumpTerms ? "" : "disabled"}>${t("Post listing", "刊登")}</button>
    </div>`;
  mountListingPhotos(root);
  root.querySelectorAll("select").forEach((select) => bindSelectDrop(select));
};

const showWizard = (book) => {
  draft = book ? { ...emptyDraft(), ...book, photos: [...(book.photos || [])] } : emptyDraft();
  draft.bumpLocked = Boolean(book?.bumped);
  if (draft.bumpLocked) {
    draft.bumped = true;
    draft.bumpTerms = true;
  }
  step = 1;
  wizardOn = true;
  document.querySelector("[data-seller-hub]")?.setAttribute("hidden", "");
  const wizard = document.querySelector("[data-list-wizard]");
  if (wizard) wizard.hidden = false;
  paintWizard();
};

const showHub = (next = view) => {
  view = next;
  wizardOn = false;
  document.querySelector("[data-seller-hub]")?.removeAttribute("hidden");
  const wizard = document.querySelector("[data-list-wizard]");
  if (wizard) wizard.hidden = true;
  paintHub();
};

const readFields = () => {
  document.querySelectorAll("[data-list-wizard] [data-field]").forEach((field) => {
    const key = field.getAttribute("data-field");
    draft[key] = field.type === "checkbox" ? field.checked : field.value;
  });
};

const paintPriceGuide = () => {
  document.querySelectorAll("[data-price-guide]").forEach((box) => {
    box.outerHTML = priceGuide();
  });
};

const addPhotos = async (files) => {
  const room = 4 - draft.photos.length;
  const next = [...files].slice(0, room);
  for (const file of next) {
    if (!file.type.startsWith("image/") || file.size > 2 * 1024 * 1024) continue;
    const url = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.readAsDataURL(file);
    });
    if (url) draft.photos.push(url);
  }
  paintWizard();
};

const listingUpload = (work) =>
  new Promise((resolve) => {
    const item = draft.kind === "item";
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const zhOn = zh();
    const price = Math.max(0, Math.round(Number(draft.price) || 0));
    if (!draft.id) draft.id = crypto.randomUUID();
    const steps = [
      {
        id: "save",
        title: item ? t("Saving your item", "正在儲存物品") : t("Saving your listing", "正在儲存刊登"),
        detail: draft.title || t("Untitled", "未命名"),
      },
      { id: "server", title: t("Connecting to the server", "正在連線伺服器"), detail: t("Keeping this page open", "請留在這個頁面") },
      {
        id: "publish",
        title: t("Publishing it on the marketplace", "正在刊登到市集"),
        detail: item ? t("Your item joins the shelf", "物品會出現在市集") : t("Your listing joins the shelf", "刊登會出現在市集"),
      },
    ];
    const gate = document.createElement("div");
    gate.className = "listing-gate transfer-gate";
    gate.setAttribute("role", "dialog");
    gate.setAttribute("aria-modal", "true");
    gate.setAttribute("aria-label", t("Please wait. Uploading your listing.", "請稍候，正在上傳刊登。"));
    gate.innerHTML = `<div data-transfer></div><p class="order-hint">${t("Tap the highlighted line to move on.", "點正在亮的那一行，就會往下。")}</p>`;
    document.body.append(gate);
    document.body.classList.add("is-gated");
    const job = Promise.resolve().then(work).then(
      () => ({ ok: true }),
      (error) => ({ ok: false, error })
    );
    let index = 0;
    let timer = 0;
    let settled = false;
    let view = null;
    const card = (status) => ({
      from: { amount: price, currency: "TWD", symbol: "NT$", bank: t("This desk", "這個書桌") },
      to: {
        amount: price,
        currency: "TWD",
        symbol: "NT$",
        bank: t("Marketplace", "市集"),
        name: draft.title || (item ? t("Your item", "你的物品") : t("Your listing", "你的刊登")),
      },
      rate: 1,
      digits: 0,
      locale: zhOn ? "zh-TW" : "en",
      txnId: `LIST-${String(draft.id).slice(0, 6).toUpperCase()}`,
      status,
      progress: status === "completed" ? steps.length : index,
      steps,
      summary: item
        ? t("Uploading your item and connecting it to the marketplace.", "正在上傳物品並連上市集。")
        : t("Uploading your listing and connecting it to the marketplace.", "正在上傳刊登並連上市集。"),
      note: t("Stay on this page", "請留在這個頁面"),
      labels: {
        processing: t("In progress", "進行中"),
        completed: t("Posted", "已刊登"),
        failed: t("Failed", "失敗"),
      },
      onStepClick: (step) => {
        if (step === index) go(index + 1);
      },
    });
    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      view?.update(card("completed"));
      job.then((result) => {
        window.setTimeout(() => {
          view?.unmount();
          gate.remove();
          document.body.classList.remove("is-gated");
          resolve(result);
        }, reduce ? 80 : 420);
      });
    };
    const go = (next) => {
      if (settled) return;
      window.clearTimeout(timer);
      index = next;
      if (index >= steps.length) {
        finish();
        return;
      }
      view?.update(card("processing"));
      timer = window.setTimeout(() => go(index + 1), reduce ? 220 : 900);
    };
    void import("../src/transfer-gate.tsx")
      .then(({ mountTransfer }) => {
        view = mountTransfer(gate.querySelector("[data-transfer]"), card("processing"));
        go(0);
      })
      .catch(async () => {
        const result = await job;
        gate.remove();
        document.body.classList.remove("is-gated");
        resolve(result);
      });
  });

const publish = async () => {
  const status = document.querySelector("[data-wizard-status]");
  if (draft.bumped && !draft.bumpTerms) {
    if (status) status.textContent = t("Agree to the bump terms before publishing.", "刊登前請先同意置頂條款。");
    return;
  }
  const outcome = await listingUpload(async () => {
  const id = draft.id || crypto.randomUUID();
  const profile = currentProfile();
  const row = {
    ...draft,
    id,
    photos: draft.photos.slice(0, 4),
    price: Number(draft.price) || 0,
    delivery: Boolean(draft.delivery),
    bumped: Boolean(draft.bumpLocked || (draft.bumped && draft.bumpTerms)),
    quantity: Math.max(1, Number(draft.quantity) || 1),
    sellerEmail: profile?.email || "local",
    sellerName: sellerIdentity().name,
    sellerPhoto: sellerIdentity().photo,
  };
  setOnHand(id, row.quantity);
  const rows = books().filter((book) => book.id !== id);
  rows.unshift(row);
  saveBooks(rows);
  try {
    let file;
    if (row.photos[0]) {
      const response = await fetch(row.photos[0]);
      const blob = await response.blob();
      file = new File([blob], "cover.jpg", { type: blob.type || "image/jpeg" });
    }
    await createListing({
      title: row.title,
      title_zh: row.title,
      blurb: row.description || `${row.author} · ${row.edition}. ${row.course}, ${row.professor}. ${row.condition}. ${row.firm ? "Firm price." : "Negotiable."}`,
      blurb_zh: `${row.author} · ${row.edition}。${row.course}，${row.professor}。${row.condition}。`,
      price: row.price,
      kind: row.kind === "item" ? "item" : "book",
      tag: row.category || "elective",
      format:
        row.kind === "item"
          ? `Item · ${row.delivery ? "delivery" : "campus pickup"}`
          : `${row.condition} · ${row.delivery ? "delivery" : "campus pickup"}`,
      file,
    });
    if (status) status.textContent = t("Published to the marketplace.", "已刊登到市集。");
  } catch (error) {
    if (status) {
      status.textContent = t(
        "Saved on this desk. The public shelf will show it after the seller session can upload.",
        "已存在這個書桌。賣方登入可以上傳後，才會出現在市集。"
      );
    }
    console.warn(error);
  }
  });
  if (!outcome.ok && status) {
    status.textContent = t(
      "Saved on this desk. The public shelf will show it after the seller session can upload.",
      "已存在這個書桌。賣方登入可以上傳後，才會出現在市集。"
    );
  }
  window.setTimeout(() => {
    if (document.body.hasAttribute("data-list-page")) location.href = "market-account.html";
    else showHub("listings");
  }, 400);
};

const retireSoldBooks = () => {
  const committed = {};
  for (const order of sellerOrders(currentProfile()?.email || "")) {
    if (order.status === "waiting_payment" || order.status === "expired" || order.status === "placed") continue;
    for (const item of order.items || []) {
      committed[item.id] = (committed[item.id] || 0) + Number(item.qty || 0);
    }
  }
  const next = books().map((book) => {
    if (book.status !== "active") return book;
    if ((committed[book.id] || 0) >= Number(book.quantity || 1)) return { ...book, status: "sold" };
    return book;
  });
  if (next.some((book, index) => book !== books()[index])) saveBooks(next);
};

const onHubClick = (event) => {
  if (event.target.closest("[data-profile-edit]")) {
    profileEditing = true;
    paintHub();
    return;
  }
  if (event.target.closest("[data-portrait-close]")) {
    profileEditing = false;
    if (profileSettled()) paintHub();
    return;
  }
  const orderTab = event.target.closest("[data-order-tab]");
  if (orderTab) {
    const key = orderTab.getAttribute("data-order-tab");
    document.querySelectorAll("[data-order-tab]").forEach((button) => button.setAttribute("aria-selected", button === orderTab ? "true" : "false"));
    document.querySelectorAll("[data-order-panel]").forEach((panel) => {
      panel.hidden = panel.getAttribute("data-order-panel") !== key;
    });
    return;
  }
  const viewButton = event.target.closest("[data-seller-view]");
  if (viewButton && !wizardOn) {
    showHub(viewButton.getAttribute("data-seller-view"));
    return;
  }
  if (event.target.closest("[data-profile-save]")) {
    const name = document.querySelector("[data-profile-name]")?.value || "";
    writeSellerProfile({ ...readSellerProfile(), name });
    paintHub();
    return;
  }
  const mode = event.target.closest("[data-mode]");
  if (mode) {
    setMarketMode(mode.getAttribute("data-mode"));
    showHub("dashboard");
    return;
  }
  const advance = event.target.closest("[data-advance]");
  if (advance) {
    advance.disabled = true;
    advance.classList.add("is-busy");
    advanceOrder(advance.getAttribute("data-advance"));
    retireSoldBooks();
    paintHub();
    return;
  }
  if (event.target.closest("[data-csv]")) {
    downloadCsv("immba-sales.csv", sellerOrders(currentProfile()?.email || ""));
    return;
  }
  const row = event.target.closest("[data-book]");
  if (!row) return;
  const id = row.getAttribute("data-book");
  if (event.target.closest("[data-edit]")) {
    showWizard(books().find((book) => book.id === id));
    return;
  }
  if (event.target.closest("[data-delete]")) {
    saveBooks(books().filter((book) => book.id !== id));
    paintHub();
  }
};

const onHubChange = (event) => {
  const photo = event.target.closest("[data-profile-photo]");
  if (photo?.files?.[0]) {
    const file = photo.files[0];
    if (!file.type.startsWith("image/") || file.size > 2 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = () => {
      writeSellerProfile({ ...readSellerProfile(), photo: String(reader.result || "") });
      paintHub();
    };
    reader.readAsDataURL(file);
    return;
  }
  const select = event.target.closest("[data-status]");
  const row = event.target.closest("[data-book]");
  const stock = event.target.closest("[data-stock]");
  const id = row?.getAttribute("data-book");
  if (stock && id) {
    const quantity = Math.max(0, Number(stock.value) || 0);
    setOnHand(id, quantity);
    saveBooks(books().map((book) => (book.id === id ? { ...book, quantity } : book)));
    paintHub();
    return;
  }
  if (!select || !id) return;
  saveBooks(books().map((book) => (book.id === id ? { ...book, status: select.value } : book)));
  paintHub();
};

const onWizard = async (event) => {
  if (event.target.closest("[data-pick-photos]")) {
    document.querySelector("[data-list-wizard] [data-photos]")?.click();
    return;
  }
  const condition = event.target.closest("[data-set-condition]");
  if (condition) {
    readFields();
    draft.condition = condition.getAttribute("data-set-condition");
    paintWizard();
    return;
  }
  if (event.target.closest("[data-wizard-cancel]")) {
    if (document.body.hasAttribute("data-list-page")) location.href = "market-account.html";
    else showHub("listings");
    return;
  }
  if (event.target.closest("[data-wizard-back]")) {
    readFields();
    step = Math.max(1, step - 1);
    paintWizard();
    return;
  }
  if (event.target.closest("[data-wizard-next]")) {
    readFields();
    if (!stepReady()) return;
    step = Math.min(3, step + 1);
    paintWizard();
    return;
  }
  if (event.target.closest("[data-wizard-publish]")) {
    readFields();
    const ready =
      draft.kind === "item"
        ? draft.title.trim() && draft.condition && Number(draft.quantity) >= 1
        : validIsbn(draft.isbn) && draft.title.trim() && draft.course.trim() && draft.professor.trim() && draft.condition && Number(draft.quantity) >= 1;
    if (!ready) return;
    await publish();
    return;
  }
  if (event.target.closest("[data-use-suggest]")) {
    if (draft.kind === "item") return;
    readFields();
    draft.price = String(recommendPrice(draft.isbn, draft.condition));
    paintWizard();
    return;
  }
  const firm = event.target.closest("[data-firm]");
  if (firm) {
    readFields();
    draft.firm = firm.getAttribute("data-firm") === "1";
    paintWizard();
    return;
  }
  const remove = event.target.closest("[data-remove-photo]");
  if (remove) {
    draft.photos.splice(Number(remove.getAttribute("data-remove-photo")), 1);
    paintWizard();
  }
};

const syncField = (field) => {
  readFields();
  const key = field?.getAttribute("data-field");
  if (key === "bumped") draft.bumped = true;
  if (draft.bumpLocked) draft.bumped = true;
  if (key === "bumped" || key === "bumpTerms") {
    paintWizard();
    return true;
  }
  paintPriceGuide();
  const next = document.querySelector("[data-wizard-next]");
  if (next) next.disabled = !stepReady();
  return false;
};

const onWizardInput = async (event) => {
  const field = event.target.closest("[data-field]");
  if (!field) return;
  if (syncField(field)) return;
  if (draft.kind === "item" || field.getAttribute("data-field") !== "isbn" || looking || !validIsbn(draft.isbn)) return;
  looking = true;
  const note = document.querySelector("[data-isbn-note]");
  if (note) note.textContent = t("Looking up that ISBN…", "正在查詢 ISBN…");
  const code = isbnDigits(draft.isbn);
  await new Promise((resolve) => window.setTimeout(resolve, 650));
  const found = await lookupOpenLibrary(code);
  draft.title = found.title;
  draft.author = found.author;
  draft.edition = found.edition;
  if (found.cover && !draft.photos.length) draft.photos = [found.cover];
  looking = false;
  paintWizard();
};

const onDrop = async (event) => {
  if (event.target.matches?.("[data-offer]")) {
    draft.firm = !event.target.checked;
    paintPriceGuide();
    return;
  }
  const field = event.target.closest("[data-field]");
  if (field) syncField(field);
  const zone = event.target.closest("[data-drop]");
  if (!zone) return;
  if (event.type === "dragover") {
    event.preventDefault();
    zone.classList.add("is-over");
    return;
  }
  if (event.type === "dragleave") {
    zone.classList.remove("is-over");
    return;
  }
  if (event.type === "drop") {
    event.preventDefault();
    zone.classList.remove("is-over");
    await addPhotos(event.dataTransfer?.files || []);
    return;
  }
  if (event.target.matches("[data-photos]") && event.type === "change") {
    await addPhotos(event.target.files || []);
  }
};

let bound = false;

export const initSellerHub = () => {
  if (!document.querySelector("[data-seller-hub], [data-list-wizard]")) return;
  seedMeetups();
  if (!bound) {
    bound = true;
    document.addEventListener("click", (event) => {
      if (event.target.closest("[data-seller-hub], [data-list-wizard]")) void onWizard(event);
      if (event.target.closest("[data-seller-hub]")) onHubClick(event);
    });
    document.addEventListener("change", (event) => {
      if (event.target.closest("[data-seller-hub]")) onHubChange(event);
      if (event.target.closest("[data-list-wizard]")) void onDrop(event);
    });
    document.addEventListener("input", (event) => {
      if (event.target.closest("[data-list-wizard]")) void onWizardInput(event);
    });
    document.addEventListener("dragover", (event) => {
      if (event.target.closest("[data-drop]")) void onDrop(event);
    });
    document.addEventListener("dragleave", (event) => {
      if (event.target.closest("[data-drop]")) void onDrop(event);
    });
    document.addEventListener("drop", (event) => {
      if (event.target.closest("[data-drop]")) void onDrop(event);
    });
    window.addEventListener("immba:lang", () => {
      if (wizardOn) paintWizard();
      else paintHub();
    });
    window.addEventListener("immba:trade", () => {
      if (!wizardOn) paintHub();
    });
    window.addEventListener("immba:mode", () => {
      if (!wizardOn) paintHub();
    });
  }
    if (document.body.hasAttribute("data-list-page")) {
    const params = new URLSearchParams(location.search);
    const existing = params.get("id") ? books().find((book) => book.id === params.get("id")) : null;
    const starter = !existing && params.get("kind") === "item" ? { kind: "item" } : null;
    showWizard(existing || starter);
    return;
  }
  showHub(view);
};
