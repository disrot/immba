import { ALL_OFFICE_PAGES, OFFICE_PAGES, isSuperAdmin, pagesForRole } from "./auth.js?v=block1";
import { getAuthSession, rest, rpc } from "./supabase.js?v=secure1";
import { bindPanelDrop } from "./ui-drop.js?v=drop3";

const ROLES = [
  { key: "pending", en: "Waiting", zh: "等候核准" },
  { key: "admin", en: "Office admin", zh: "管理員" },
  { key: "super_admin", en: "Super admin", zh: "超級管理員" },
  { key: "rejected", en: "Blocked", zh: "未核准" },
];

const root = document.querySelector("[data-access-admin]");
if (!root) {
  /* Access panel is only on dashboard.html */
} else if (!isSuperAdmin()) {
  root.hidden = true;
  document.querySelectorAll('[data-office-tab="access"], option[value="access"]').forEach((node) => {
    node.hidden = true;
  });
  window.dispatchEvent(new Event("resize"));
} else {
  const table = root.querySelector("[data-access-table]");
  const status = root.querySelector("[data-access-status]");
  const lede = root.querySelector("[data-access-lede]");
  const lastHead = root.querySelector("[data-access-last]");
  let allRows = [];
  let view = "staff";

  const zh = () => document.body?.dataset.lang === "zh";

  const roleLabel = (role) => {
    const match = ROLES.find((item) => item.key === role);
    if (!match) return role || "";
    return zh() ? match.zh : match.en;
  };

  const intentLabel = (intent) => {
    if (intent === "marketplace") return zh() ? "市集賣方" : "Seller";
    return zh() ? "職員" : "Staff";
  };

  const pageLabel = (key) => {
    const match = OFFICE_PAGES.find((page) => page.key === key);
    if (!match) return key;
    return zh() ? match.zh : match.en;
  };

  const esc = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const isMarket = (row) => row.role === "marketplace" || row.intent === "marketplace";
  const rowsForView = () => (view === "market" ? allRows.filter(isMarket) : allRows.filter((row) => !isMarket(row)));

  const paintSwitch = () => {
    root.querySelectorAll("[data-access-mode]").forEach((button) => {
      const on = button.getAttribute("data-access-mode") === view;
      button.setAttribute("aria-pressed", on ? "true" : "false");
      const mode = button.getAttribute("data-access-mode");
      button.textContent =
        mode === "market" ? (zh() ? "買家與賣方" : "Buyers and sellers") : zh() ? "職員" : "Staff";
    });
    if (lastHead) lastHead.textContent = view === "market" ? (zh() ? "註冊時間" : "Joined") : zh() ? "權限" : "Access";
    if (lede) {
      lede.textContent =
        view === "market"
          ? zh()
            ? "已註冊、可以在市集買書或賣書的帳號。這裡只供查看。"
            : "People registered to buy or sell on the marketplace. This list is for looking."
          : zh()
            ? "超級管理員、辦公室管理員，以及等候核准的職員。"
            : "Super admins, office admins, and staff waiting for approval.";
    }
  };

  const paint = () => {
    if (!table) return;
    paintSwitch();
    const rows = rowsForView();
    if (view === "market") {
      table.innerHTML = rows
        .map((row) => {
          const when = row.created_at ? new Date(row.created_at).toLocaleString(zh() ? "zh-TW" : "en-US") : "";
          return `<tr>
            <td>${esc(row.email)}</td>
            <td>${zh() ? "買家／賣方" : "Buyer / seller"}</td>
            <td>${esc(row.display_name || (zh() ? "市集帳號" : "Marketplace"))}</td>
            <td class="trade-money">${esc(when)}</td>
          </tr>`;
        })
        .join("");
      if (status) {
        status.textContent = rows.length
          ? zh()
            ? `${rows.length} 個市集帳號。`
            : `${rows.length} marketplace accounts.`
          : zh()
            ? "還沒有人註冊市集帳號。"
            : "No one has registered a marketplace account yet.";
      }
      return;
    }
    if (status) {
      const pending = rows.filter((row) => row.role === "pending").length;
      status.textContent = rows.length
        ? pending
          ? zh()
            ? `${pending} 人等候核准。`
            : `${pending} waiting for approval.`
          : zh()
            ? "沒有等候中的職員。"
            : "No staff waiting."
        : zh()
          ? "尚無帳號。新職員註冊後會出現在這裡。"
          : "No accounts yet. New staff registrations appear here as pending.";
    }
    table.innerHTML = rows
      .map((row) => {
        const pages = pagesForRole(row.role, row.pages);
        return `<tr>
          <td>${esc(row.email)}</td>
          <td>${roleLabel(row.role)}</td>
          <td>${intentLabel(row.intent)}</td>
          <td>
            <div class="access-menus">
              <div class="menu-drop menu-drop-office access-role-drop" data-access-drop data-id="${row.id}">
                <button type="button" class="menu-drop-btn" data-drop-btn aria-expanded="false">${zh() ? "角色" : "Role"}</button>
                <div class="menu-drop-panel access-role-panel" data-drop-panel>
                  ${ROLES.map(
                    (role) => `<label class="access-check">
                      <input type="checkbox" data-access-perm="${role.key}" ${row.role === role.key ? "checked" : ""} />
                      ${zh() ? role.zh : role.en}
                    </label>`
                  ).join("")}
                </div>
              </div>
              <div class="menu-drop menu-drop-office access-role-drop" data-access-pages data-id="${row.id}">
                <button type="button" class="menu-drop-btn" data-drop-btn aria-expanded="false">${zh() ? "頁面" : "Pages"}</button>
                <div class="menu-drop-panel access-role-panel" data-drop-panel>
                  ${OFFICE_PAGES.map(
                    (page) => `<label class="access-check">
                      <input type="checkbox" data-access-page="${page.key}" ${pages.includes(page.key) ? "checked" : ""} ${
                        row.role === "pending" || row.role === "rejected" ? "disabled" : ""
                      } />
                      ${pageLabel(page.key)}
                    </label>`
                  ).join("")}
                </div>
              </div>
              ${
                row.id === getAuthSession()?.user?.id
                  ? ""
                  : `<button type="button" class="btn btn-ghost office-equal access-delete" data-access-delete="${row.id}">${zh() ? "刪除" : "Delete"}</button>`
              }
            </div>
          </td>
        </tr>`;
      })
      .join("");
    table.querySelectorAll("[data-access-drop], [data-access-pages]").forEach(bindPanelDrop);
  };

  const reload = async () => {
    try {
      try {
        allRows = (await rest("profiles?select=id,email,display_name,role,intent,pages,created_at&order=created_at.desc")) || [];
      } catch {
        try {
          allRows = (await rest("profiles?select=id,email,role,intent,pages,created_at&order=created_at.desc")) || [];
        } catch {
          allRows = (await rest("profiles?select=id,email,role,intent,created_at&order=created_at.desc")) || [];
        }
      }
      allRows.sort((a, b) => Number(b.role === "pending") - Number(a.role === "pending"));
      paint();
    } catch (error) {
      if (status) status.textContent = error.message || "Could not load accounts. Run schema-auth.sql.";
    }
  };

  const saveRow = async (id, role, pages) => {
    await rpc("admin_update_profile", { p_id: id, p_role: role, p_pages: pages });
    await reload();
  };

  table?.addEventListener("click", async (event) => {
    const btn = event.target.closest("[data-access-delete]");
    if (!btn) return;
    const id = btn.getAttribute("data-access-delete");
    const current = allRows.find((row) => row.id === id);
    if (!current) return;
    if (!window.confirm(zh() ? `刪除 ${current.email || "此帳號"}？對方會立即被登出。` : `Delete ${current.email || "this account"}? They will be signed out at once.`)) {
      return;
    }
      try {
        await rpc("office_delete_account", { p_id: id });
        await reload();
    } catch (error) {
      if (status) status.textContent = error.message || "Could not delete that account.";
    }
  });

  table?.addEventListener("change", async (event) => {
    const roleInput = event.target.closest("[data-access-perm]");
    const pageInput = event.target.closest("[data-access-page]");
    const wrap = event.target.closest("[data-access-drop], [data-access-pages]");
    const id = wrap?.getAttribute("data-id");
    if (!id) return;
    const current = allRows.find((row) => row.id === id);
    if (!current) return;
    try {
      if (roleInput) {
        const next = roleInput.checked ? roleInput.getAttribute("data-access-perm") : "pending";
        if (current.role === next) return;
        await saveRow(id, next, pagesForRole(next, current.pages));
        return;
      }
      if (pageInput) {
        if (current.role === "pending" || current.role === "rejected") return;
        const box = wrap.querySelector("[data-drop-panel]");
        let pages = [...box.querySelectorAll("[data-access-page]:checked")].map((input) => input.getAttribute("data-access-page"));
        if (current.role === "super_admin") pages = [...ALL_OFFICE_PAGES];
        await saveRow(id, current.role, pages);
      }
    } catch (error) {
      if (status) status.textContent = error.message || "Update failed. Run schema-auth.sql to add pages.";
    }
  });

  root.querySelector("[data-access-view]")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-access-mode]");
    if (!button) return;
    view = button.getAttribute("data-access-mode") || "staff";
    paint();
  });

  window.addEventListener("immba:lang", paint);
  void reload();
}
