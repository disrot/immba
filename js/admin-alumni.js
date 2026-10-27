import { isAdminAuthed } from "./auth.js?v=notice4";
import { bindPanelDrop, refreshSelectDrop } from "./ui-drop.js?v=drop2";
import {
  DEGREES,
  FIELDS,
  deleteAlumni,
  filterAlumni,
  importAlumni,
  listAlumni,
  listAudit,
  templateCsv,
  toCsv,
  upsertAlumni,
  validateImport,
} from "./alumni-store.js?v=alumni1";

const COLS_KEY = "immba-alumni-cols";
const DEFAULT_COLS = ["full_name", "student_id", "department", "degree_program", "graduation_year", "company", "job_title"];

const root = document.querySelector("[data-alumni-admin]");
if (!root) {
  /* Alumni office lives on dashboard.html#alumni */
} else if (!isAdminAuthed()) {
  window.location.replace("login.html");
} else {
  void (async () => {
    const form = root.querySelector("[data-alumni-form]");
    const table = root.querySelector("[data-alumni-table]");
    const status = root.querySelector("[data-alumni-status]");
    const audit = root.querySelector("[data-alumni-audit]");
    const field = (name) => form.elements.namedItem(name);
    let rows = [];
    let logs = [];
    let cols = [];

    const zh = () => document.body?.dataset.lang === "zh";
    const setStatus = (message) => {
      if (status) status.textContent = message;
    };

    const loadCols = () => {
      try {
        const parsed = JSON.parse(localStorage.getItem(COLS_KEY) || "null");
        if (Array.isArray(parsed) && parsed.length) return parsed.filter((key) => FIELDS.some((field) => field.key === key));
      } catch {
        /* keep defaults */
      }
      return [...DEFAULT_COLS];
    };

    const saveCols = () => localStorage.setItem(COLS_KEY, JSON.stringify(cols));

    const unique = (key) => [...new Set(rows.map((row) => row[key]).filter(Boolean))].sort();

    const fill = (row) => {
      field("id").value = row?.id || "";
      field("full_name").value = row?.full_name || "";
      field("student_id").value = row?.student_id || "";
      field("department").value = row?.department || "";
      field("degree_program").value = DEGREES.includes(row?.degree_program) ? row.degree_program : "Master";
      field("admission_year").value = row?.admission_year || "";
      field("graduation_year").value = row?.graduation_year || "";
      field("email").value = row?.email || "";
      field("phone").value = row?.phone || "";
      field("company").value = row?.company || "";
      field("job_title").value = row?.job_title || "";
      field("notes").value = row?.notes || "";
    };

    const readForm = () => ({
      id: field("id").value.trim(),
      full_name: field("full_name").value.trim(),
      student_id: field("student_id").value.trim(),
      department: field("department").value.trim(),
      degree_program: field("degree_program").value,
      admission_year: field("admission_year").value.trim(),
      graduation_year: field("graduation_year").value.trim(),
      email: field("email").value.trim(),
      phone: field("phone").value.trim(),
      company: field("company").value.trim(),
      job_title: field("job_title").value.trim(),
      notes: field("notes").value.trim(),
    });

    const filters = () => ({
      q: root.querySelector("[data-alumni-q]")?.value || "",
      degree: root.querySelector("[data-alumni-degree]")?.value || "",
      year: root.querySelector("[data-alumni-year]")?.value || "",
      department: root.querySelector("[data-alumni-dept]")?.value || "",
      company: root.querySelector("[data-alumni-company]")?.value || "",
    });

    const visible = () => filterAlumni(rows, filters());

    const paintFilters = () => {
      const fillSelect = (node, values, all) => {
        if (!node) return;
        const current = node.value;
        node.innerHTML = `<option value="">${all}</option>${values.map((value) => `<option value="${value}">${value}</option>`).join("")}`;
        if (values.includes(current)) node.value = current;
        refreshSelectDrop(node);
      };
      fillSelect(root.querySelector("[data-alumni-degree]"), DEGREES, zh() ? "全部學制" : "All degrees");
      fillSelect(root.querySelector("[data-alumni-year]"), unique("graduation_year"), zh() ? "全部畢業年" : "All graduation years");
      fillSelect(root.querySelector("[data-alumni-dept]"), unique("department"), zh() ? "全部系所" : "All departments");
      fillSelect(root.querySelector("[data-alumni-company]"), unique("company"), zh() ? "全部公司" : "All companies");
    };

    const paintCols = () => {
      const box = root.querySelector("[data-alumni-cols]");
      if (!box) return;
      box.innerHTML = FIELDS.map((field) => {
        const on = cols.includes(field.key);
        return `<label><input type="checkbox" value="${field.key}" ${on ? "checked" : ""} /> ${zh() && field.key === "full_name" ? "姓名" : field.label}</label>`;
      }).join("");
    };

    const paintTable = () => {
      const list = visible();
      const count = root.querySelector("[data-alumni-count]");
      if (count) count.textContent = zh() ? `${list.length} 筆` : `${list.length} records`;
      const head = root.querySelector("[data-alumni-head]");
      if (head) {
        head.innerHTML = `<tr>${cols.map((key) => `<th>${FIELDS.find((field) => field.key === key)?.label || key}</th>`).join("")}<th></th></tr>`;
      }
      if (!table) return;
      if (!list.length) {
        table.innerHTML = `<tr><td colspan="${cols.length + 1}">${zh() ? "沒有符合的校友。" : "No alumni match these filters."}</td></tr>`;
        return;
      }
      table.innerHTML = list
        .map((row) => {
          const cells = cols.map((key) => `<td>${row[key] || "—"}</td>`).join("");
          return `<tr>
            ${cells}
            <td class="admin-row-actions"><div class="admin-actions">
              <button type="button" class="btn btn-ghost" data-alumni-edit="${row.id}">Edit</button>
              <button type="button" class="btn btn-ghost" data-alumni-del="${row.id}">Delete</button>
            </div></td>
          </tr>`;
        })
        .join("");
    };

    const paintAudit = () => {
      if (!audit) return;
      if (!logs.length) {
        audit.innerHTML = `<p>${zh() ? "尚無操作紀錄。" : "No activity yet."}</p>`;
        return;
      }
      audit.innerHTML = logs
        .map((row) => {
          const when = row.created_at ? new Date(row.created_at).toLocaleString() : "";
          return `<li>
            <strong>${row.action}</strong>
            ${row.record_label || row.record_id || ""}
            <small>${row.actor_email} · ${when}</small>
            <span>${row.summary || ""}</span>
          </li>`;
        })
        .join("");
    };

    const reload = async () => {
      rows = await listAlumni();
      logs = await listAudit();
      paintFilters();
      paintTable();
      paintAudit();
    };

    cols = loadCols();
    paintCols();
    bindPanelDrop(root.querySelector("[data-alumni-col-drop]"));
    try {
      await reload();
      setStatus(zh() ? "校友資料已從雲端載入。" : "Alumni loaded from the shared database.");
    } catch (error) {
      setStatus(error.message || "Could not load alumni. Run schema-alumni.sql.");
    }

    root.querySelector("[data-alumni-q]")?.addEventListener("input", paintTable);
    root.querySelectorAll("[data-alumni-degree], [data-alumni-year], [data-alumni-dept], [data-alumni-company]").forEach((node) => {
      node.addEventListener("change", paintTable);
    });

    root.querySelector("[data-alumni-cols]")?.addEventListener("change", (event) => {
      const box = event.target;
      if (box?.type !== "checkbox") return;
      cols = [...root.querySelectorAll("[data-alumni-cols] input:checked")].map((node) => node.value);
      if (!cols.length) cols = ["full_name"];
      saveCols();
      paintTable();
    });

    form?.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        const saved = await upsertAlumni(readForm());
        fill(saved);
        await reload();
        setStatus(zh() ? "已儲存，並寫入稽核紀錄。" : "Saved. An audit record was written.");
      } catch (error) {
        setStatus(error.message || "Could not save alumni.");
      }
    });

    root.querySelector("[data-alumni-new]")?.addEventListener("click", () => {
      fill({ degree_program: "Master" });
      setStatus(zh() ? "新增校友" : "New alumni record");
      field("full_name")?.focus();
    });

    table?.addEventListener("click", async (event) => {
      const edit = event.target.closest("[data-alumni-edit]")?.getAttribute("data-alumni-edit");
      const del = event.target.closest("[data-alumni-del]")?.getAttribute("data-alumni-del");
      if (edit) {
        fill(rows.find((row) => row.id === edit));
        setStatus(zh() ? "編輯校友" : "Editing alumni record");
        form?.scrollIntoView({ block: "nearest" });
      }
      if (del && window.confirm(zh() ? "刪除此校友？會留下稽核紀錄。" : "Delete this alumni record? An audit entry will be kept.")) {
        try {
          await deleteAlumni(del);
          if (field("id").value === del) fill({ degree_program: "Master" });
          await reload();
          setStatus(zh() ? "已刪除。" : "Deleted.");
        } catch (error) {
          setStatus(error.message || "Could not delete.");
        }
      }
    });

    const download = (name, text) => {
      const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      link.click();
      URL.revokeObjectURL(url);
    };

    root.querySelector("[data-alumni-template]")?.addEventListener("click", () => download("alumni-template.csv", templateCsv()));

    root.querySelector("[data-alumni-export]")?.addEventListener("click", () => {
      download("alumni-filtered.csv", toCsv(visible()));
      setStatus(zh() ? "已匯出目前篩選結果。" : "Exported the filtered list.");
    });

    root.querySelector("[data-alumni-file]")?.addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;
      const text = await file.text();
      const result = validateImport(text, rows);
      if (result.errors.length && !result.rows.length) {
        setStatus(result.errors.slice(0, 6).join(" "));
        return;
      }
      if (!result.rows.length) {
        setStatus(zh() ? "沒有可匯入的列。" : "No valid rows to import.");
        return;
      }
      const extra = result.errors.length ? ` ${result.errors.slice(0, 3).join(" ")}` : "";
      if (!window.confirm(`${zh() ? "匯入" : "Import"} ${result.rows.length} ${zh() ? "筆？" : "records?"}${extra}`)) return;
      try {
        const saved = await importAlumni(result.rows);
        await reload();
        setStatus(`${zh() ? "已匯入" : "Imported"} ${saved}.${extra}`);
      } catch (error) {
        setStatus(error.message || "Import failed.");
      }
    });

    window.addEventListener("immba:lang", () => {
      paintFilters();
      paintCols();
      paintTable();
      paintAudit();
    });
  })();
}
