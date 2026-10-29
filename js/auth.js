import { authApi, getAuthSession, hydrateSession, isCloud, saveAuthSession, supabase } from "./supabase.js?v=secure1";

const DOUBLE_CLICK_MS = 320;
const BLOCKED_KEY = "immba-blocked-notice";
export const OFFICE_CONTACT = "imMBA@mail.fju.edu.tw";

const SITE = () => `${location.origin}${location.pathname.replace(/[^/]+$/, "")}`;
const HERE = () => `${location.origin}${location.pathname}`;

export const isLocalAdmin = () => false;

export const currentProfile = () => getAuthSession();

export const isAdminAuthed = () => {
  const role = getAuthSession()?.role;
  return role === "admin" || role === "super_admin";
};

export const isSuperAdmin = () => getAuthSession()?.role === "super_admin";

export const OFFICE_PAGES = [
  { key: "analytics", en: "Web Analytics", zh: "網站分析" },
  { key: "people", en: "People", zh: "訪客" },
  { key: "access", en: "Access", zh: "權限" },
  { key: "listings", en: "Listings", zh: "刊登" },
  { key: "alumni", en: "Alumni", zh: "校友" },
  { key: "faculty", en: "Faculty", zh: "師資" },
  { key: "audit", en: "Audit", zh: "稽核" },
  { key: "news", en: "News", zh: "公告" },
  { key: "compose", en: "Compose", zh: "撰寫" },
  { key: "orders", en: "Orders", zh: "訂單" },
  { key: "workflows", en: "Workflows", zh: "申請" },
];

export const ALL_OFFICE_PAGES = OFFICE_PAGES.map((page) => page.key);

export const pagesForRole = (role, pages) => {
  if (role === "super_admin") return [...ALL_OFFICE_PAGES];
  if (role !== "admin") return [];
  return Array.isArray(pages) ? pages.filter((key) => ALL_OFFICE_PAGES.includes(key)) : [];
};

export const allowedOfficePages = () => {
  const session = getAuthSession();
  return pagesForRole(session?.role, session?.pages);
};

export const isSellerAuthed = () => {
  const session = getAuthSession();
  const role = session?.role;
  if (role === "admin" || role === "super_admin" || role === "pending" || role === "rejected") return false;
  const intent = session?.intent || session?.user?.user_metadata?.intent;
  return role === "marketplace" || intent === "marketplace";
};

export const logoutAdmin = () => {
  saveAuthSession(null);
  void supabase.auth.signOut();
};

export const hasBlockedNotice = () =>
  sessionStorage.getItem(BLOCKED_KEY) === "1" || new URLSearchParams(location.search).get("blocked") === "1";

export const kickBlockedSession = () => {
  sessionStorage.setItem(BLOCKED_KEY, "1");
  logoutAdmin();
  if (document.querySelector("[data-pending]")) return;
  window.location.replace("pending.html?blocked=1");
};

export const watchOfficeAccess = () => {
  if (window.__immbaWatchOffice) return;
  window.__immbaWatchOffice = true;
  const tick = async () => {
    const session = getAuthSession();
    if (!session?.access_token || !session.user?.id) return;
    if (session.role === "marketplace" || session.intent === "marketplace") return;
    try {
      const before = JSON.stringify([session.role, session.pages || []]);
      const live = await hydrateSession();
      if (!live || live.role === "rejected") {
        kickBlockedSession();
        return;
      }
      const after = JSON.stringify([live.role, live.pages || []]);
      if (before !== after) window.dispatchEvent(new Event("immba:access"));
      if (
        document.querySelector("[data-admin-guard]") &&
        live.role !== "admin" &&
        live.role !== "super_admin"
      ) {
        window.location.replace(routeAfterAuth(live));
      }
    } catch {
      /* Keep the current page if the profile read is briefly unavailable. */
    }
  };
  void tick();
  window.setInterval(tick, 2500);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) void tick();
  });
};

const loadProfile = async (session) => {
  const metaIntent = session.user?.user_metadata?.intent === "marketplace" ? "marketplace" : "staff";
  let intent = metaIntent;
  let role = intent === "marketplace" ? "marketplace" : "pending";
  let email = session.user?.email || "";
  let pages = [];
  try {
    const live = await hydrateSession();
    if (live?.role) {
      role = live.role;
      intent = live.intent || intent;
      email = live.email || email;
      pages = pagesForRole(role, live.pages);
    }
  } catch {
    role = getAuthSession()?.role || role;
    pages = pagesForRole(role, getAuthSession()?.pages);
  }
  const next = {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    user: session.user,
    role,
    intent,
    email,
    pages,
  };
  if (role === "rejected") sessionStorage.setItem(BLOCKED_KEY, "1");
  saveAuthSession(next);
  return next;
};

