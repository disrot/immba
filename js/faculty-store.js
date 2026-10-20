import { LOCAL_FACULTY } from "./faculty-data.js";
import { getSupabase, isCloud, rest, uploadFacultyPhoto } from "./supabase.js";

const CACHE = "immba-faculty-rows";

const splitRole = (role) => {
  const text = String(role || "");
  const index = text.search(/[,，]/);
  if (index < 0) return { title: text.trim(), department: "" };
  return { title: text.slice(0, index).trim(), department: text.slice(index + 1).trim() };
};

const categoryFromType = (type) => (type === "parttime" ? "adjunct" : "fulltime");

export const localToRow = (person, index) => {
  const en = splitRole(person.en.role);
  const zh = splitRole(person.zh.role);
  const photo = person.photo || "";
  return {
    id: person.id,
    name: person.name,
    title: en.title,
    education: person.en.education,
    research_fields: person.en.specialties,
    email: person.email || "",
    phone: person.tel || "",
    website: person.website || "",
    image_url: /^https?:\/\//i.test(photo) || photo.includes("/") ? photo : `images/faculty/${photo}`,
    category: categoryFromType(person.type),
    sort_order: index + 1,
    last_name: person.last || "",
    rank: person.type || "associate",
    department: en.department,
    title_zh: zh.title,
    education_zh: person.zh.education,
    research_fields_zh: person.zh.specialties,
    department_zh: zh.department,
  };
};

export const rowToPerson = (row) => ({
  id: row.id,
  last: row.last_name || String(row.name || "").split(" ").pop() || "",
  type: row.rank || (row.category === "adjunct" ? "parttime" : "associate"),
  photo: row.image_url || "",
  name: row.name || "",
  website: row.website || "",
  email: row.email || "",
  tel: row.phone || "",
  en: {
    role: [row.title, row.department].filter(Boolean).join(", "),
    education: row.education || "",
    specialties: row.research_fields || "",
  },
  zh: {
    role: [row.title_zh || row.title, row.department_zh || row.department].filter(Boolean).join(", "),
    education: row.education_zh || row.education || "",
    specialties: row.research_fields_zh || row.research_fields || "",
  },
});

export const facultyPhotoSrc = (value) => {
  if (!value) return "";
  if (/^https?:\/\//i.test(value) || value.startsWith("data:") || value.includes("/")) return value;
  return `images/faculty/${value}`;
};

const localRows = () => LOCAL_FACULTY.map(localToRow);

const readCache = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(CACHE) || "null");
    return Array.isArray(parsed) && parsed.length ? parsed : null;
  } catch {
    return null;
  }
};

const writeCache = (rows) => {
  localStorage.setItem(CACHE, JSON.stringify(rows));
  return rows;
};

const sortRows = (rows) =>
  [...rows].sort((a, b) => (a.sort_order - b.sort_order) || String(a.name).localeCompare(String(b.name)));

export const listFacultyRows = async () => {
  if (isCloud()) {
    try {
      const rows = await rest("faculty?select=*&order=sort_order.asc,name.asc");
      if (Array.isArray(rows) && rows.length) return writeCache(sortRows(rows));
    } catch (error) {
      console.warn("faculty cloud list failed", error);
    }
  }
  return sortRows(readCache() || localRows());
};

export const listFaculty = async () => (await listFacultyRows()).map(rowToPerson);

const payload = (row) => ({
  id: row.id,
  name: row.name,
  title: row.title || "",
  education: row.education || "",
  research_fields: row.research_fields || "",
  email: row.email || "",
  phone: row.phone || "",
  website: row.website || "",
  image_url: row.image_url || "",
  category: row.category === "adjunct" ? "adjunct" : "fulltime",
  sort_order: Number(row.sort_order) || 0,
  last_name: row.last_name || "",
  rank: row.rank || "associate",
  department: row.department || "",
  title_zh: row.title_zh || "",
  education_zh: row.education_zh || "",
  research_fields_zh: row.research_fields_zh || "",
  department_zh: row.department_zh || "",
});

export const upsertFaculty = async (row) => {
  const next = payload({
    ...row,
    id: row.id || `f-${Date.now()}`,
  });
  if (isCloud()) {
    const existing = await rest(`faculty?id=eq.${encodeURIComponent(next.id)}&select=id`);
    if (existing?.length) {
      await rest(`faculty?id=eq.${encodeURIComponent(next.id)}`, { method: "PATCH", body: next });
    } else {
      await rest("faculty", { method: "POST", body: next });
    }
    return listFacultyRows();
  }
  const rows = await listFacultyRows();
  const index = rows.findIndex((item) => item.id === next.id);
  if (index >= 0) rows[index] = { ...rows[index], ...next };
  else rows.push(next);
  return writeCache(sortRows(rows));
};

export const deleteFaculty = async (id) => {
  if (isCloud()) {
    await rest(`faculty?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
    return listFacultyRows();
  }
  return writeCache((await listFacultyRows()).filter((row) => row.id !== id));
};

export const reorderFaculty = async (id, direction) => {
  const rows = await listFacultyRows();
  const index = rows.findIndex((row) => row.id === id);
  const swap = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || swap < 0 || swap >= rows.length) return rows;
  const a = rows[index];
  const b = rows[swap];
  const orderA = a.sort_order;
  a.sort_order = b.sort_order;
  b.sort_order = orderA;
  if (a.sort_order === b.sort_order) {
    a.sort_order = index + 1;
    b.sort_order = swap + 1;
  }
  if (isCloud()) {
    await rest(`faculty?id=eq.${encodeURIComponent(a.id)}`, { method: "PATCH", body: { sort_order: a.sort_order } });
    await rest(`faculty?id=eq.${encodeURIComponent(b.id)}`, { method: "PATCH", body: { sort_order: b.sort_order } });
    return listFacultyRows();
  }
  return writeCache(sortRows(rows));
};

export const seedLocalFaculty = async () => {
  const rows = localRows();
  if (isCloud()) {
    for (const row of rows) {
      await upsertFaculty(row);
    }
    return listFacultyRows();
  }
  return writeCache(rows);
};

export const uploadPhoto = async (file) => {
  const name = `${Date.now()}-${file.name || "photo.jpg"}`;
  if (isCloud()) return uploadFacultyPhoto(file, name);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read"));
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(file);
  });
};

export const cloudStatus = () => {
  const { url } = getSupabase();
  return { cloud: isCloud(), url };
};
