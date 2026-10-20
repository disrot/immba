import { currentProfile, isSellerAuthed, logoutAdmin } from "./auth.js?v=liquid2";
import { createListing } from "./listings-store.js?v=auth1";

export const initMarketAccount = () => {
  const bar = document.querySelector("[data-market-account]");
  const desk = document.querySelector("[data-market-desk]");
  const authBox = document.querySelector("[data-market-auth]");
  const form = document.querySelector("[data-market-form]");
  if (!bar && !desk && !form) return;

  const session = currentProfile();
  const signed = Boolean(session?.access_token);
  const seller = isSellerAuthed();

  if (bar && authBox) {
    bar.hidden = !signed;
    bar.innerHTML = signed
      ? `<p>${session.email} · ${session.role}</p>
         <button type="button" class="btn btn-ghost" data-market-out>Sign out</button>`
      : "";
  } else if (bar) {
    bar.innerHTML = signed
      ? `<p>${session.email} · ${session.role}</p>
         ${
           seller
             ? `<a class="btn btn-primary" href="market-account.html">Seller desk</a>`
             : `<a class="btn btn-ghost" href="pending.html">Waiting for access</a>`
         }
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
        if (status) status.textContent = "Listing posted. It appears on Marketplace after refresh.";
        form.reset();
      } catch (error) {
        if (status) status.textContent = error.message || "Could not post.";
      }
    })();
  });
};
