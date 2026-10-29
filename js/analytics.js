import { rpc } from "./supabase.js?v=secure1";
import { sanitizeEvent, trackingAllowed } from "./privacy.js";
const STORE = "events";
const VISITOR_KEY = "immba-vid";
const SESSION_KEY = "immba-sid";
const LOG_KEY = "immba-analytics-log";
const LOG_SESSION_KEY = "immba-analytics-log-session";
const LIVE_MS = 90 * 1000;
const SKIP = /(?:^|\/)(login|admin|dashboard)\.html$/i;

const uid = () =>
  crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const visitorId = () => {
  let id = localStorage.getItem(VISITOR_KEY);
  if (!id) {
    id = uid();
    localStorage.setItem(VISITOR_KEY, id);
  }
  return id;
};

const sessionId = () => {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = uid();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
};

const openDb = () =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("t", "t");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const readLog = (key) => {
  try {
    const rows = JSON.parse((key === LOG_SESSION_KEY ? sessionStorage : localStorage).getItem(key) || "[]");
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
};

const memoryLog = () => [...readLog(LOG_SESSION_KEY), ...readLog(LOG_KEY)];

const writeLog = (key, store, event) => {
  const list = readLog(key);
  list.push(event);
  store.setItem(key, JSON.stringify(list.slice(-800)));
};

const remember = (event) => {
  try {
    writeLog(LOG_KEY, localStorage, event);
  } catch {
    try {
      writeLog(LOG_SESSION_KEY, sessionStorage, event);
    } catch {
      /* keep going; IndexedDB may still store the event */
    }
  }
};

const mergeEvents = (rows) => {
  const map = new Map();
  [...memoryLog(), ...rows].forEach((row) => {
    if (row?.id) map.set(row.id, row);
  });
  return [...map.values()];
};

const allEvents = async () => {
  try {
    const db = await openDb();
    const fromDb = await new Promise((resolve, reject) => {
      const request = db.transaction(STORE, "readonly").objectStore(STORE).getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
    return mergeEvents(fromDb);
  } catch {
    return mergeEvents([]);
  }
};

const putEvent = async (event) => {
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(event);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* dual-write log already stored the event */
  }
};

export const clearAnalytics = async () => {
  localStorage.removeItem(LOG_KEY);
  sessionStorage.removeItem(LOG_SESSION_KEY);
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

const currentPath = () => `${location.pathname.split("/").pop() || "index.html"}${location.hash || ""}`;

const shouldSkip = () => SKIP.test(location.pathname) || Boolean(document.querySelector("[data-admin-guard]"));

const SEARCH_HOSTS = /google\.|bing\.|yahoo\.|baidu\.|duckduckgo\.|yandex\./i;

const TZ_COUNTRY = {
  "Asia/Taipei": "Taiwan",
  "Asia/Hong_Kong": "Hong Kong",
  "Asia/Shanghai": "China",
  "Asia/Tokyo": "Japan",
  "Asia/Seoul": "South Korea",
  "Asia/Singapore": "Singapore",
  "Asia/Kuala_Lumpur": "Malaysia",
  "Asia/Bangkok": "Thailand",
  "Asia/Ho_Chi_Minh": "Vietnam",
  "Asia/Jakarta": "Indonesia",
  "Asia/Manila": "Philippines",
  "Asia/Kolkata": "India",
  "Asia/Dubai": "United Arab Emirates",
  "Australia/Sydney": "Australia",
  "Australia/Melbourne": "Australia",
  "Pacific/Auckland": "New Zealand",
  "Europe/London": "United Kingdom",
  "Europe/Dublin": "Ireland",
  "Europe/Paris": "France",
  "Europe/Berlin": "Germany",
  "Europe/Madrid": "Spain",
  "Europe/Rome": "Italy",
  "Europe/Amsterdam": "Netherlands",
  "Europe/Zurich": "Switzerland",
  "America/New_York": "United States",
  "America/Chicago": "United States",
  "America/Denver": "United States",
  "America/Los_Angeles": "United States",
  "America/Phoenix": "United States",
  "America/Toronto": "Canada",
  "America/Vancouver": "Canada",
  "America/Sao_Paulo": "Brazil",
  "America/Mexico_City": "Mexico",
  "Africa/Johannesburg": "South Africa",
};

const LOCALE_COUNTRY = {
  US: "United States",
  GB: "United Kingdom",
  TW: "Taiwan",
  CN: "China",
  HK: "Hong Kong",
  JP: "Japan",
  KR: "South Korea",
  SG: "Singapore",
  MY: "Malaysia",
  TH: "Thailand",
  VN: "Vietnam",
  ID: "Indonesia",
  PH: "Philippines",
  IN: "India",
  AU: "Australia",
  NZ: "New Zealand",
  FR: "France",
  DE: "Germany",
  ES: "Spain",
  IT: "Italy",
  NL: "Netherlands",
  BR: "Brazil",
  CA: "Canada",
  MX: "Mexico",
};

const osFromUa = () => {
  const ua = navigator.userAgent || "";
  if (/Android/i.test(ua)) return "Android";
  if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
  if (/Mac OS X|Macintosh/i.test(ua)) return "Macintosh";
  if (/Windows/i.test(ua)) return "Windows";
  if (/Linux/i.test(ua)) return "Linux";
  return "Other";
};

const deviceFromUa = () => {
  const ua = navigator.userAgent || "";
  if (/iPad|Tablet|PlayBook/i.test(ua)) return "Tablet";
  if (/Mobi|Android|iPhone|iPod/i.test(ua)) return "Mobile";
  return "Desktop";
};

const countryOf = (row) => {
  if (row?.country && TZ_COUNTRY[row.country]) return TZ_COUNTRY[row.country];
  if (row?.country && row.country !== "Unknown" && !String(row.country).includes("/")) return row.country;
  return countryFromSignals(row?.tz, row?.locale);
};

const refHost = () => {
  try {
    return document.referrer ? new URL(document.referrer).host : "";
  } catch {
    return "";
  }
};

const searchEngineFromHost = (host) => {
  if (/google\./i.test(host)) return "google";
  if (/bing\./i.test(host)) return "bing";
  if (/yahoo\./i.test(host)) return "yahoo";
  if (/baidu\./i.test(host)) return "baidu";
  if (/duckduckgo\./i.test(host)) return "duckduckgo";
  if (/yandex\./i.test(host)) return "yandex";
  return "";
};

const sourceFromRef = (host) => {
  if (/utm_|gclid=/.test(location.search)) return "Campaign";
  if (!host) return "Direct";
  if (host === location.host) return "Internal";
  if (SEARCH_HOSTS.test(host)) return "Search";
  return "Referral";
};

const countryFromSignals = (tz, locale) => {
  if (tz && TZ_COUNTRY[tz]) return TZ_COUNTRY[tz];
  const region = String(locale || "").split("-")[1];
  if (region && LOCALE_COUNTRY[region.toUpperCase()]) return LOCALE_COUNTRY[region.toUpperCase()];
  return tz || "Unknown";
};

const record = (type, extra = {}) => {
  if (shouldSkip() || type === "click") return;
  const signals = {
    optOut: localStorage.getItem("immba-privacy-opt-out") === "1",
    dnt: navigator.doNotTrack || window.doNotTrack || "0",
    gpc: navigator.globalPrivacyControl === true,
  };
  if (!trackingAllowed(signals)) return;
  const host = refHost();
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  const locale = navigator.language || "";
  const event = {
    id: uid(),
    t: Date.now(),
    type: type === "click" ? "view" : type,
    path: currentPath().split("?")[0].split("#")[0],
    visitor: visitorId(),
    session: sessionId(),
    lang: document.body?.dataset.lang === "zh" ? "zh" : "en",
    os: osFromUa(),
    device: deviceFromUa(),
    source: sourceFromRef(host),
    engine: searchEngineFromHost(host),
    ref: host,
    country: countryFromSignals(tz, locale),
  };
  remember(event);
  putEvent(event).catch(() => {});
  if (type === "click") return;
  queue.push(sanitizeEvent({
    path: event.path,
    event_type: type === "beat" ? "beat" : "view",
    referrer_host: host,
    lang: event.lang,
    device: event.device,
    os_family: event.os,
    country: event.country,
    visitor_key: event.visitor,
  }));
  window.clearTimeout(flushTimer);
  flushTimer = window.setTimeout(() => {
    const batch = queue.splice(0, 20);
    if (batch.length) void rpc("analytics_ingest", { p_events: batch }).catch(() => {});
  }, 1500);
  void extra;
};

let queue = [];
let flushTimer = 0;

const clickLabel = (el) => {
  const named =
    el.getAttribute("aria-label") ||
    el.getAttribute("data-i18n") ||
    el.textContent ||
    el.getAttribute("href") ||
    "click";
  return String(named).replace(/\s+/g, " ").trim().slice(0, 72) || "click";
};

export const initAnalytics = () => {
  if (shouldSkip()) return;
  record("view");
  window.addEventListener("hashchange", () => record("view"));
  document.addEventListener(
    "click",
    (event) => {
      const el = event.target.closest("a, button");
      if (!el || el.closest("[data-admin-guard]")) return;
      if (el.matches("[data-lang-toggle], .menu-toggle, .nav-collapse, .notice-collapse, .skip-link")) return;
      record("click", {
        label: clickLabel(el),
        href: el.getAttribute("href") || "",
      });
    },
    true
  );
  const beat = () => {
    if (document.visibilityState === "visible") record("beat");
  };
  beat();
  window.setInterval(beat, 20000);
  document.addEventListener("visibilitychange", beat);
  window.addEventListener("pagehide", () => record("beat"));
};

const startOfDay = (ts) => {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const rank = (map, limit = 8) =>
  [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));

const sessionBag = (events) => {
  const sessions = new Map();
  events.forEach((row) => {
    const cur = sessions.get(row.session) || { events: [] };
    cur.events.push(row);
    sessions.set(row.session, cur);
  });
  return [...sessions.values()].map((session) => {
    const list = session.events.sort((a, b) => a.t - b.t);
    const views = list.filter((row) => row.type === "view");
    const first = list[0];
    const last = list[list.length - 1];
    const land = views[0] || first;
    let source = land?.source || "Direct";
    if (source === "Internal") source = "Direct";
    const located = list.find((row) => countryOf(row) !== "Unknown") || first;
    return {
      views,
      first,
      last,
      duration: Math.max(0, (last?.t || 0) - (first?.t || 0)),
      bounce: views.length <= 1,
      source,
      country: countryOf(located),
      engine: first?.engine || list.find((row) => row.engine)?.engine || "",
      os: first?.os || list.find((row) => row.os)?.os || "Other",
      device: first?.device || list.find((row) => row.device)?.device || "Desktop",
      ref: first?.ref || list.find((row) => row.ref)?.ref || "",
      visitor: first?.visitor,
      start: first?.t || 0,
    };
  });
};

export const summarizeAnalytics = async (range = "7d") => {
  try {
    const server = await rpc("analytics_report", { p_range: range === "all" ? "90d" : "7d" });
    if (server && Number(server.views) > 0) {
      const days = (server.days || []).map((day) => ({
        label: day.day,
        count: Number(day.count) || 0,
        visits: Number(day.visits) || 0,
        visitors: Number(day.visitors) || 0,
        clicks: 0,
        bounce: 0,
        exit: 0,
        time: 0,
      }));
      const pages = (server.pages || []).map((row) => ({ name: row.label, count: Number(row.count) || 0 }));
      return {
        live: Number(server.live) || 0,
        views: Number(server.views) || 0,
        visits: Number(server.views) || 0,
        visitors: Number(server.visitors) || 0,
        clicks: 0,
        events: Number(server.views) || 0,
        returning: 0,
        bounceRate: 0,
        exitRate: 0,
        avgTime: 0,
        pages,
        targets: [],
        people: [],
        days,
        os: [],
        sources: [],
        countries: [],
        engines: [],
        langs: [],
        devices: [],
        recent: [],
        referrers: [],
        shared: true,
      };
    }
  } catch {
    /* The office still renders this browser's history if the shared report is unavailable. */
  }
  const now = Date.now();
  const from =
    range === "today" ? startOfDay(now) : range === "all" ? 0 : now - 7 * 24 * 60 * 60 * 1000;
  const events = (await allEvents()).filter((row) => row.t >= from);
  const views = events.filter((row) => row.type === "view");
  const clicks = events.filter((row) => row.type === "click");
  const sessions = sessionBag(events);
  const liveCut = now - LIVE_MS;
  const live = new Set(events.filter((row) => row.t >= liveCut).map((row) => row.visitor));
  const visitors = new Set(events.map((row) => row.visitor));
  const pages = new Map();
  views.forEach((row) => pages.set(row.path, (pages.get(row.path) || 0) + 1));
  const clickMap = new Map();
  clicks.forEach((row) => {
    const key = row.label || row.href || "click";
    clickMap.set(key, (clickMap.get(key) || 0) + 1);
  });
  const people = new Map();
  clicks.forEach((row) => {
    const cur = people.get(row.visitor) || { visitor: row.visitor, clicks: 0, last: 0, path: row.path };
    cur.clicks += 1;
    if (row.t > cur.last) {
      cur.last = row.t;
      cur.path = row.path;
    }
    people.set(row.visitor, cur);
  });
  const os = new Map();
  const sources = new Map();
  const countries = new Map();
  const engines = new Map();
  const langs = new Map();
  const devices = new Map();
  const referrers = new Map();
  const visitorSessions = new Map();
  sessions.forEach((session) => {
    os.set(session.os, (os.get(session.os) || 0) + 1);
    sources.set(session.source, (sources.get(session.source) || 0) + 1);
    devices.set(session.device || "Desktop", (devices.get(session.device || "Desktop") || 0) + 1);
    if (session.country && session.country !== "Unknown") {
      countries.set(session.country, (countries.get(session.country) || 0) + 1);
    }
    if (session.engine) engines.set(session.engine, (engines.get(session.engine) || 0) + 1);
    if (session.ref && session.ref !== location.host) {
      referrers.set(session.ref, (referrers.get(session.ref) || 0) + 1);
    }
    visitorSessions.set(session.visitor, (visitorSessions.get(session.visitor) || 0) + 1);
  });
  events.forEach((row) => {
    const lang = row.lang === "zh" ? "中文" : "English";
    langs.set(lang, (langs.get(lang) || 0) + 1);
  });
  const returning = [...visitorSessions.values()].filter((count) => count > 1).length;
  const bounced = sessions.filter((session) => session.bounce).length;
  const avgTime = sessions.length
    ? sessions.reduce((sum, session) => sum + session.duration, 0) / sessions.length
    : 0;
  const exits = sessions.filter((session) => session.views.length).length;
  const bounceRate = sessions.length ? (bounced / sessions.length) * 100 : 0;
  const exitRate = views.length ? (exits / views.length) * 100 : 0;
  const days = [];
  for (let i = 6; i >= 0; i -= 1) {
    const start = startOfDay(now - i * 24 * 60 * 60 * 1000);
    const end = start + 24 * 60 * 60 * 1000;
    const slice = events.filter((row) => row.t >= start && row.t < end);
    const daySessions = sessions.filter((session) => session.start >= start && session.start < end);
    const dayViews = slice.filter((row) => row.type === "view");
    days.push({
      label: new Date(start).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      count: dayViews.length,
      visits: daySessions.length,
      visitors: new Set(slice.map((row) => row.visitor)).size,
      clicks: slice.filter((row) => row.type === "click").length,
      bounce: daySessions.length ? (daySessions.filter((session) => session.bounce).length / daySessions.length) * 100 : 0,
      exit: dayViews.length ? (daySessions.filter((session) => session.views.length).length / dayViews.length) * 100 : 0,
      time: daySessions.length
        ? daySessions.reduce((sum, session) => sum + session.duration, 0) / daySessions.length / 1000
        : 0,
    });
  }
  return {
    live: live.size,
    views: views.length,
    visits: sessions.length,
    visitors: visitors.size,
    clicks: clicks.length,
    events: events.length,
    returning,
    bounceRate,
    exitRate,
    avgTime,
    pages: rank(pages),
    targets: rank(clickMap),
    people: [...people.values()].sort((a, b) => b.clicks - a.clicks).slice(0, 8),
    days,
    os: rank(os, 5),
    sources: rank(sources, 4),
    countries: rank(countries, 8),
    engines: rank(engines, 5),
    langs: rank(langs, 4),
    devices: rank(devices, 4),
    referrers: rank(referrers, 6),
    recent: [...events].sort((a, b) => b.t - a.t).slice(0, 16),
  };
};

export const shortVisitor = (id) => `Visitor ${(id || "").slice(-4).toUpperCase() || "----"}`;
