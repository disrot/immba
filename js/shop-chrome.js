import { currentProfile, isSellerAuthed, logoutAdmin } from "./auth.js?v=lab4";
import { addBagLine, readBag, removeBagLine, setBagQty } from "./bag-store.js?v=lab4";
import { paintBagBadge, shelfItem } from "./marketplace.js?v=lab9";
import { marketMode, setMarketMode } from "./trade.js?v=lab4";

const zh = () => document.body?.dataset.lang === "zh";
const t = (en, tw) => (zh() ? tw : en);

const money = (value) => `NT$${Number(value || 0).toLocaleString(zh() ? "zh-TW" : "en-US")}`;

export const shopToast = (message, extra = {}) => {
  if (!message) return;
  window.dispatchEvent(new CustomEvent("immba:toast", { detail: { message, ...extra } }));
};

const bagCount = () => readBag().reduce((sum, row) => sum + Math.max(0, Number(row.quantity) || 0), 0);

const paintDrawer = () => {
  const body = document.querySelector("[data-bag-sheet-body]");
  const count = document.querySelector("[data-bag-sheet-count]");
  const rows = readBag().filter((row) => !row.holdUntil || Number(row.holdUntil) > Date.now());
  if (count) count.textContent = t(`${rows.length} ${rows.length === 1 ? "item" : "items"}`, `${rows.length} 件`);
  if (!body) return;
  if (!rows.length) {
    body.innerHTML = `<p class="shop-sheet-empty">${t("Your bag is empty.", "袋子是空的。")}</p>`;
    return;
  }
  body.innerHTML = rows
    .map((row) => {
      const qty = Number(row.quantity) || 1;
      const line = (Number(row.unit_amount) || 0) * qty;
      return `<article class="shop-sheet-row">
        ${row.image ? `<img src="${row.image}" alt="">` : `<span class="shop-sheet-fallback"></span>`}
        <div>
          <p>${row.title}</p>
          <p>${money(row.unit_amount)}</p>
          <div class="shop-stepper">
            <button type="button" data-bag-step="-1" data-id="${row.listing_id}" aria-label="${t("Decrease quantity", "減少數量")}">−</button>
            <span>${qty}</span>
            <button type="button" data-bag-step="1" data-id="${row.listing_id}" aria-label="${t("Increase quantity", "增加數量")}">+</button>
            <button type="button" data-bag-drop="${row.listing_id}" aria-label="${t("Remove", "移除")}">×</button>
          </div>
        </div>
        <strong>${money(line)}</strong>
      </article>`;
    })
    .join("");
};

const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let bagClosing = false;

const openBag = () => {
  paintDrawer();
  const sheet = document.querySelector("[data-bag-sheet]");
  if (!sheet) return;
  bagClosing = false;
  sheet.classList.remove("is-shown");
  if (!sheet.open) sheet.showModal();
  if (reduceMotion()) {
    sheet.classList.add("is-shown");
    return;
  }
  requestAnimationFrame(() => {
    requestAnimationFrame(() => sheet.classList.add("is-shown"));
  });
};

const closeBag = () => {
  const sheet = document.querySelector("[data-bag-sheet]");
  if (!sheet?.open || bagClosing) return;
  if (reduceMotion()) {
    sheet.classList.remove("is-shown");
    sheet.close();
    return;
  }
  bagClosing = true;
  sheet.classList.remove("is-shown");
  const finish = () => {
    if (!bagClosing) return;
    bagClosing = false;
    sheet.removeEventListener("transitionend", onEnd);
    if (sheet.open) sheet.close();
  };
  const onEnd = (event) => {
    if (event.target !== sheet || event.propertyName !== "transform") return;
    finish();
  };
  sheet.addEventListener("transitionend", onEnd);
  window.setTimeout(finish, 520);
};

