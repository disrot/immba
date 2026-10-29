import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./supabase-config.js";

const envOf = (name) => {
  try {
    const value = import.meta.env?.[name];
    return value ? String(value).trim() : "";
  } catch {
    return "";
  }
};

const url = (envOf("VITE_SUPABASE_URL") || SUPABASE_URL || "").replace(/\/$/, "");
const key = envOf("VITE_SUPABASE_ANON_KEY") || SUPABASE_ANON_KEY || "";
const PROFILE_KEY = "immba-auth";
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: "immba-supabase-auth",
  },
});

export const getSupabase = () => ({ url, key });
export const isCloud = () => Boolean(url && key);

/** Project URL and anon key are fixed. Browser overrides are ignored. */
export const saveSupabaseConnection = () => {};

let profileCache = null;
try {
  profileCache = JSON.parse(localStorage.getItem(PROFILE_KEY) || "null");
} catch {
  profileCache = null;
}

export const getAuthSession = () => profileCache;

export const saveAuthSession = (session) => {
  profileCache = session || null;
  localStorage.removeItem("immba-admin-session");
  sessionStorage.removeItem("immba-admin-session");
  localStorage.removeItem("immba-office-ok");
  localStorage.removeItem("immba-supabase-url");
  localStorage.removeItem("immba-supabase-anon-key");
  if (!session) {
    localStorage.removeItem(PROFILE_KEY);
    return;
  }
  localStorage.setItem(PROFILE_KEY, JSON.stringify(session));
};

const fail = async (res) => {
  const text = await res.text();
  let message = text || res.statusText;
  try {
    const data = JSON.parse(text);
    message = data.message || data.msg || data.error_description || data.error || data.details || message;
  } catch {
    /* keep text */
  }
  throw new Error(message);
};

export const rest = async (path, { method = "GET", body, headers: extra, anon = false, token: tokenArg } = {}) => {
  if (!url || !key) throw new Error("Supabase is not connected");
  const { data } = await supabase.auth.getSession();
  const token = tokenArg || (anon ? key : data.session?.access_token || key);
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
  if (!res.ok) await fail(res);
  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
};

export const rpc = async (name, args = {}) => {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw new Error(error.message || "Request failed");
  return data;
};

export const authApi = async (path, { method = "POST", body } = {}) => {
  if (path.startsWith("signup")) {
    const { data, error } = await supabase.auth.signUp({
      email: body.email,
      password: body.password,
      options: { data: body.data || {}, emailRedirectTo: body.emailRedirectTo },
    });
    if (error) throw new Error(error.message);
    const identities = data.user?.identities;
    const already = Array.isArray(identities) && identities.length === 0;
    return {
      ...data,
      already,
      access_token: data.session?.access_token,
      refresh_token: data.session?.refresh_token,
      user: data.user,
    };
  }
  if (path.startsWith("token")) {
    const { data, error } = await supabase.auth.signInWithPassword({ email: body.email, password: body.password });
    if (error) throw new Error(error.message);
    return { access_token: data.session?.access_token, refresh_token: data.session?.refresh_token, user: data.user };
  }
  if (path.startsWith("recover")) {
    const { error } = await supabase.auth.resetPasswordForEmail(body.email, { redirectTo: body.redirectTo });
    if (error) throw new Error(error.message);
    return {};
  }
  if (path === "user" && method === "PUT") {
    const { data, error } = await supabase.auth.updateUser({ password: body.password });
    if (error) throw new Error(error.message);
    return data;
  }
  if (path === "user") {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw new Error(error.message);
    return data.user;
  }
  throw new Error("Unsupported auth request");
};

const uploadImage = async (bucket, file) => {
  const type = file?.type || "";
  if (!IMAGE_TYPES.has(type)) throw new Error("Use a JPEG, PNG, WebP, or GIF image.");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("Image must be 5 MB or smaller.");
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error("Sign in before uploading.");
  const ext = type === "image/png" ? "png" : type === "image/webp" ? "webp" : type === "image/gif" ? "gif" : "jpg";
  const path = `${userData.user.id}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: type, upsert: false });
  if (error) throw new Error(error.message);
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
};

export const uploadFacultyPhoto = (file) => uploadImage("faculty-photos", file);
export const uploadNewsPhoto = (file) => uploadImage("news-photos", file);
export const uploadMarketPhoto = (file) => uploadImage("marketplace-photos", file);

let hydrating = null;
export const hydrateSession = () => {
  if (hydrating) return hydrating;
  hydrating = (async () => {
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    if (!session) {
      if (profileCache?.access_token) saveAuthSession(null);
      hydrating = null;
      return null;
    }
    const { data: authz, error } = await supabase.rpc("get_my_authorization");
    if (error || !authz) {
      hydrating = null;
      return profileCache;
    }
    const next = {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      user: session.user,
      role: authz.role || "pending",
      intent: authz.intent || session.user?.user_metadata?.intent || "staff",
      email: authz.email || session.user?.email || "",
      pages: Array.isArray(authz.pages) ? authz.pages : [],
      display_name: authz.display_name || "",
    };
    saveAuthSession(next);
    hydrating = null;
    return next;
  })().catch((error) => {
    hydrating = null;
    throw error;
  });
  return hydrating;
};

supabase.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_OUT" || !session) {
    saveAuthSession(null);
    return;
  }
  if (profileCache?.user?.id === session.user.id) {
    saveAuthSession({ ...profileCache, access_token: session.access_token, refresh_token: session.refresh_token, user: session.user });
  }
});
