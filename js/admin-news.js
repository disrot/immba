import {
  autoTranslate,
  deleteNews,
  getNewsById,
  hydrateNews,
  loadNews,
  restoreDefaultNews,
  upsertNews,
} from "./news-store.js";
import { isAdminAuthed } from "./auth.js";

const form = document.querySelector("[data-admin-form]");
const table = document.querySelector("[data-admin-table]");
const preview = document.querySelector("[data-admin-preview]");
const statusNodes = document.querySelectorAll("[data-admin-status], [data-admin-compose-status]");

if (!form || !table) {
  /* AdminNews markup is only on admin.html */
} else if (!isAdminAuthed()) {
  window.location.replace("login.html");
} else {
  void (async () => {
  await hydrateNews();
  const field = (name) => form.elements.namedItem(name);
  const photoList = document.querySelector("[data-admin-photo-list]");
  const MAX_PHOTOS = 8;
  let photos = [];

  const setStatus = (message) => {
    statusNodes.forEach((node) => {
      node.textContent = message;
    });
  };

  const compressImage = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("read"));
      reader.onload = () => {
        const image = new Image();
        image.onerror = () => reject(new Error("image"));
        image.onload = () => {
          const max = 960;
          const scale = Math.min(1, max / Math.max(image.width, image.height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(image.width * scale));
          canvas.height = Math.max(1, Math.round(image.height * scale));
          const context = canvas.getContext("2d");
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          resolve({
            src: canvas.toDataURL("image/jpeg", 0.64),
            name: file.name || "photo.jpg",
          });
        };
        image.src = reader.result;
      };
      reader.readAsDataURL(file);
    });

  const renderPhotos = () => {
    if (!photoList) return;
    if (!photos.length) {
      photoList.innerHTML = "";
      return;
    }
    photoList.innerHTML = photos
      .map(
        (photo, index) => `
        <figure class="admin-photo-item">
          <img src="${photo.src}" alt="" />
          <button type="button" class="btn btn-ghost" data-remove-photo="${index}" data-i18n="admin.removePhoto">Remove</button>
        </figure>`
      )
      .join("");
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
    photos,
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
    if (field("photos")) field("photos").value = "";
    photos = Array.isArray(item?.photos) ? item.photos.map((photo) => ({ ...photo })) : [];
    renderPhotos();
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
        ${photos.map((photo) => `<img src="${photo.src}" alt="" />`).join("")}
      </div>
      <div class="admin-preview-col">
        <p class="label">English</p>
        <h3>${item.title.en || "—"}</h3>
        ${paragraphs(item.content.en) || "<p>—</p>"}
        ${photos.map((photo) => `<img src="${photo.src}" alt="" />`).join("")}
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
          <td class="admin-row-actions">
            <div class="admin-actions">
              <button type="button" class="btn btn-ghost" data-edit="${item.id}">Edit</button>
              <button type="button" class="btn btn-ghost" data-delete="${item.id}">Delete</button>
            </div>
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
      photos: [],
    });
    field("linkUrl").value = `announcement.html?id=${field("id").value}`;
    setStatus("New bilingual announcement");
  };

  form.addEventListener("input", renderPreview);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const item = readForm();
    if (!item.title.zh && !item.title.en) {
      setStatus("Please enter a Chinese or English title.");
      return;
    }
    if (!item.linkUrl) item.linkUrl = `announcement.html?id=${item.id}`;
    try {
      await upsertNews(item);
      renderTable();
      const open = document.querySelector("[data-admin-open]");
      if (open) {
        open.hidden = false;
        open.setAttribute("href", item.linkUrl);
      }
      setStatus("Saved. Open the post on the website to confirm it is live in this browser.");
    } catch {
      setStatus("Could not save this post. Try fewer photos, then save again.");
    }
  });

  form.addEventListener("change", async (event) => {
    if (event.target?.name !== "photos") return;
    const files = [...(event.target.files || [])].filter((file) => file.type.startsWith("image/"));
    if (!files.length) return;
    const room = Math.max(0, MAX_PHOTOS - photos.length);
    if (!room) {
      setStatus(`You can attach up to ${MAX_PHOTOS} photos.`);
      event.target.value = "";
      return;
    }
    setStatus("Adding photos…");
    try {
      const next = [];
      for (const file of files.slice(0, room)) {
        next.push(await compressImage(file));
      }
      photos = [...photos, ...next];
      renderPhotos();
      renderPreview();
      setStatus(next.length === 1 ? "Photo attached. Save to publish it." : `${next.length} photos attached. Save to publish them.`);
    } catch {
      setStatus("Could not read one of the photos. Try another file.");
    }
    event.target.value = "";
  });

  photoList?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove-photo]");
    if (!button) return;
    const index = Number(button.getAttribute("data-remove-photo"));
    photos = photos.filter((_, i) => i !== index);
    renderPhotos();
    renderPreview();
  });

  table.addEventListener("click", async (event) => {
    const editId = event.target.closest("[data-edit]")?.getAttribute("data-edit");
    const deleteId = event.target.closest("[data-delete]")?.getAttribute("data-delete");
    if (editId) {
      fillForm(getNewsById(editId));
      setStatus("Editing both language versions.");
      window.dispatchEvent(new CustomEvent("immba:office-go", { detail: "compose" }));
    }
    if (deleteId && window.confirm("Delete this announcement in both languages?")) {
      await deleteNews(deleteId);
      renderTable();
      if (field("id").value === deleteId) resetNew();
      setStatus("Deleted Chinese and English together.");
    }
  });

  document.querySelector("[data-admin-new]")?.addEventListener("click", resetNew);

  document.querySelector("[data-admin-restore]")?.addEventListener("click", async () => {
    if (!window.confirm("Restore the default announcement list? This replaces the current list.")) return;
    await restoreDefaultNews();
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
  })();
}
