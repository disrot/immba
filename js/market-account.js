import { currentProfile, isSellerAuthed, logoutAdmin } from "./auth.js?v=notice4";
import { ackRemovedNotices, createListing, listRemovedNotices } from "./listings-store.js?v=notice3";

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

  if (bar && authBox) {
    bar.hidden = !seller;
    bar.innerHTML = seller
      ? `<p>${esc(session.email)}</p>
         <span data-market-bell-slot></span>
         <a class="btn btn-ghost" href="marketplace.html" data-i18n="market.backShop">Back to Marketplace</a>
         <button type="button" class="btn btn-ghost" data-market-out>Sign out</button>`
      : "";
  } else if (bar) {
    bar.innerHTML = seller
      ? `<p>${esc(session.email)}</p>
         <span data-market-bell-slot></span>
         <a class="btn btn-primary" href="market-account.html" data-i18n="market.desk">Seller desk</a>
         <button type="button" class="btn btn-ghost" data-market-out>Sign out</button>`
      : `<p data-i18n="market.sellHint">Students can register as a marketplace seller to post a listing.</p>
         <a class="btn btn-primary" href="market-account.html" data-i18n="market.sellerIn">Seller sign in</a>`;
  }

  if (authBox) authBox.hidden = seller;
  if (desk) desk.hidden = !seller;
  if (form) form.hidden = !seller;

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

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const status = document.querySelector("[data-market-status]");
    void (async () => {
      try {
        await createListing({
          title: form.elements.namedItem("title").value.trim(),
          title_zh: form.elements.namedItem("title_zh").value.trim(),
          blurb: form.elements.namedItem("blurb").value.trim(),
          blurb_zh: form.elements.namedItem("blurb_zh").value.trim(),
          price: form.elements.namedItem("price").value,
          kind: form.elements.namedItem("kind").value,
          tag: form.elements.namedItem("tag").value,
          format: form.elements.namedItem("format").value.trim(),
          file: form.elements.namedItem("photo")?.files?.[0],
        });
        if (status) {
          status.textContent = zh()
            ? "已刊登。可用下方按鈕回到市集查看。"
            : "Listing posted. Use Back to Marketplace to see it in the shop.";
        }
        form.reset();
        document.querySelector("[data-market-shop]")?.classList.add("is-ready");
      } catch (error) {
        if (status) status.textContent = error.message || "Could not post.";
      }
    })();
  });
};
