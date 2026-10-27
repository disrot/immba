import { isSuperAdmin } from "./auth.js?v=notice4";
import { rest } from "./supabase.js?v=audit2";
import { bindPanelDrop } from "./ui-drop.js?v=drop2";
import { logAudit } from "./audit-store.js?v=audit2";

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
  let rows = [];

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

  const paint = () => {
    if (!table) return;
    table.innerHTML = rows
      .map(
        (row) => `<tr>
          <td>${row.email || ""}</td>
          <td>${roleLabel(row.role)}</td>
          <td>${intentLabel(row.intent)}</td>
          <td>
            <div class="menu-drop menu-drop-office access-role-drop" data-access-drop data-id="${row.id}">
              <button type="button" class="menu-drop-btn" data-drop-btn aria-expanded="false">${zh() ? "權限" : "Permissions"}</button>
              <div class="menu-drop-panel access-role-panel" data-drop-panel>
                ${ROLES.map(
                  (role) => `<label class="access-check">
                    <input type="checkbox" data-access-perm="${role.key}" ${row.role === role.key ? "checked" : ""} />
                    ${zh() ? role.zh : role.en}
                  </label>`
                ).join("")}
              </div>
            </div>
          </td>
        </tr>`
      )
      .join("");
    table.querySelectorAll("[data-access-drop]").forEach(bindPanelDrop);
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
            ? zh()
              ? `${pending} 人等候核准。勾選即可加上或拿掉權限。`
              : `${pending} waiting. Check a permission on or off.`
            : zh()
              ? "沒有等候中的職員。勾選即可加上或拿掉權限。"
              : "No staff waiting. Check a permission on or off."
          : zh()
            ? "尚無帳號。新職員註冊後會出現在這裡。"
            : "No accounts yet. New staff registrations appear here as pending.";
      }
    } catch (error) {
      if (status) status.textContent = error.message || "Could not load accounts. Run schema-auth.sql.";
    }
  };

  table?.addEventListener("change", async (event) => {
    const input = event.target.closest("[data-access-perm]");
    if (!input) return;
    const wrap = input.closest("[data-access-drop]");
    const id = wrap?.getAttribute("data-id");
    if (!id) return;
    const current = rows.find((row) => row.id === id);
    const next = input.checked ? input.getAttribute("data-access-perm") : "pending";
    if (!current || current.role === next) return;
    try {
      await rest(`profiles?id=eq.${id}`, {
        method: "PATCH",
        body: { role: next },
      });
      await logAudit({
        module: "AUTH",
        action: "UPDATE",
        entityType: "profiles",
        entityId: id,
        entityLabel: current.email || id,
        oldValues: { role: current.role },
        newValues: { role: next },
      });
      await reload();
    } catch (error) {
      if (status) status.textContent = error.message || "Update failed.";
    }
  });

  window.addEventListener("immba:lang", paint);
  void reload();
}