const addQuick = (id) => {
  const item = shelfItem(id);
  if (!item) return;
  const copy = item[zh() ? "zh" : "en"] || item.en || {};
  try {
    const previous = readBag().find((row) => row.listing_id === item.id) || null;
    const title = copy.title || item.en?.title || "Textbook";
    addBagLine({
      id: item.id,
      title,
      unit: item.price,
      image: item.image,
      onHand: item.quantity || item.onHand || 3,
      sellerId: item.sellerId,
      sellerEmail: item.sellerEmail,
      sellerUserId: item.sellerUserId,
      sellerName: item.sellerName || "imMBA shelf",
      posted: Boolean(item.posted),
      generated: !item.posted,
      delivery: Boolean(item.delivery),
      bumped: Boolean(item.bumped),
      qty: 1,
    });
    shopToast(t("Added to bag", "已加入袋子"), {
      title,
      undoId: item.id,
      previous,
      loading: t("Adding to bag", "加入袋子"),
      undoLoading: t("Taking it out", "移出袋子"),
      undone: t("Removed from bag", "已移出袋子"),
    });
    void paintBagBadge();
  } catch (error) {
    shopToast(error.message || t("Could not add that book.", "無法加入這本書。"), { error: true });
  }
};

const pageName = () => location.pathname.split("/").pop() || "";

const paintBar = () => {
  const mode = document.querySelector("[data-shop-mode]");
  if (!mode) return;
  const seller = marketMode() === "seller";
  const signed = isSellerAuthed();
  mode.innerHTML = signed
    ? `<div class="mode-switch" role="group" aria-label="${t("Account mode", "使用模式")}">
        <button type="button" data-shop-mode-set="buyer" aria-pressed="${seller ? "false" : "true"}">${t("Buyer", "買家")}</button>
        <button type="button" data-shop-mode-set="seller" aria-pressed="${seller ? "true" : "false"}">${t("Seller", "賣方")}</button>
      </div>`
    : "";
  const sell = document.querySelector("[data-shop-sell]");
  if (sell) sell.hidden = !signed;
  const account = document.querySelector("[data-shop-account-menu]");
  const profile = currentProfile();
  if (!account) return;
  if (document.querySelector("[data-market-profile]")) {
    account.innerHTML = `<a class="shop-login" href="market-account.html" ${signed ? "hidden" : ""}>${t("Log in", "登入")}</a>`;
    return;
  }
  if (!signed) {
    account.innerHTML = `<a class="shop-login" href="market-account.html">${t("Log in", "登入")}</a>`;
    return;
  }
  const email = profile?.email || "";
  const name = profile?.display_name || email.split("@")[0] || t("Account", "帳戶");
  account.innerHTML = `<button type="button" class="shop-avatar" aria-haspopup="menu" aria-expanded="false" data-shop-account-btn>${name.slice(0, 1).toUpperCase()}</button>
    <div class="shop-menu" role="menu" hidden>
      <p>${name}</p>
      <p>${email}</p>
      <a role="menuitem" href="market-account.html">${t("Seller desk", "賣方書桌")}</a>
      <a role="menuitem" href="orders.html">${t("My orders", "我的訂單")}</a>
      <a role="menuitem" href="market-account.html">${t("Inventory", "庫存")}</a>
      <a role="menuitem" href="cart.html">${t("Bag", "袋子")}</a>
      <button type="button" role="menuitem" data-shop-signout>${t("Sign out", "登出")}</button>
    </div>`;
};

