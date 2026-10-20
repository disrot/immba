import { authApi, getAuthSession, isCloud, rest, saveAuthSession } from "./supabase.js?v=login9";

const SESSION_KEY = "immba-admin-session";
const SESSION_OK = "1";
const ADMIN_USER = "admin";
const ADMIN_PASS = "123456";
const DOUBLE_CLICK_MS = 320;
const OFFICE_OK = "immba-office-ok";

const SITE = () => `${location.origin}${location.pathname.replace(/[^/]+$/, "")}`;
const HERE = () => `${location.origin}${location.pathname}`;

export const isLocalAdmin = () =>
  sessionStorage.getItem(SESSION_KEY) === SESSION_OK || localStorage.getItem(SESSION_KEY) === SESSION_OK;

export const currentProfile = () => getAuthSession();

export const isAdminAuthed = () => {
  if (isLocalAdmin()) return true;
  const role = getAuthSession()?.role;
  return role === "admin" || role === "super_admin";
};

export const isSuperAdmin = () => getAuthSession()?.role === "super_admin" || isLocalAdmin();

export const isSellerAuthed = () => {
  const session = getAuthSession();
  const role = session?.role;
  const intent = session?.intent || session?.user?.user_metadata?.intent;
  return role === "marketplace" || intent === "marketplace" || role === "admin" || role === "super_admin";
};

export const loginAdmin = (user, pass, remember) => {
  if (user === ADMIN_USER && pass === ADMIN_PASS) {
    logoutAdmin();
    const store = remember ? localStorage : sessionStorage;
    store.setItem(SESSION_KEY, SESSION_OK);
    localStorage.setItem(OFFICE_OK, "1");
    return true;
  }
  return false;
};

export const logoutAdmin = () => {
  sessionStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(OFFICE_OK);
  saveAuthSession(null);
};

const clearLocalOffice = () => {
  sessionStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_KEY);
};

const loadProfile = async (session) => {
  clearLocalOffice();
  const token = session.access_token;
  const metaIntent = session.user?.user_metadata?.intent === "marketplace" ? "marketplace" : "staff";
  let intent = metaIntent;
  let role = intent === "marketplace" ? "marketplace" : "pending";
  let email = session.user?.email || "";
  const readOwn = () => rest(`profiles?id=eq.${session.user.id}&select=*`, { token });
  let rows = [];
  try {
    rows = (await readOwn()) || [];
  } catch {
    rows = [];
  }
  if (!rows[0] && session.user?.id) {
    try {
      await rest("profiles", {
        method: "POST",
        token,
        body: {
          id: session.user.id,
          email,
          role,
          intent,
          display_name: session.user?.user_metadata?.display_name || "",
        },
      });
      rows = (await readOwn()) || [];
    } catch {
      /* Trigger may already have created the row, or schema-auth.sql is missing. */
    }
  }
  if (rows[0]) {
    intent = rows[0].intent === "marketplace" || metaIntent === "marketplace" ? "marketplace" : rows[0].intent || intent;
    role = intent === "marketplace" ? "marketplace" : rows[0].role;
    email = rows[0].email || email;
    if (intent === "marketplace" && rows[0].role !== "marketplace") {
      try {
        await rest(`profiles?id=eq.${session.user.id}`, {
          method: "PATCH",
          token,
          body: { role: "marketplace", intent: "marketplace" },
        });
      } catch {
        /* Desk access still follows metadata intent even if the patch is blocked. */
      }
    }
  }
  const next = {
    access_token: token,
    refresh_token: session.refresh_token,
    user: session.user,
    role,
    intent,
    email,
  };
  saveAuthSession(next);
  return next;
};

export const signUpAccount = async ({ email, password, intent, displayName }) => {
  const redirectTo = intent === "marketplace" ? `${SITE()}market-account.html` : `${SITE()}pending.html`;
  return authApi(`signup?redirect_to=${encodeURIComponent(redirectTo)}`, {
    body: {
      email,
      password,
      data: { intent, display_name: displayName || "" },
    },
  }).then(async (data) => {
    if (data.access_token && data.user) {
      await loadProfile(data);
    }
    return { ...data, redirectTo };
  });
};

