import { isAdminAuthed } from "./auth.js?v=notice4";
import { rest } from "./supabase.js?v=notice1";
import { removeListing } from "./listings-store.js?v=notice3";

const root = document.querySelector("[data-listings-admin]");
if (!root) {
  /* Moderation lives on dashboard.html#listings */
} else if (!isAdminAuthed()) {
  window.location.replace("login.html");
} else {
  const table = root.querySelector("[data-listings-table]");
  const status = root.querySelector("[data-listings-status]");
  let rows = [];

  const esc = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const paint = () => {
    if (!table) return;
    if (!rows.length) {
      const zh = document.body?.dataset.lang === "zh";
      table.innerHTML = `<tr><td colspan="6">${
        zh
          ? "尚無同學刊登。前台市集上的課程教材是學程展示，不會出現在這裡。"
          : "No student seller posts yet. Course packets on the public shop are program listings, not seller posts."
      }</td></tr>`;
      return;
    }
    table.innerHTML = rows
      .map((row) => {
        const photo = row.image_url || "images/marketplace/ibm.jpg";
        const title = row.title || row.title_zh || "Listing";
        return `<tr>
          <td><img class="listing-thumb" src="${esc(photo)}" alt="" width="48" height="48" /></td>
          <td>
            <strong>${esc(title)}</strong>
            <small>${esc(row.title_zh && row.title_zh !== title ? row.title_zh : row.blurb || "")}</small>
          </td>
          <td>${esc(row.seller_email || row.seller_id || "")}</td>
          <td>NT$ ${esc(Number(row.price) || 0)}${row.sold ? " · sold" : ""}</td>
          <td>${esc(row.kind || "")}</td>
          <td class="admin-row-actions"><div class="admin-actions">
            <a class="btn btn-ghost" href="listing.html?id=${esc(row.id)}" target="_blank" rel="noopener">Open</a>
            <button type="button" class="btn btn-ghost" data-listing-remove="${esc(row.id)}">Remove</button>
          </div></td>
        </tr>`;
      })
      .join("");
  };

  const reload = async () => {
    try {
      const listings = (await rest("listings?select=*&order=created_at.desc")) || [];
      let emails = {};
      try {
        const profiles = (await rest("profiles?select=id,email")) || [];
        emails = Object.fromEntries(profiles.map((row) => [row.id, row.email || ""]));
      } catch {
        emails = {};
      }
      rows = listings
        .filter((row) => !row.removed)
        .map((row) => ({ ...row, seller_email: emails[row.seller_id] || "" }));
      paint();
      if (status) {
        status.textContent = rows.length ? `${rows.length} on Marketplace.` : "";
      }
    } catch (error) {
      if (status) status.textContent = error.message || "Could not load listings.";
    }
  };

  table?.addEventListener("click", async (event) => {
    const btn = event.target.closest("[data-listing-remove]");
    if (!btn) return;
    const id = btn.getAttribute("data-listing-remove");
    if (!id || !window.confirm("Remove this listing from Marketplace?")) return;
    try {
      await removeListing(id);
      await reload();
    } catch (error) {
      if (status) status.textContent = error.message || "Could not remove listing.";
    }
  });

  void reload();
}
