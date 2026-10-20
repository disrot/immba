import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./supabase-config.js";

const URL_KEY = "immba-supabase-url";
const ANON_KEY = "immba-supabase-anon-key";

const envOf = (name) => {
  try {
    const value = import.meta.env?.[name];
    return value ? String(value).trim() : "";
  } catch {
    return "";
  }
};

export const getSupabase = () => {
  const url = (
    envOf("VITE_SUPABASE_URL") ||
    SUPABASE_URL ||
    localStorage.getItem(URL_KEY) ||
    ""
  ).replace(/\/$/, "");
  const key =
    envOf("VITE_SUPABASE_ANON_KEY") ||
    SUPABASE_ANON_KEY ||
    localStorage.getItem(ANON_KEY) ||
    "";
  return { url, key };
};

export const isCloud = () => {
  const { url, key } = getSupabase();
  return Boolean(url && key);
};

export const saveSupabaseConnection = (url, key) => {
  localStorage.setItem(URL_KEY, String(url || "").trim().replace(/\/$/, ""));
  localStorage.setItem(ANON_KEY, String(key || "").trim());
};

export const rest = async (path, { method = "GET", body, headers: extra } = {}) => {
  const { url, key } = getSupabase();
  if (!url || !key) throw new Error("Supabase is not connected");
  const res = await fetch(`${url}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...extra,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
};

export const uploadFacultyPhoto = async (file, filename) => {
  const { url, key } = getSupabase();
  if (!url || !key) throw new Error("Supabase is not connected");
  const safe = String(filename || file.name || `photo-${Date.now()}.jpg`).replace(/[^\w.\-]+/g, "-");
  const res = await fetch(`${url}/storage/v1/object/faculty-photos/${safe}`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": file.type || "image/jpeg",
      "x-upsert": "true",
    },
    body: file,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return `${url}/storage/v1/object/public/faculty-photos/${safe}`;
};
