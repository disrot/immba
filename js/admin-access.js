import { isSuperAdmin } from "./auth.js?v=notice4";
import { rest } from "./supabase.js?v=login9";

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

  const roleLabel = (role) => {
    const zh = document.body?.dataset.lang === "zh";
    if (role === "pending") return zh ? "等候核准" : "Waiting";
    if (role === "admin") return zh ? "管理員" : "Admin";
    if (role === "super_admin") return zh ? "超級管理員" : "Super admin";
    if (role === "rejected") return zh ? "未核准" : "Not approved";
    return role || "";
  };

  const intentLabel = (intent) => {
    const zh = document.body?.dataset.lang === "zh";
    if (intent === "marketplace") return zh ? "市集賣方" : "Seller";
    return zh ? "職員" : "Staff";
  };

  const paint = () => {
    if (!table) return;
    table.innerHTML = rows
      .map(
        (row) => `<tr>
          <td>${row.email || ""}</td>
          <td>${roleLabel(row.role)}</td>
          <td>${intentLabel(row.intent)}</td>
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
      rows = rows.filter((row) => row.role !== "marketplace" && row.intent !== "marketplace");
      rows.sort((a, b) => Number(b.role === "pending") - Number(a.role === "pending"));
      paint();
      if (status) {
        const pending = rows.filter((row) => row.role === "pending").length;
        status.textContent = rows.length
          ? pending
            ? `${pending} waiting for approval.`
            : "No staff waiting. Approved office accounts are listed below."
          : "No accounts yet. New staff registrations appear here as pending.";
      }
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
