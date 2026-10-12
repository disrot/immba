import {
  autoTranslate,
  deleteNews,
  getNewsById,
  loadNews,
  restoreDefaultNews,
  upsertNews,
} from "./news-store.js";
import { isAdminAuthed } from "./auth.js";

const form = document.querySelector("[data-admin-form]");
const table = document.querySelector("[data-admin-table]");
const preview = document.querySelector("[data-admin-preview]");
const statusNode = document.querySelector("[data-admin-status]");

if (!form || !table) {
  /* AdminNews markup is only on admin.html */
} else if (!isAdminAuthed()) {
  window.location.replace("login.html");
} else {
  const field = (name) => form.elements.namedItem(name);

  const setStatus = (message) => {
    if (statusNode) statusNode.textContent = message;
  };

  const readForm = () => ({
    id: field("id").value || `n-${Date.now()}`,
    date: field("date").value,
    linkUrl: field("linkUrl").value.trim(),
    order: Number(field("order").value) || 1,
    status: field("status").value,
    title: {
      zh: field("titleZh").value.trim(),
      en: field("titleEn").value.trim(),
    },
    content: {
      zh: field("contentZh").value.trim(),
      en: field("contentEn").value.trim(),
    },
  });

  const fillForm = (item) => {
    field("id").value = item?.id || "";
    field("date").value = item?.date || new Date().toISOString().slice(0, 10);
    field("linkUrl").value = item?.linkUrl || "";
    field("order").value = item?.order || loadNews().length + 1;
    field("status").value = item?.status || "published";
    field("titleZh").value = item?.title?.zh || "";
    field("titleEn").value = item?.title?.en || "";
    field("contentZh").value = item?.content?.zh || "";
    field("contentEn").value = item?.content?.en || "";
    renderPreview();
  };

  const paragraphs = (text) =>
    String(text || "")
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => `<p>${line.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</p>`)
      .join("");

  const renderPreview = () => {
    if (!preview) return;
    const item = readForm();
    preview.innerHTML = `
      <div class="admin-preview-col">
        <p class="label">中文</p>
        <h3>${item.title.zh || "—"}</h3>
        ${paragraphs(item.content.zh) || "<p>—</p>"}
      </div>
      <div class="admin-preview-col">
        <p class="label">English</p>
        <h3>${item.title.en || "—"}</h3>
        ${paragraphs(item.content.en) || "<p>—</p>"}
      </div>
    `;
  };

  const renderTable = () => {
    const rows = loadNews().sort((a, b) => a.order - b.order || b.date.localeCompare(a.date));
    table.innerHTML = rows
      .map(
        (item) => `
        <tr>
          <td>${item.order}</td>
          <td>${item.date.replaceAll("-", "/")}</td>
          <td>${item.status}</td>
          <td>${item.title.zh || "—"}</td>
          <td>${item.title.en || "—"}</td>
          <td class="admin-actions">
            <button type="button" class="btn btn-ghost" data-edit="${item.id}">Edit</button>
            <button type="button" class="btn btn-ghost" data-delete="${item.id}">Delete</button>
          </td>
        </tr>`
      )
      .join("");
  };

  const resetNew = () => {
    fillForm({
      id: `n-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      linkUrl: "",
      order: loadNews().length + 1,
      status: "published",
      title: { en: "", zh: "" },
      content: { en: "", zh: "" },
    });
    field("linkUrl").value = `announcement.html?id=${field("id").value}`;
    setStatus("New bilingual announcement");
  };

  form.addEventListener("input", renderPreview);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const item = readForm();
    if (!item.title.zh && !item.title.en) {
      setStatus("Please enter a Chinese or English title.");
      return;
    }
    if (!item.linkUrl) item.linkUrl = `announcement.html?id=${item.id}`;
    upsertNews(item);
    renderTable();
    setStatus("Saved. Chinese and English were stored as one record.");
  });

  table.addEventListener("click", (event) => {
    const editId = event.target.closest("[data-edit]")?.getAttribute("data-edit");
    const deleteId = event.target.closest("[data-delete]")?.getAttribute("data-delete");
    if (editId) {
      fillForm(getNewsById(editId));
      setStatus("Editing both language versions.");
      form.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    if (deleteId && window.confirm("Delete this announcement in both languages?")) {
      deleteNews(deleteId);
      renderTable();
      if (field("id").value === deleteId) resetNew();
      setStatus("Deleted Chinese and English together.");
    }
  });

  document.querySelector("[data-admin-new]")?.addEventListener("click", resetNew);

  document.querySelector("[data-admin-restore]")?.addEventListener("click", () => {
    if (!window.confirm("Restore the default announcement list? This replaces the current list.")) return;
    restoreDefaultNews();
    renderTable();
    resetNew();
    setStatus("Default announcement list restored.");
  });

  const runTranslate = async (from) => {
    const item = readForm();
    setStatus("Translating… you can edit the result before saving.");
    if (from === "zh") {
      if (item.title.zh) field("titleEn").value = await autoTranslate(item.title.zh, "zh");
      if (item.content.zh) field("contentEn").value = await autoTranslate(item.content.zh, "zh");
    } else {
      if (item.title.en) field("titleZh").value = await autoTranslate(item.title.en, "en");
      if (item.content.en) field("contentZh").value = await autoTranslate(item.content.en, "en");
    }
    renderPreview();
    setStatus("Auto-translate filled the other language. Edit if needed, then save.");
  };

  document.querySelector("[data-translate-en]")?.addEventListener("click", () => runTranslate("zh"));
  document.querySelector("[data-translate-zh]")?.addEventListener("click", () => runTranslate("en"));

  renderTable();
  resetNew();
}
