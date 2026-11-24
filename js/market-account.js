import { currentProfile, isSellerAuthed, logoutAdmin } from "./auth.js?v=lab4";
import { ackRemovedNotices, listRemovedNotices } from "./listings-store.js?v=notice4";
import { initSellerHub } from "./seller-hub.js?v=lab7";
import { marketMode, setMarketMode } from "./trade.js?v=lab4";
import { ackTradeNotices, tradeNoticesFor } from "./trade-notices.js?v=lab1";

const esc = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export const initMarketAccount = () => {
  const bar = document.querySelector("[data-market-account]");
  const desk = document.querySelector("[data-market-desk]");
  const authBox = document.querySelector("[data-market-auth]");
  const form = document.querySelector("[data-market-form]");
  const listingPage = document.body.hasAttribute("data-list-page");
  if (!bar && !desk && !form && !listingPage) return;

  document.querySelector("[data-password-toggle]")?.addEventListener("click", (event) => {
    const button = event.currentTarget;
    const input = button.parentElement?.querySelector("input");
    if (!(input instanceof HTMLInputElement) || !(button instanceof HTMLButtonElement)) return;
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    button.setAttribute("aria-label", show ? (zh() ? "隱藏密碼" : "Hide password") : zh() ? "顯示密碼" : "Show password");
    button.querySelector(".eye-off")?.toggleAttribute("hidden", show);
    button.querySelector(".eye-on")?.toggleAttribute("hidden", !show);
  });

  const session = currentProfile();
  const seller = isSellerAuthed();
  const zh = () => document.body?.dataset.lang === "zh";

  const modeSwitch = () => {
    const buyer = marketMode() !== "seller";
    return `<div class="mode-switch" role="group" aria-label="${zh() ? "買家或賣方" : "Buyer or seller"}">
      <button type="button" data-account-mode="buyer" aria-pressed="${buyer ? "true" : "false"}">${zh() ? "買家" : "Buyer"}</button>
      <button type="button" data-account-mode="seller" aria-pressed="${buyer ? "false" : "true"}">${zh() ? "賣方" : "Seller"}</button>
    </div>`;
  };

  if (bar && authBox) {
    bar.hidden = !seller;
    const outLabel = zh() ? "登出" : "Sign out";
    bar.innerHTML = seller
      ? `<p class="shop-account-mail">${esc(session.email)}</p>
         ${modeSwitch()}
         <span data-market-bell-slot></span>
         <a class="btn btn-ghost" href="marketplace.html" data-i18n="market.backShop">Back to Marketplace</a>
         <button type="button" class="shop-icon shop-icon-out" data-market-out aria-label="${outLabel}">
           <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 5.5H7.8A1.8 1.8 0 0 0 6 7.3v9.4a1.8 1.8 0 0 0 1.8 1.8H10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M12.5 12H19M16.2 8.8 19.2 12l-3 3.2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
           <span class="trade-step-tip">${outLabel}</span>
         </button>`
      : "";
  } else if (bar) {
    const menu = document.querySelector("[data-market-profile]");
    bar.hidden = !seller || Boolean(menu);
    const outLabel = zh() ? "登出" : "Sign out";
    bar.innerHTML = seller
      ? menu
        ? `<span data-market-bell-slot></span>`
        : `<p class="shop-account-mail">${esc(session.email)}</p>
         <span data-market-bell-slot></span>
         <button type="button" class="shop-icon shop-icon-out" data-market-out aria-label="${outLabel}">
           <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 5.5H7.8A1.8 1.8 0 0 0 6 7.3v9.4a1.8 1.8 0 0 0 1.8 1.8H10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M12.5 12H19M16.2 8.8 19.2 12l-3 3.2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
           <span class="trade-step-tip">${outLabel}</span>
         </button>`
      : "";
  }

  if (authBox) authBox.hidden = seller;
  if (desk) desk.hidden = !seller;
  if (form) form.hidden = !seller;

  bar?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-account-mode]");
    if (!button || !bar.contains(button)) return;
    setMarketMode(button.getAttribute("data-account-mode"));
    bar.querySelectorAll("[data-account-mode]").forEach((item) => {
      item.setAttribute("aria-pressed", item === button ? "true" : "false");
    });
  });

  document.querySelector("[data-market-out]")?.addEventListener("click", () => {
    logoutAdmin();
    location.href = "marketplace.html";
  });

  const slot = document.querySelector("[data-market-bell-slot]");

  const closeBell = () => {
    const wrap = document.querySelector("[data-market-bell]");
    wrap?.querySelector(".market-bell")?.setAttribute("aria-expanded", "false");
    const panel = wrap?.querySelector(".market-bell-panel");
    if (panel) panel.hidden = true;
  };

  const paintBell = (rows) => {
    if (!slot) return;
    const notices = tradeNoticesFor(session?.email);
    const removed = seller ? rows : [];
    if (!removed.length && !notices.length) {
      slot.innerHTML = "";
      if (document.querySelector("[data-market-profile]") && bar && !document.querySelector("[data-market-desk]")) {
        bar.hidden = true;
      }
      return;
    }
    const n = removed.length + notices.length;
    const items = [
      ...notices.map((row) => `<li>${esc(zh() ? row.textZh : row.text)}</li>`),
      ...removed.map((row) => `<li>${esc(row.title || row.title_zh || (zh() ? "刊登" : "Listing"))}</li>`),
    ].join("");
    const lede = notices.length
      ? zh()
        ? "訂單有新的進度。"
        : "An order changed."
      : zh()
        ? "後台已從市集下架你的刊登。"
        : "The office removed a listing of yours from Marketplace.";
    if (bar && document.querySelector("[data-market-profile]") && !document.querySelector("[data-market-desk]")) {
      bar.hidden = false;
    }
    slot.innerHTML = `<div class="market-bell-wrap" data-market-bell>
      <button type="button" class="market-bell" aria-expanded="false" aria-label="${zh() ? "通知" : "Notifications"}">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4a5 5 0 0 0-5 5v2.2c0 .8-.3 1.6-.9 2.2L5 15h14l-1.1-1.6a3.2 3.2 0 0 1-.9-2.2V9a5 5 0 0 0-5-5z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M9.5 17.2a2.5 2.5 0 0 0 5 0" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>
        <span class="market-bell-dot">${n > 9 ? "9+" : n}</span>
      </button>
      <div class="market-bell-panel" hidden>
        <p>${lede}</p>
        <ul>${items}</ul>
        <button type="button" class="btn btn-ghost" data-market-ack>${zh() ? "知道了" : "Got it"}</button>
      </div>
    </div>`;
    const wrap = slot.querySelector("[data-market-bell]");
    const btn = wrap.querySelector(".market-bell");
    const panel = wrap.querySelector(".market-bell-panel");
    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      const open = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", open ? "false" : "true");
      panel.hidden = open;
    });
    wrap.querySelector("[data-market-ack]")?.addEventListener("click", () => {
      ackTradeNotices(session?.email);
      const finish = () => paintBell([]);
      if (removed.length) void ackRemovedNotices(removed.map((row) => row.id)).then(finish);
      else finish();
    });
  };

  document.addEventListener("click", (event) => {
    if (!event.target.closest("[data-market-bell]")) closeBell();
  });

  if (seller) void listRemovedNotices().then(paintBell);
  else paintBell([]);
  window.addEventListener("immba:notices", () => {
    if (seller) void listRemovedNotices().then(paintBell);
    else paintBell([]);
  });
  window.addEventListener("immba:lang", () => {
    if (seller) void listRemovedNotices().then(paintBell);
    else paintBell([]);
    if (!listingPage || seller) return;
    const gate = document.querySelector("[data-list-gate]");
    const heading = document.querySelector("[data-list-title]");
    if (heading) heading.textContent = zh() ? "建立刊登" : "Create a listing";
    if (gate) {
      gate.innerHTML = zh()
        ? `請先在賣方書桌登入，再刊登。<a href="market-account.html">賣方登入</a>`
        : `Sign in on the seller desk before posting. <a href="market-account.html">Seller sign in</a>`;
    }
  });

  if (listingPage) {
    const wizard = document.querySelector("[data-list-wizard]");
    const gate = document.querySelector("[data-list-gate]");
    if (wizard) wizard.hidden = !seller;
    if (gate) {
      gate.hidden = seller;
      gate.innerHTML = zh()
        ? `請先在賣方書桌登入，再刊登。<a href="market-account.html">賣方登入</a>`
        : `Sign in on the seller desk before posting. <a href="market-account.html">Seller sign in</a>`;
    }
    if (seller) initSellerHub();
    return;
  }

  if (seller) initSellerHub();

  const story = document.querySelector("[data-seller-story]");
  if (story) {
    story.hidden = seller;
    if (!seller) {
      const slides = [...story.querySelectorAll("[data-slide]")];
      const tabs = [...story.querySelectorAll("[data-story]")];
      const pauseBtn = story.querySelector("[data-story-pause]");
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      let index = 0;
      let paused = reduce;
      let timer = 0;
      const label = (playing) => {
        pauseBtn?.setAttribute("aria-pressed", playing ? "false" : "true");
        pauseBtn?.setAttribute("aria-label", zh() ? (playing ? "暫停" : "播放") : playing ? "Pause" : "Play");
      };
      const show = (next) => {
        index = (next + slides.length) % slides.length;
        slides.forEach((el, i) => el.classList.toggle("is-on", i === index));
        tabs.forEach((el, i) => {
          el.classList.toggle("is-on", i === index);
          el.classList.toggle("is-done", i < index);
          el.setAttribute("aria-selected", i === index ? "true" : "false");
          const bar = el.querySelector("i");
          if (bar && i === index) {
            bar.style.animation = "none";
            void bar.offsetWidth;
            bar.style.animation = "";
          }
        });
        window.clearTimeout(timer);
        if (!paused) timer = window.setTimeout(() => show(index + 1), 6000);
      };
      tabs.forEach((tab) => tab.addEventListener("click", () => show(Number(tab.dataset.story))));
      pauseBtn?.addEventListener("click", () => {
        paused = !paused;
        story.classList.toggle("is-paused", paused);
        label(!paused);
        window.clearTimeout(timer);
        if (!paused) timer = window.setTimeout(() => show(index + 1), 6000);
      });
      if (paused) story.classList.add("is-paused");
      label(!paused);
      show(0);
      window.addEventListener("immba:lang", () => label(!paused));
    }
  }
};
