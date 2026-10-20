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

const AUTH_KEY = "immba-auth";
const OFFICE_OK = "immba-office-ok";

export const getAuthSession = () => {
  try {
    return JSON.parse(localStorage.getItem(AUTH_KEY) || "null");
  } catch {
    return null;
  }
};

export const saveAuthSession = (session) => {
  if (!session) {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(OFFICE_OK);
    return;
  }
  localStorage.setItem(AUTH_KEY, JSON.stringify(session));
  if (session.role === "admin" || session.role === "super_admin") {
    localStorage.setItem(OFFICE_OK, "1");
  } else {
    localStorage.removeItem(OFFICE_OK);
  }
};

export const authHeaders = () => {
  const { url, key } = getSupabase();
  const token = getAuthSession()?.access_token || key;
  return {
    url,
    key,
    headers: {
      apikey: key,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };
};

export const authApi = async (path, { method = "POST", body, token } = {}) => {
  const { url, key } = getSupabase();
  if (!url || !key) throw new Error("Supabase is not connected");
  const res = await fetch(`${url}/auth/v1/${path}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${token || key}`,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(data.error_description || data.msg || data.error || res.statusText);
  return data;
};

export const rest = async (path, { method = "GET", body, headers: extra, anon = false } = {}) => {
  const { url, key } = getSupabase();
  if (!url || !key) throw new Error("Supabase is not connected");
  const token = (!anon && getAuthSession()?.access_token) || key;
  const res = await fetch(`${url}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(method === "GET" ? { "Cache-Control": "no-cache" } : {}),
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
  const path = `faculty/${safe}`;
  const res = await fetch(`${url}/storage/v1/object/faculty-photos/${path}`, {
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
  return `${url}/storage/v1/object/public/faculty-photos/${path}`;
};

export const uploadMarketPhoto = async (file, filename) => {
  const { url, key } = getSupabase();
  if (!url || !key) throw new Error("Supabase is not connected");
  const safe = String(filename || file.name || `photo-${Date.now()}.jpg`).replace(/[^\w.\-]+/g, "-");
  const path = `listings/${safe}`;
  const res = await fetch(`${url}/storage/v1/object/marketplace-photos/${path}`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${getAuthSession()?.access_token || key}`,
      "Content-Type": file.type || "image/jpeg",
      "x-upsert": "true",
    },
    body: file,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return `${url}/storage/v1/object/public/marketplace-photos/${path}`;
};
