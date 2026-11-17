import { currentProfile, isSellerAuthed, logoutAdmin } from "./auth.js?v=notice4";
import { ackRemovedNotices, listRemovedNotices } from "./listings-store.js?v=notice3";
import { initSellerHub } from "./seller-hub.js?v=trade1";
import { marketMode, setMarketMode } from "./trade.js?v=trade1";

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
  if (!bar && !desk && !form) return;

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
    bar.innerHTML = seller
      ? `<p>${esc(session.email)}</p>
         ${modeSwitch()}
         <span data-market-bell-slot></span>
         <a class="btn btn-ghost" href="marketplace.html" data-i18n="market.backShop">Back to Marketplace</a>
         <button type="button" class="btn btn-ghost" data-market-out>Sign out</button>`
      : "";
  } else if (bar) {
    bar.hidden = !seller;
    bar.innerHTML = seller
      ? `<p>${esc(session.email)}</p>
         <span data-market-bell-slot></span>
         <a class="btn btn-ghost" href="market-account.html">${zh() ? "帳號" : "Account"}</a>
         <button type="button" class="btn btn-ghost" data-market-out>Sign out</button>`
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
    if (!seller || !rows.length) {
      slot.innerHTML = "";
      return;
    }
    const n = rows.length;
    const items = rows
      .map((row) => `<li>${esc(row.title || row.title_zh || (zh() ? "刊登" : "Listing"))}</li>`)
      .join("");
    const lede = zh()
      ? "後台已從市集下架你的刊登。"
      : "The office removed a listing of yours from Marketplace.";
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
      void ackRemovedNotices(rows.map((row) => row.id)).then(() => {
        slot.innerHTML = "";
      });
    });
  };

  document.addEventListener("click", (event) => {
    if (!event.target.closest("[data-market-bell]")) closeBell();
  });

  if (seller) void listRemovedNotices().then(paintBell);
  window.addEventListener("immba:lang", () => {
    if (seller) void listRemovedNotices().then(paintBell);
  });

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
