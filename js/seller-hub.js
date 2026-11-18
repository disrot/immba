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
  statusText,
  when,
  marketMode,
} from "./trade.js?v=hold1";

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
  };

const PROFILE_KEY = "immba-seller-profile";

const profileEmail = () => currentProfile()?.email || "local";

const readSellerProfile = () => {
  try {
    const all = JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}");
    const row = all[profileEmail()];
    return { name: row?.name || "", photo: row?.photo || "" };
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
  const saved = { name: String(next.name || "").trim(), photo: next.photo || "" };
  all[email] = saved;
  localStorage.setItem(PROFILE_KEY, JSON.stringify(all));
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
  const email = currentProfile()?.email || "";
  return {
    name: profile.name || (email ? email.split("@")[0] : "Classmate"),
    photo: profile.photo || "",
  };
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

const paintNav = () => {
  const items = navItems()
    .map(
      ([key, label]) =>
        `<button type="button" data-seller-view="${key}" aria-current="${view === key ? "page" : "false"}">${label}</button>`
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
    <p class="trade-money">${money(book.price)} · ${t("you receive", "你收到")} ${money(sellerTake(book.price, book.bumped).net)}</p>
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
      <strong>${esc(statusText(order.status, zh()))}</strong>
    </header>
    <p>${esc(order.buyer)} · ${esc(when(order.createdAt, zh()))}</p>
    <ul class="trade-items">${items}</ul>
    <p class="trade-money">${t("Buyer pays", "買家支付")} ${esc(tradeMoney(order.total, zh()))}${order.sellerNet != null ? ` · ${t("you receive", "你收到")} ${esc(tradeMoney(sellerProceeds(order), zh()))}` : ""}</p>
    ${act && action ? `<button type="button" class="btn btn-primary" data-advance="${esc(order.id)}">${esc(action)}</button>` : ""}
  </article>`;
};

const paintBuyer = (root) => {
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
      <button type="button" class="btn btn-primary" data-mode="seller">${t("Switch to seller", "切換為賣方")}</button>
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

const paintHub = () => {
  const root = document.querySelector("[data-seller-main]");
  if (!root || wizardOn) return;
  if (marketMode() !== "seller") {
    paintBuyer(root);
    return;
  }
  paintNav();
  const rows = books();
  const active = rows.filter((book) => book.status === "active");
  const orders = sellerOrders(currentProfile()?.email || "");
  const pendingPay = orders.filter((order) => order.status === "waiting_payment" || order.status === "payment_confirmed");
  const waitingShip = orders.filter((order) => order.status === "ready_to_ship");
  const completed = orders.filter((order) => order.status === "completed");
  const meetups = seedMeetups();

  if (view === "dashboard") {
    root.innerHTML = `
      <header class="seller-head">
        <div>
          <h2>${t("Seller desk", "賣方書桌")}</h2>
          <p>${t("Inventory, payments to confirm, and books waiting to ship.", "庫存、待確認的付款，以及待出貨的書。")}</p>
        </div>
        <a class="btn btn-primary" href="list.html">${t("Create listing", "建立刊登")}</a>
      </header>
      <section class="seller-card seller-profile">
        <label class="profile-photo">
          ${
            readSellerProfile().photo
              ? `<img src="${esc(readSellerProfile().photo)}" alt="">`
              : `<span>${esc((readSellerProfile().name || t("You", "你")).slice(0, 1).toUpperCase())}</span>`
          }
          <input data-profile-photo type="file" accept="image/*" aria-label="${t("Profile photo", "個人照片")}">
        </label>
        <div>
          <h3>${t("Your name on listings", "刊登上的名字")}</h3>
          <p>${t("Buyers see this name and photo on everything you post.", "買家會在你刊登的商品上看到這個名字和照片。")}</p>
          <div class="profile-name">
            <input data-profile-name type="text" maxlength="40" value="${esc(readSellerProfile().name)}" placeholder="${t("Username", "使用者名稱")}">
            <button type="button" class="btn btn-primary" data-profile-save>${t("Save", "儲存")}</button>
          </div>
        </div>
      </section>
      <div class="seller-metrics">
        ${metric(t("Listed products", "刊登商品"), String(active.length))}
        ${metric(t("You receive this month", "本月實收"), money(monthSales(orders)))}
        ${metric(t("Pending payments", "待確認付款"), String(pendingPay.length))}
        ${metric(t("Waiting to ship", "待出貨"), String(waitingShip.length))}
        ${metric(t("Completed orders", "已完成訂單"), String(completed.length))}
      </div>
      <section class="seller-card">
        <h3>${t("Next hand-off", "下一場面交")}</h3>
        ${meetups[0] ? `<p><strong>${esc(meetups[0].buyer)}</strong> · ${esc(meetups[0].title)}</p><p>${esc(meetups[0].place)} · ${esc(meetups[0].when)}</p>` : `<p>${t("No meetups yet.", "還沒有面交。")}</p>`}
      </section>
      <p><button type="button" class="btn btn-ghost" data-mode="buyer">${t("Switch to buyer", "切換為買家")}</button></p>`;
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
      <div class="seller-list">${shown.length ? shown.map(listingCard).join("") : `<p class="seller-empty">${t("No books on the shelf yet.", "書架上還沒有書。")}</p>`}</div>
      <h3 class="seller-subhead">${t("Sold listings", "已售出的刊登")}</h3>
      <div class="seller-list">${sold.length ? sold.map(listingCard).join("") : `<p class="seller-empty">${t("Sold books stay here as a record.", "售出的書會留在這裡。")}</p>`}</div>`;
    return;
  }

  if (view === "orders") {
    const pay = orders.filter((order) => order.status === "waiting_payment" || order.status === "payment_confirmed");
    const ship = orders.filter((order) => order.status === "ready_to_ship" || order.status === "shipped");
    const done = orders.filter((order) => order.status === "completed");
    const block = (title, list) =>
      `<section class="seller-card"><h3>${title}</h3><div class="seller-list">${list.length ? list.map(orderCard).join("") : `<p class="seller-empty">${t("Nothing in this step.", "這一步目前沒有訂單。")}</p>`}</div></section>`;
    root.innerHTML = `
      <header class="seller-head"><h2>${t("Orders to process", "待處理訂單")}</h2></header>
      ${block(t("Payments to confirm", "待確認付款"), pay)}
      ${block(t("Products to ship", "待出貨"), ship)}
      ${block(t("Completed records", "已完成紀錄"), done)}`;
    return;
  }

  if (view === "sales") {
    root.innerHTML = `
      <header class="seller-head">
        <div>
          <h2>${t("Sales records", "銷售紀錄")}</h2>
          <p>${t("Completed orders are kept. Nothing here is deleted.", "完成的訂單會保留，不會刪除。")}</p>
        </div>
        <button type="button" class="btn btn-primary" data-csv>${t("Download CSV", "下載 CSV")}</button>
      </header>
      <div class="seller-metrics">
        ${metric(t("You receive this month", "本月實收"), money(monthSales(orders)))}
        ${metric(t("Completed orders", "已完成訂單"), String(completed.length))}
        ${metric(t("Pending payments", "待確認付款"), String(pendingPay.length))}
        ${metric(t("Waiting to ship", "待出貨"), String(waitingShip.length))}
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
      : `${t(`After the ${rate} fee you receive`, `扣掉 ${rate} 後你收到`)} <strong class="trade-money" data-receive>${money(net)}</strong> ${each}`;
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
  <div class="shop-cover">${draft.bumped ? bumpMark() : ""}${draft.photos[0] ? `<img src="${esc(draft.photos[0])}" alt="">` : ""}</div>
  <p class="shop-card-kicker">${esc(draft.course || t("Course", "課程"))}</p>
  <h2>${esc(draft.title || t("Title", "書名"))}</h2>
  <p class="shop-price-row">${draft.price === "" ? "NT$" : money(draft.price)}${draft.firm ? "" : ` · ${t("Negotiable", "可議價")}`}</p>
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
        <div class="dropzone" data-drop>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 8.5 9.2 6.8A1.5 1.5 0 0 1 10.5 6h3a1.5 1.5 0 0 1 1.3.8L16 8.5h1.2A1.8 1.8 0 0 1 19 10.3v6.4A1.8 1.8 0 0 1 17.2 18.5H6.8A1.8 1.8 0 0 1 5 16.7v-6.4A1.8 1.8 0 0 1 6.8 8.5H8z" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="13" r="2.4" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>
          <button type="button" class="btn btn-primary" data-pick-photos>${t("+ Upload", "+ 上傳")}</button>
          <p>${t("Drag images here or browse. Up to 4 photos.", "把照片拖到這裡，或按上傳。最多 4 張。")}</p>
          <input data-photos class="sr-only" type="file" accept="image/*" multiple>
        </div>
        <div class="wizard-photos">
          ${draft.photos.map((src, index) => `<figure><img src="${esc(src)}" alt=""><button type="button" data-remove-photo="${index}" aria-label="${t("Remove photo", "移除照片")}">×</button></figure>`).join("")}
        </div>
        ${
          draft.kind === "item"
            ? `<p class="wizard-note">${t("This listing has no ISBN.", "這則刊登沒有 ISBN。")} <a href="list.html">${t("This is a book", "這是一本書")}</a></p>`
            : `<section class="list-id">
                <h2>${t("Book details", "書籍資料")}</h2>
                <label>${t("ISBN", "ISBN")}
                  <input data-field="isbn" value="${esc(draft.isbn)}" inputmode="numeric" autocomplete="off" placeholder="9780134891262">
                </label>
                <p class="wizard-note" data-isbn-note>${looking ? t("Looking up that ISBN…", "正在查詢 ISBN…") : t("A valid ISBN fills the title, author, and edition.", "有效的 ISBN 會帶入書名、作者與版次。")}</p>
                <div class="wizard-split">
                  <label>${t("Author", "作者")}<input data-field="author" value="${esc(draft.author)}"></label>
                  <label>${t("Edition", "版次")}<input data-field="edition" value="${esc(draft.edition)}"></label>
                </div>
                <p class="not-book"><a href="list.html?kind=item">${t("Not a book?", "不是書？")}</a></p>
              </section>`
        }
      </div>
      <div class="list-col">
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
    const steps = [
      item ? t("Saving your item", "正在儲存物品") : t("Saving your listing", "正在儲存刊登"),
      t("Connecting to the server", "正在連線伺服器"),
      t("Publishing it on the marketplace", "正在刊登到市集"),
    ];
    const gate = document.createElement("div");
    gate.className = "listing-gate";
    gate.setAttribute("role", "dialog");
    gate.setAttribute("aria-modal", "true");
    gate.setAttribute("aria-label", t("Please wait. Uploading your listing.", "請稍候，正在上傳刊登。"));
    gate.innerHTML = `
      <div class="listing-gate-card order-receive">
        <img src="images/logo.png" alt="" width="64" height="64">
        <h2>${t("Please wait", "請稍候")}</h2>
        <p>${item ? t("Uploading your item and connecting it to the marketplace.", "正在上傳物品並連上市集。") : t("Uploading your listing and connecting it to the marketplace.", "正在上傳刊登並連上市集。")}</p>
        <div class="order-progress" aria-hidden="true"><i data-order-bar></i></div>
        <p class="order-hint">${t("Stay on this page while we reach the server.", "連線完成前請留在這個頁面。")}</p>
        <ol class="order-steps">
          ${steps
            .map(
              (label, index) => `<li data-order-step="${index}">
                <button type="button" data-order-go="${index}">
                  <span class="step-mark" aria-hidden="true"></span>
                  <span>${label}</span>
                </button>
              </li>`
            )
            .join("")}
        </ol>
      </div>`;
    document.body.append(gate);
    document.body.classList.add("is-gated");
    const bar = gate.querySelector("[data-order-bar]");
    const items = [...gate.querySelectorAll("[data-order-step]")];
    const job = Promise.resolve().then(work).then(
      () => ({ ok: true }),
      (error) => ({ ok: false, error })
    );
    let index = 0;
    let timer = 0;
    let settled = false;
    const paint = () => {
      items.forEach((item, itemIndex) => {
        item.classList.toggle("is-on", itemIndex === index);
        item.classList.toggle("is-done", itemIndex < index);
        const button = item.querySelector("button");
        if (button) button.disabled = itemIndex !== index;
      });
      if (bar) bar.style.width = `${Math.round((index / steps.length) * 100)}%`;
    };
    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      if (bar) bar.style.width = "100%";
      job.then((result) => {
        window.setTimeout(() => {
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
      paint();
      if (index >= steps.length) {
        finish();
        return;
      }
      timer = window.setTimeout(() => go(index + 1), reduce ? 220 : 900);
    };
    gate.addEventListener("click", (event) => {
      const button = event.target.closest("[data-order-go]");
      if (!button || Number(button.getAttribute("data-order-go")) !== index) return;
      go(index + 1);
    });
    go(0);
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
  const found = lookupBook(code);
  draft.title = found.title;
  draft.author = found.author;
  draft.edition = found.edition;
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
