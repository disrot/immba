import { isAdminAuthed, isSuperAdmin } from "./auth.js?v=notice4";
import {
  executeGlobalRollback,
  listAuditLogs,
  listEntityVersions,
  previewGlobalRollback,
  restoreAuditVersion,
  verifyAuditIntegrity,
} from "./audit-store.js?v=audit2";

const root = document.querySelector("[data-audit-admin]");
if (!root) {
  /* Audit panel lives on dashboard.html#audit */
} else if (!isAdminAuthed()) {
  window.location.replace("login.html");
} else {
  const table = root.querySelector("[data-audit-table]");
  const status = root.querySelector("[data-audit-status]");
  const moduleFilter = root.querySelector("[data-audit-module]");
  const rollbackBox = root.querySelector("[data-audit-rollback]");
  const snaps = root.querySelector("[data-audit-snapshots]");
  const previewOut = root.querySelector("[data-audit-preview-out]");
  const targetInput = root.querySelector("[data-audit-target]");
  if (!isSuperAdmin() && rollbackBox) rollbackBox.hidden = true;

  const zh = () => document.body?.dataset.lang === "zh";
  const setStatus = (message) => {
    if (status) status.textContent = message;
  };

  const pad = (value) => String(value).padStart(2, "0");
  const toLocalValue = (date) =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;

  if (targetInput && !targetInput.value) {
    targetInput.value = toLocalValue(new Date(Date.now() - 60 * 60 * 1000));
  }

  const readTarget = () => {
    const raw = targetInput?.value;
    if (!raw) throw new Error(zh() ? "請先選擇還原時間。" : "Pick a rollback time first.");
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) throw new Error(zh() ? "時間格式不正確。" : "That rollback time is not valid.");
    return date.toISOString();
  };

  const paintSnaps = (versions, entityType, entityId) => {
    if (!snaps) return;
    if (!versions.length) {
      snaps.hidden = true;
      snaps.innerHTML = "";
      return;
    }
    snaps.hidden = false;
    snaps.innerHTML = `
      <h2 class="office-subhead">${zh() ? "快照版本" : "Snapshots"} · ${entityType} / ${entityId}</h2>
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>${zh() ? "版本" : "Ver"}</th>
              <th>${zh() ? "時間" : "When"}</th>
              <th>${zh() ? "角色" : "Role"}</th>
              <th>${zh() ? "內容" : "Snapshot"}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${versions
              .map((snap) => {
                const when = snap.created_at ? new Date(snap.created_at).toLocaleString() : "";
                const json = JSON.stringify(snap.full_snapshot || {}, null, 0);
                const preview = json.length > 140 ? `${json.slice(0, 140)}…` : json;
                return `<tr>
                  <td>v${snap.version_number}${snap.is_deleted_state ? " · del" : ""}</td>
                  <td><small>${when}</small></td>
                  <td><small>${snap.created_by_role || ""}</small></td>
                  <td><small>${preview.replace(/</g, "&lt;")}</small></td>
                  <td class="admin-row-actions">
                    <button type="button" class="btn btn-ghost" data-audit-restore="${snap.id}">${zh() ? "還原此版" : "Restore this"}</button>
                  </td>
                </tr>`;
              })
              .join("")}
          </tbody>
        </table>
      </div>
    `;
  };

  const asPreview = (value) => {
    if (!value) return { count: 0, items: [] };
    if (typeof value === "string") {
      try {
        return asPreview(JSON.parse(value));
      } catch {
        return { count: 0, items: [] };
      }
    }
    if (value.preview) return asPreview(value.preview);
    return {
      count: value.count || (value.items || []).length,
      items: value.items || [],
    };
  };

  const paintPreview = (raw) => {
    if (!previewOut) return;
    const preview = asPreview(raw);
    const items = preview.items;
    previewOut.hidden = false;
    if (!items.length) {
      previewOut.innerHTML = `<p>${zh() ? "這個時間點之後沒有可還原的變更。" : "No mutations after that time."}</p>`;
      return;
    }
    previewOut.innerHTML = `
      <p>${zh() ? `將影響 ${preview.count} 筆實體。` : `${preview.count} entities would change.`}</p>
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead><tr><th>Plan</th><th>Type</th><th>Id</th><th>Ver</th></tr></thead>
          <tbody>
            ${items
              .map(
                (item) =>
                  `<tr><td>${item.plan}</td><td>${item.entity_type}</td><td>${item.entity_id}</td><td>${item.version_number || "—"}</td></tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;
  };

  const paint = async () => {
    try {
      const rows = await listAuditLogs(120, moduleFilter?.value || null);
      if (!table) return;
      if (!rows.length) {
        table.innerHTML = `<tr><td colspan="6">${zh() ? "沒有可檢視的稽核紀錄。" : "No audit rows in your scope."}</td></tr>`;
        return;
      }
      table.innerHTML = rows
        .map((row) => {
          const when = row.created_at ? new Date(row.created_at).toLocaleString() : "";
          return `<tr>
            <td><small>${when}</small></td>
            <td>${row.actor_email || "—"}<br /><small>${row.actor_role}</small></td>
            <td>${row.module}<br /><small>${row.action}</small></td>
            <td>${row.entity_label || row.entity_id}<br /><small>${row.entity_type}</small></td>
            <td><small>${row.status}</small></td>
            <td class="admin-row-actions">
              <button type="button" class="btn btn-ghost" data-audit-versions="${row.entity_type}" data-id="${row.entity_id}">${zh() ? "快照" : "Snapshots"}</button>
            </td>
          </tr>`;
        })
        .join("");
      setStatus(zh() ? `顯示 ${rows.length} 筆（依角色過濾）。` : `Showing ${rows.length} rows in your role scope.`);
    } catch (error) {
      setStatus(error.message || "Could not load audit logs. Run schema-audit.sql.");
    }
  };

  root.querySelector("[data-audit-refresh]")?.addEventListener("click", paint);
  moduleFilter?.addEventListener("change", paint);

  root.querySelector("[data-audit-verify]")?.addEventListener("click", async () => {
    try {
      const result = await verifyAuditIntegrity();
      setStatus(
        result?.ok
          ? zh()
            ? `雜湊鏈完整，已核對 ${result.checked} 筆。`
            : `Hash chain intact across ${result.checked} rows.`
          : zh()
            ? `發現 ${result.broken} 筆被竄改，第一筆 ${result.first_break}`
            : `Chain broken on ${result.broken} rows. First ${result.first_break}`
      );
    } catch (error) {
      setStatus(error.message || "Verify failed.");
    }
  });

  table?.addEventListener("click", async (event) => {
    const btn = event.target.closest("[data-audit-versions]");
    if (!btn) return;
    try {
      const entityType = btn.getAttribute("data-audit-versions");
      const entityId = btn.getAttribute("data-id");
      const versions = await listEntityVersions(entityType, entityId);
      paintSnaps(versions, entityType, entityId);
      setStatus(
        versions.length
          ? zh()
            ? `${versions.length} 個快照。`
            : `${versions.length} snapshots.`
          : zh()
            ? "沒有可還原的版本。"
            : "No snapshots for this record."
      );
    } catch (error) {
      setStatus(error.message || "Could not load snapshots.");
    }
  });

  snaps?.addEventListener("click", async (event) => {
    const btn = event.target.closest("[data-audit-restore]");
    if (!btn) return;
    if (!window.confirm(zh() ? "還原此快照？" : "Restore this snapshot?")) return;
    try {
      await restoreAuditVersion(btn.getAttribute("data-audit-restore"), "office-restore");
      setStatus(zh() ? "已還原，並寫入 ROLLBACK_SINGLE。" : "Restored. ROLLBACK_SINGLE was logged.");
      await paint();
    } catch (error) {
      setStatus(error.message || "Restore failed.");
    }
  });

  root.querySelector("[data-audit-preview]")?.addEventListener("click", async () => {
    try {
      const preview = await previewGlobalRollback(readTarget());
      paintPreview(preview);
      setStatus(zh() ? `預覽完成：${preview.count || 0} 筆。` : `Preview ready: ${preview.count || 0} entities.`);
    } catch (error) {
      setStatus(error.message || "Preview failed.");
    }
  });

  root.querySelector("[data-audit-execute]")?.addEventListener("click", async () => {
    try {
      const iso = readTarget();
      const preview = await previewGlobalRollback(iso);
      paintPreview(preview);
      if (!window.confirm(zh() ? `這會把網站內容捲回該時間點（${preview.count || 0} 筆）。確定？` : `This rolls site content back (${preview.count || 0} entities). Continue?`)) {
        return;
      }
      const result = await executeGlobalRollback(iso);
      setStatus(zh() ? `已還原 ${result.restored} 筆。` : `Rolled back ${result.restored} entities.`);
      await paint();
    } catch (error) {
      setStatus(error.message || "Rollback failed.");
    }
  });

  window.addEventListener("immba:lang", paint);
  void paint();
}
