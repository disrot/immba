import { isSuperAdmin } from "./auth.js?v=auth3";
import { rest } from "./supabase.js?v=auth3";

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
  let rows = [];

  const paint = () => {
    if (!table) return;
    table.innerHTML = rows
      .map(
        (row) => `<tr>
          <td>${row.email || ""}</td>
          <td>${row.role}</td>
          <td>${row.intent || ""}</td>
          <td class="admin-row-actions"><div class="admin-actions">
            ${
              row.role === "pending"
                ? `<button type="button" class="btn btn-ghost" data-access-role="admin" data-id="${row.id}">Approve</button>
                   <button type="button" class="btn btn-ghost" data-access-role="rejected" data-id="${row.id}">Reject</button>`
                : ""
            }
            ${
              row.role === "admin"
                ? `<button type="button" class="btn btn-ghost" data-access-role="super_admin" data-id="${row.id}">Make super admin</button>`
                : ""
            }
          </div></td>
        </tr>`
      )
      .join("");
  };

  const reload = async () => {
    try {
      try {
        rows = (await rest("profiles?select=id,email,role,intent,created_at&order=created_at.desc")) || [];
      } catch {
        rows = (await rest("profiles?select=id,email,role,created_at&order=created_at.desc")) || [];
      }
      paint();
      if (status) status.textContent = "";
    } catch (error) {
      if (status) status.textContent = error.message || "Could not load accounts. Run schema-auth.sql.";
    }
  };

  table?.addEventListener("click", async (event) => {
    const btn = event.target.closest("[data-access-role]");
    if (!btn) return;
    try {
      await rest(`profiles?id=eq.${btn.getAttribute("data-id")}`, {
        method: "PATCH",
        body: { role: btn.getAttribute("data-access-role") },
      });
      await reload();
    } catch (error) {
      if (status) status.textContent = error.message || "Update failed.";
    }
  });

  void reload();
}