export const signInAccount = async (email, password) => {
  const data = await authApi("token?grant_type=password", { body: { email, password } });
  return loadProfile(data);
};

export const resetPassword = async (email, redirectTo = HERE()) =>
  authApi(`recover?redirect_to=${encodeURIComponent(redirectTo)}`, { body: { email } });

export const consumeAuthHash = async () => {
  const hash = new URLSearchParams(location.hash.replace(/^#/, ""));
  const token = hash.get("access_token");
  const refresh = hash.get("refresh_token");
  if (!token) return null;
  history.replaceState(null, "", location.pathname + location.search);
  const user = await authApi("user", { method: "GET", token });
  const session = await loadProfile({ access_token: token, refresh_token: refresh, user });
  session.recovery = hash.get("type") === "recovery";
  return session;
};

export const routeAfterAuth = (session) => {
  const role = session?.role;
  const intent = session?.intent || session?.user?.user_metadata?.intent;
  if (role === "admin" || role === "super_admin") return "dashboard.html";
  if (role === "marketplace" || intent === "marketplace") return "marketplace.html";
  if (role === "rejected") return "login.html";
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

const showLoginError = (form, message) => {
  const err = form.querySelector("[data-login-error]");
  if (!err) return;
  err.hidden = false;
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
    if (err && mode !== "newpass") err.hidden = true;
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

  if (isLocalAdmin() && !sellerForm) {
    window.location.replace("dashboard.html");
    return;
  }
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
    const remember = Boolean(form.elements.namedItem("remember")?.checked);
    const intent = String(form.dataset.intent || form.elements.namedItem("intent")?.value || "staff");
    const displayName = String(form.elements.namedItem("displayName")?.value || "").trim();

    if (mode === "signin" && loginAdmin(email, pass, remember)) {
      window.location.replace("dashboard.html");
      return;
    }

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
            token: getAuthSession()?.access_token,
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
          if (intent === "marketplace") {
            if (result.access_token) {
              location.replace("marketplace.html");
              return;
            }
            showLoginError(form, "Check your email, then sign in. Sellers can post right away — no approval.");
            return;
          }
          if (result.access_token) {
            location.replace(routeAfterAuth(getAuthSession()));
            return;
          }
          location.replace(`pending.html?email=${encodeURIComponent(email)}`);
          return;
        }
        const session = await signInAccount(email, pass);
        location.replace(routeAfterAuth(session));
      } catch (error) {
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
  void consumeAuthHash().then((session) => {
    if (session?.recovery) {
      location.replace("login.html");
      return;
    }
    const current = session || getAuthSession();
    const dest = current?.access_token ? routeAfterAuth(current) : "";
    if (dest && dest !== "pending.html") {
      location.replace(dest);
      return;
    }
    paintEmail(current?.email);
  });
  root.querySelector("[data-pending-switch]")?.addEventListener("click", () => {
    logoutAdmin();
    location.href = "login.html";
  });
  root.querySelector("[data-pending-seller]")?.addEventListener("click", () => {
    logoutAdmin();
    location.href = "market-account.html";
  });
};

export const guardAdminPage = () => {
  if (!document.querySelector("[data-admin-guard], [data-admin-form]")) return;
  if (!isAdminAuthed()) {
    const dest = getAuthSession()?.access_token ? routeAfterAuth(getAuthSession()) : "login.html";
    window.location.replace(dest === "dashboard.html" ? "login.html" : dest);
    return;
  }
  document.querySelector("[data-admin-logout]")?.addEventListener("click", () => {
    logoutAdmin();
    window.location.href = "login.html";
  });
  document.querySelectorAll('a[data-i18n="admin.site"]').forEach((link) => {
    link.addEventListener("click", () => {
      logoutAdmin();
    });
  });
};
