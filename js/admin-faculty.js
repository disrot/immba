import { isAdminAuthed } from "./auth.js?v=auth3";
import { getSupabase, saveSupabaseConnection } from "./supabase.js?v=auth3";
import {
  cloudStatus,
  deleteFaculty,
  facultyPhotoSrc,
  listFacultyRows,
  previewReorder,
  reorderFaculty,
  seedLocalFaculty,
  uploadPhoto,
  upsertFaculty,
} from "./faculty-store.js?v=order1";

const root = document.querySelector("[data-faculty-admin]");

if (!root) {
  /* AdminFaculty lives on dashboard.html */
} else if (!isAdminAuthed()) {
  window.location.replace("login.html");
} else {
  void (async () => {
    const form = root.querySelector("[data-faculty-form]");
    const table = root.querySelector("[data-faculty-table]");
    const status = root.querySelector("[data-faculty-status]");
    const connect = root.querySelector("[data-faculty-connect]");
    const field = (name) => form.elements.namedItem(name);
    let rows = [];
    let busy = false;

    const setStatus = (message) => {
      if (status) status.textContent = message;
    };

    const paintConnection = () => {
      const { url, key } = getSupabase();
      if (connect) {
        connect.elements.namedItem("url").value = url;
        connect.elements.namedItem("key").value = key;
      }
      const badge = root.querySelector("[data-faculty-cloud]");
      const info = cloudStatus();
      if (badge) {
        badge.textContent = info.cloud
          ? `Cloud · ${info.url.replace(/^https:\/\//, "")}`
          : "Local prototype (connect Supabase to sync the Faculty page)";
      }
    };

    const fill = (row) => {
      field("id").value = row?.id || "";
      field("name").value = row?.name || "";
      field("last_name").value = row?.last_name || "";
      field("title").value = row?.title || "";
      field("title_zh").value = row?.title_zh || "";
      field("department").value = row?.department || "";
      field("department_zh").value = row?.department_zh || "";
      field("education").value = row?.education || "";
      field("education_zh").value = row?.education_zh || "";
      field("research_fields").value = row?.research_fields || "";
      field("research_fields_zh").value = row?.research_fields_zh || "";
      field("email").value = row?.email || "";
      field("phone").value = row?.phone || "";
      field("website").value = row?.website || "";
      field("image_url").value = row?.image_url || "";
      field("category").value = row?.category === "adjunct" ? "adjunct" : "fulltime";
      field("rank").value = row?.rank || "associate";
      field("sort_order").value = row?.sort_order || rows.length + 1;
      const preview = root.querySelector("[data-faculty-preview]");
      if (preview) {
        const src = facultyPhotoSrc(row?.image_url || "");
        preview.hidden = !row?.image_url;
        preview.src = src;
      }
    };

    const readForm = () => ({
      id: field("id").value.trim(),
      name: field("name").value.trim(),
      last_name: field("last_name").value.trim(),
      title: field("title").value.trim(),
      title_zh: field("title_zh").value.trim(),
      department: field("department").value.trim(),
      department_zh: field("department_zh").value.trim(),
      education: field("education").value.trim(),
      education_zh: field("education_zh").value.trim(),
      research_fields: field("research_fields").value.trim(),
      research_fields_zh: field("research_fields_zh").value.trim(),
      email: field("email").value.trim(),
      phone: field("phone").value.trim(),
      website: field("website").value.trim(),
      image_url: field("image_url").value.trim(),
      category: field("category").value,
      rank: field("rank").value,
      sort_order: Number(field("sort_order").value) || rows.length + 1,
    });

    const render = () => {
      table.innerHTML = rows
        .map(
          (row, index) => `<tr>
            <td>${row.sort_order}</td>
            <td><img class="faculty-admin-thumb" src="${facultyPhotoSrc(row.image_url)}" alt="" width="48" height="48" /></td>
            <td>${row.name}</td>
            <td>${row.title}</td>
            <td>${row.category}</td>
            <td class="admin-row-actions"><div class="admin-actions">
              <button type="button" class="btn btn-ghost" data-faculty-up="${row.id}"${index === 0 ? " disabled" : ""}>Up</button>
              <button type="button" class="btn btn-ghost" data-faculty-down="${row.id}"${index === rows.length - 1 ? " disabled" : ""}>Down</button>
              <button type="button" class="btn btn-ghost" data-faculty-edit="${row.id}">Edit</button>
              <button type="button" class="btn btn-ghost" data-faculty-delete="${row.id}">Delete</button>
            </div></td>
          </tr>`
        )
        .join("");
    };

    const reload = async () => {
      rows = await listFacultyRows();
      render();
      paintConnection();
    };

    connect?.addEventListener("submit", (event) => {
      event.preventDefault();
      saveSupabaseConnection(connect.elements.namedItem("url").value, connect.elements.namedItem("key").value);
      paintConnection();
      setStatus("Connection saved in this browser. Run schema.sql in Supabase, then seed.");
      void reload();
    });

    root.querySelector("[data-faculty-new]")?.addEventListener("click", () => {
      fill({ sort_order: rows.length + 1, category: "fulltime", rank: "associate" });
      field("name").focus();
    });

    root.querySelector("[data-faculty-seed]")?.addEventListener("click", async () => {
      setStatus("Pushing local prototype to the faculty table…");
      try {
        rows = await seedLocalFaculty();
        render();
        setStatus("Local faculty is now in the connected table (or this browser if cloud is off).");
      } catch (error) {
        setStatus(error.message || "Seed failed. Check schema.sql, RLS, and the anon key.");
      }
    });

    table?.addEventListener("click", async (event) => {
      if (busy) return;
      const edit = event.target.closest("[data-faculty-edit]");
      const remove = event.target.closest("[data-faculty-delete]");
      const up = event.target.closest("[data-faculty-up]");
      const down = event.target.closest("[data-faculty-down]");
      if (edit) {
        fill(rows.find((row) => row.id === edit.getAttribute("data-faculty-edit")));
        return;
      }
      if (remove) {
        const id = remove.getAttribute("data-faculty-delete");
        if (!id || !window.confirm("Delete this faculty record?")) return;
        try {
          rows = await deleteFaculty(id);
          render();
          if (field("id").value === id) fill(null);
          setStatus("Deleted in Supabase. The public Faculty page will drop this person on refresh.");
        } catch (error) {
          setStatus(error.message || "Delete failed.");
        }
        return;
      }
      if (up || down) {
        const id = (up || down).getAttribute(up ? "data-faculty-up" : "data-faculty-down");
        const direction = up ? "up" : "down";
        const preview = previewReorder(rows, id, direction);
        if (!preview.moved) {
          setStatus(direction === "up" ? "Already at the top." : "Already at the bottom.");
          return;
        }
        rows = preview.rows;
        render();
        setStatus("Saving order…");
        busy = true;
        try {
          rows = await reorderFaculty(id, direction);
          render();
          setStatus("Order saved in Supabase. The public Faculty page uses the same sort_order.");
        } catch (error) {
          rows = await listFacultyRows();
          render();
          setStatus(error.message || "Reorder failed.");
        } finally {
          busy = false;
        }
      }
    });

    form?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const row = readForm();
      if (!row.name) {
        setStatus("Name is required.");
        return;
      }
      try {
        const file = field("photo")?.files?.[0];
        if (file) row.image_url = await uploadPhoto(file);
        rows = await upsertFaculty(row);
        render();
        fill(rows.find((item) => item.id === row.id || item.name === row.name) || row);
        field("photo").value = "";
        setStatus("Saved in Supabase. The public Faculty page reads this same table.");
      } catch (error) {
        setStatus(error.message || "Save failed.");
      }
    });

    await reload();
    fill(null);
    setStatus("");
  })();
}