export const signUpAccount = async ({ email, password, intent, displayName }) => {
  const redirectTo = intent === "marketplace" ? `${SITE()}marketplace.html` : `${SITE()}pending.html`;
  const data = await authApi("signup", {
    body: {
      email,
      password,
      emailRedirectTo: redirectTo,
      data: { intent, display_name: displayName || "" },
    },
  });
  if (data.already) {
    try {
      const session = await signInAccount(email, password);
      return { ...session, already: true, redirectTo };
    } catch {
      const error = new Error("already-registered");
      error.code = "already-registered";
      throw error;
    }
  }
  if (data.access_token && data.user) await loadProfile(data);
  return { ...data, redirectTo };
};

export const signInAccount = async (email, password) => {
  const data = await authApi("token?grant_type=password", { body: { email, password } });
  return loadProfile(data);
};

export const resetPassword = async (email, redirectTo = HERE()) =>
  authApi("recover", { body: { email, redirectTo } });

export const consumeAuthHash = async () => {
  const hash = new URLSearchParams(location.hash.replace(/^#/, ""));
  const recovery = hash.get("type") === "recovery" || new URLSearchParams(location.search).get("type") === "recovery";
  if (!location.hash.includes("access_token") && !location.search.includes("code=")) return null;
  const { data, error } = await supabase.auth.getSession();
  history.replaceState(null, "", location.pathname + location.search);
  if (error || !data.session) return null;
  const session = await loadProfile(data.session);
  session.recovery = recovery;
  return session;
};

export const routeAfterAuth = (session) => {
  const role = session?.role;
  const intent = session?.intent || session?.user?.user_metadata?.intent;
  if (role === "admin" || role === "super_admin") return "dashboard.html";
  if (role === "marketplace" || intent === "marketplace") return "marketplace.html";
  if (role === "rejected") return "pending.html?blocked=1";
  return "pending.html";
};

const siblingFromHome = (homeHref, file) => {
  const href = homeHref || "index.html#top";
  const slash = href.lastIndexOf("/");
  const dir = slash >= 0 ? href.slice(0, slash + 1) : "";
  return `${dir}${file}`;
};

export const initLogoGate = () => {
  const onAdmin = Boolean(document.querySelector("[data-admin-guard], [data-admin-form]"));
  document.querySelectorAll(".site-header a.logo, .login-top a.logo, .office-rail-logo").forEach((logo) => {
    if (onAdmin) {
      logo.addEventListener("click", (event) => {
        event.preventDefault();
        logoutAdmin();
        window.location.href = logo.getAttribute("href") || "index.html#top";
      });
      return;
    }
    let timer = 0;
    const goLogin = () => {
      if (timer) {
        window.clearTimeout(timer);
        timer = 0;
      }
      window.location.href = siblingFromHome(logo.getAttribute("href"), "login.html");
    };
    logo.addEventListener("click", (event) => {
      event.preventDefault();
      if (timer) {
        goLogin();
        return;
      }
      timer = window.setTimeout(() => {
        timer = 0;
        window.location.href = logo.getAttribute("href") || "index.html#top";
      }, DOUBLE_CLICK_MS);
    });
    logo.addEventListener("dblclick", (event) => {
      event.preventDefault();
      goLogin();
    });
  });
};

const showLoginError = (form, message, tone = "error") => {
  const err = form.querySelector("[data-login-error]");
  if (!err) return;
  err.hidden = false;
  err.classList.toggle("is-note", tone === "note");
  err.textContent = message || err.getAttribute("data-error-text") || err.textContent;
};

const loginCopy = (mode, intent = "staff") => {
  const zh = document.body?.dataset.lang === "zh";
  const seller = intent === "marketplace";
  const pack = {
    signin: {
      title: zh ? "登入" : "Sign in",
      lede: seller
        ? zh
          ? "繼續刊登教材。"
          : "Continue to post a listing."
        : zh
          ? "繼續進入後台。"
          : "Continue to the back office.",
      submit: zh ? "登入" : "Sign in",
    },
    register: {
      title: zh ? "建立帳號" : "Create account",
      lede: seller
        ? zh
          ? "建立賣方帳號後即可刊登教材。"
          : "Create a seller account to post listings."
        : zh
          ? "建立職員帳號，需經 super admin 核准。"
          : "Create a staff account. A super admin approves access.",
      submit: zh ? "建立帳號" : "Create account",
    },
    reset: {
      title: zh ? "忘記密碼" : "Forgot password",
      lede: zh ? "輸入電子郵件，我們會寄重設連結。" : "Enter your email and we’ll send a reset link.",
      submit: zh ? "寄送重設連結" : "Send reset link",
    },
    newpass: {
      title: zh ? "新密碼" : "New password",
      lede: zh ? "請設定新密碼，然後繼續。" : "Choose a new password, then continue.",
      submit: zh ? "儲存密碼" : "Save password",
    },
  };
  return pack[mode] || pack.signin;
};

export const initLoginForm = () => {
  const form = document.querySelector("[data-login-form]");
  if (!form) return;

  const card = document.querySelector("[data-login-card]") || form.closest(".login-card");
  const modeButtons = [...document.querySelectorAll("[data-login-mode]")];
  const tabButtons = [...document.querySelectorAll("[data-login-switch] [data-login-mode], .login-modes [data-login-mode]")];
  const applyMode = (mode) => {
    form.dataset.mode = mode;
    if (card) card.dataset.mode = mode;
    tabButtons.forEach((btn) => {
      if (btn.dataset.loginMode === mode) btn.setAttribute("aria-current", "true");
      else btn.removeAttribute("aria-current");
    });
    form.querySelectorAll("[data-for-mode]").forEach((node) => {
      const on = node.dataset.forMode.split(/\s+/).includes(mode);
      node.classList.toggle("is-off", !on);
      if (!node.classList.contains("login-collapse")) node.hidden = !on;
      node.querySelectorAll("input, select, textarea").forEach((el) => {
        el.disabled = !on;
      });
    });
    const copy = loginCopy(mode, form.dataset.intent);
    const title = document.querySelector("[data-login-title]");
    const lede = document.querySelector("[data-login-lede]");
    const submit = form.querySelector("[data-login-submit]") || form.querySelector(".login-submit");
    if (title) title.textContent = copy.title;
    if (lede) lede.textContent = copy.lede;
    if (submit) submit.textContent = copy.submit;
    const err = form.querySelector("[data-login-error]");
    if (err && mode !== "newpass") {
      err.hidden = true;
      err.classList.remove("is-note");
    }
  };
  modeButtons.forEach((btn) => btn.addEventListener("click", () => applyMode(btn.dataset.loginMode)));
  window.addEventListener("immba:lang", () => applyMode(form.dataset.mode || "signin"));
  applyMode("signin");

  void consumeAuthHash().then((session) => {
    if (session?.recovery) {
      applyMode("newpass");
      showLoginError(form, "Choose a new password, then submit.");
      return;
    }
    if (session) location.replace(routeAfterAuth(session));
  });

  const sellerForm = form.dataset.intent === "marketplace";

  void hydrateSession().then((existing) => {
    if (!existing?.access_token || location.hash.includes("access_token")) return;
    const dest = routeAfterAuth(existing);
    if (!sellerForm) window.location.replace(dest);
  });
  const existing = getAuthSession();
  if (existing?.access_token && !location.hash.includes("access_token")) {
    const dest = routeAfterAuth(existing);
    if (sellerForm) {
      /* stay on the desk so a signed-in seller can still post */
    } else {
      window.location.replace(dest);
      return;
    }
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const mode = form.dataset.mode || "signin";
    const email = String(form.elements.namedItem("email")?.value || form.elements.namedItem("username")?.value || "").trim();
    const pass = String(form.elements.namedItem("password")?.value || "");
    const intent = String(form.dataset.intent || form.elements.namedItem("intent")?.value || "staff");
    const displayName = String(form.elements.namedItem("displayName")?.value || "").trim();

    if (!isCloud()) {
      showLoginError(form, "Connect Supabase to register, verify email, or reset a password.");
      return;
    }

    void (async () => {
      try {
        if (mode === "newpass") {
          if (!pass) {
            showLoginError(form, "Password is required.");
            return;
          }
          await authApi("user", {
            method: "PUT",
            body: { password: pass },
          });
          location.replace(routeAfterAuth(getAuthSession()));
          return;
        }
        if (mode === "reset") {
          await resetPassword(email, HERE());
          showLoginError(form, "Check your email to reset your password.");
          return;
        }
        if (mode === "register") {
          if (!pass) {
            showLoginError(form, "Password is required to create an account.");
            return;
          }
          const result = await signUpAccount({ email, password: pass, intent, displayName });
          if (result.access_token) {
            location.replace(routeAfterAuth(getAuthSession() || result));
            return;
          }
          const zh = document.body?.dataset.lang === "zh";
          showLoginError(
            form,
            intent === "marketplace"
              ? zh
                ? "帳號已建立。請到信箱點確認信，然後再登入。賣方不需要後台核准。"
                : "Account created. Open the confirmation email, then sign in. Sellers do not need office approval."
              : zh
                ? "帳號已建立。請到信箱點確認信，然後等待 super admin 核准。"
                : "Account created. Confirm your email, then wait for a super admin to approve access.",
            "note"
          );
          return;
        }
        const session = await signInAccount(email, pass);
        location.replace(routeAfterAuth(session));
      } catch (error) {
        if (error.code === "already-registered") {
          const zh = document.body?.dataset.lang === "zh";
          applyMode("signin");
          showLoginError(
            form,
            zh
              ? "這個電子郵件已經有帳號，而且密碼不符。請登入，或使用忘記密碼。"
              : "This email already has an account, and that password does not match. Sign in, or use Forgot password."
          );
          return;
        }
        showLoginError(form, error.message || "Could not complete that request.");
      }
    })();
  });
};

export const initPendingPage = () => {
  const root = document.querySelector("[data-pending]");
  if (!root) return;
  const slot = root.querySelector("[data-pending-email]");
  const paintEmail = (value) => {
    if (slot) slot.textContent = value || new URLSearchParams(location.search).get("email") || "";
  };
  paintEmail(getAuthSession()?.email);
  const paintCopy = () => {
    const zh = document.body?.dataset.lang === "zh";
    const blocked = hasBlockedNotice() || getAuthSession()?.role === "rejected";
    const title = root.querySelector("[data-i18n='pending.title']");
    const lede = root.querySelector("[data-i18n='pending.lede']");
    if (blocked && title) title.textContent = zh ? "帳號已封鎖" : "This account was blocked";
    if (blocked && lede) {
      lede.innerHTML = zh
        ? `這個帳號已被封鎖，因此已立即登出。若你認為這是誤判，請聯絡 <a href="mailto:${OFFICE_CONTACT}">${OFFICE_CONTACT}</a>。`
        : `This account was blocked, so you have been signed out. If you think this is a mistake, please contact <a href="mailto:${OFFICE_CONTACT}">${OFFICE_CONTACT}</a>.`;
    }
  };
  paintCopy();
  if (hasBlockedNotice() || getAuthSession()?.role === "rejected") {
    logoutAdmin();
  }
  window.addEventListener("immba:lang", paintCopy);
  void consumeAuthHash().then((session) => {
    if (session?.recovery) {
      location.replace("login.html");
      return;
    }
    const current = session || getAuthSession();
    if (current?.role === "rejected" || hasBlockedNotice()) {
      sessionStorage.setItem(BLOCKED_KEY, "1");
      paintEmail(current?.email);
      paintCopy();
      logoutAdmin();
      return;
    }
    const dest = current?.access_token ? routeAfterAuth(current) : "";
    if (dest && !dest.startsWith("pending.html")) {
      location.replace(dest);
      return;
    }
    paintEmail(current?.email);
    paintCopy();
  });
  root.querySelector("[data-pending-switch]")?.addEventListener("click", () => {
    sessionStorage.removeItem(BLOCKED_KEY);
    logoutAdmin();
    location.href = "login.html";
  });
  root.querySelector("[data-pending-seller]")?.addEventListener("click", () => {
    sessionStorage.removeItem(BLOCKED_KEY);
    logoutAdmin();
    location.href = "market-account.html";
  });
};

export const guardAdminPage = () => {
  if (!document.querySelector("[data-admin-guard], [data-admin-form]")) return;
  const finish = () => {
    if (!isAdminAuthed()) {
      const dest = getAuthSession()?.access_token ? routeAfterAuth(getAuthSession()) : "login.html";
      window.location.replace(dest === "dashboard.html" ? "login.html" : dest);
      return;
    }
    document.querySelector("[data-admin-logout]")?.addEventListener("click", () => {
      logoutAdmin();
      window.location.href = "login.html";
    });
    watchOfficeAccess();
    window.dispatchEvent(new Event("immba:access"));
  };
  void hydrateSession().then(finish).catch(finish);
};