export const initShopChrome = () => {
  if (!document.querySelector(".shop-atelier") || document.querySelector("[data-shop-bar]")) return;
  const bar = document.createElement("div");
  bar.className = "shop-bar";
  bar.setAttribute("data-shop-bar", "");
  bar.innerHTML = `<div class="shop-bar-inner">
      <a class="shop-brand" href="marketplace.html">
        <strong>imMba Marketplace</strong>
      </a>
      <div class="shop-search-host" data-shop-search-host></div>
      <div class="shop-bar-actions">
        <div data-shop-mode></div>
        <a class="shop-sell" data-shop-sell href="list.html" hidden>${t("Sell a book", "賣書")}</a>
        <button type="button" class="shop-icon shop-icon-bag" data-shop-bag aria-label="${t("Bag", "袋子")}">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 8.5h11l-.8 10.2a1.5 1.5 0 0 1-1.5 1.3H8.8a1.5 1.5 0 0 1-1.5-1.3z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 8.5V7.2A3 3 0 0 1 12 4.2 3 3 0 0 1 15 7.2v1.3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
        </button>
        <div class="shop-account-slot" data-shop-account-menu></div>
      </div>
    </div>`;
  const sheet = document.createElement("dialog");
  sheet.className = "shop-sheet";
  sheet.setAttribute("data-bag-sheet", "");
  sheet.innerHTML = `<form method="dialog">
      <header><strong>${t("Your bag", "你的袋子")}</strong><span data-bag-sheet-count></span><button class="shop-close" value="cancel" aria-label="${t("Close", "關閉")}">×</button></header>
      <div data-bag-sheet-body></div>
      <footer>
        <a class="pdp-bag" href="cart.html">${t("Review and checkout", "查看並結帳")}</a>
        <button value="cancel">${t("Continue browsing", "繼續逛")}</button>
      </footer>
    </form>`;
  document.body.append(sheet);
  const header = document.querySelector(".site-header");
  if (header) header.after(bar);
  else document.body.prepend(bar);
  const slot = bar.querySelector("[data-shop-account-menu]");
  let profileHost = document.querySelector("[data-market-profile]");
  if (!profileHost && slot) {
    profileHost = document.createElement("span");
    profileHost.setAttribute("data-market-profile", "");
  }
  if (profileHost && slot) slot.before(profileHost);
  paintBar();
  if (profileHost) void import("../src/market-profile.tsx?v=profile8");
  void paintBagBadge();

  bar.addEventListener("click", (event) => {
    if (event.target.closest("[data-shop-bag]")) openBag();
    const modeButton = event.target.closest("[data-shop-mode-set]");
    if (modeButton) {
      const next = modeButton.getAttribute("data-shop-mode-set");
      setMarketMode(next);
      const here = pageName();
      if (next === "seller" && here !== "market-account.html") location.href = "market-account.html";
      if (next === "buyer" && here !== "marketplace.html") location.href = "marketplace.html";
      paintBar();
    }
    const accountBtn = event.target.closest("[data-shop-account-btn]");
    if (accountBtn) {
      const menu = accountBtn.parentElement?.querySelector(".shop-menu");
      const open = menu?.hidden !== false;
      if (menu) menu.hidden = !open;
      accountBtn.setAttribute("aria-expanded", String(open));
    }
    if (event.target.closest("[data-shop-signout]")) {
      logoutAdmin();
      location.href = "marketplace.html";
    }
  });

  sheet.querySelector("form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    closeBag();
  });
  sheet.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeBag();
  });
  sheet.addEventListener("click", (event) => {
    if (event.target === sheet) {
      closeBag();
      return;
    }
    const step = event.target.closest("[data-bag-step]");
    if (step) {
      const id = step.getAttribute("data-id");
      const row = readBag().find((item) => item.listing_id === id);
      const result = setBagQty(id, (Number(row?.quantity) || 1) + Number(step.getAttribute("data-bag-step")));
      if (result === "removed") {
        shopToast(t("Quantity cannot be 0 or negative, so this item left the bag.", "數量不能是 0 或負數，這項已從袋子移除。"), { error: true });
      } else if (result === "capped") {
        shopToast(t("That is more than the available stock.", "超過可售數量。"), { error: true });
      }
      return;
    }
    const drop = event.target.closest("[data-bag-drop]");
    if (drop) removeBagLine(drop.getAttribute("data-bag-drop"));
  });

  document.addEventListener("click", (event) => {
    const quick = event.target.closest("[data-quick-add]");
    if (!quick) return;
    event.preventDefault();
    event.stopPropagation();
    addQuick(quick.getAttribute("data-quick-add"));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeBag();
  });

  window.addEventListener("immba:bag", () => {
    paintDrawer();
    void paintBagBadge();
  });
  window.addEventListener("immba:bag-open", openBag);
  window.addEventListener("immba:lang", paintBar);
  window.addEventListener("immba:mode", paintBar);
};
