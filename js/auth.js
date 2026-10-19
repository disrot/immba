const SESSION_KEY = "immba-admin-session";
const SESSION_OK = "1";
const ADMIN_USER = "admin";
const ADMIN_PASS = "123456";
const DOUBLE_CLICK_MS = 320;

export const isAdminAuthed = () =>
  sessionStorage.getItem(SESSION_KEY) === SESSION_OK || localStorage.getItem(SESSION_KEY) === SESSION_OK;

export const loginAdmin = (user, pass, remember) => {
  if (user === ADMIN_USER && pass === ADMIN_PASS) {
    logoutAdmin();
    const store = remember ? localStorage : sessionStorage;
    store.setItem(SESSION_KEY, SESSION_OK);
    return true;
  }
  return false;
};

export const logoutAdmin = () => {
  sessionStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_KEY);
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

export const initLoginForm = () => {
  const form = document.querySelector("[data-login-form]");
  if (!form) return;
  if (isAdminAuthed()) {
    window.location.replace("dashboard.html");
    return;
  }
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const user = String(form.elements.namedItem("username")?.value || "").trim();
    const pass = String(form.elements.namedItem("password")?.value || "");
    const remember = Boolean(form.elements.namedItem("remember")?.checked);
    const err = form.querySelector("[data-login-error]");
    if (loginAdmin(user, pass, remember)) {
      window.location.replace("dashboard.html");
      return;
    }
    if (err) {
      err.hidden = false;
      err.textContent = err.getAttribute("data-error-text") || err.textContent;
    }
  });
};

export const guardAdminPage = () => {
  if (!document.querySelector("[data-admin-guard], [data-admin-form]")) return;
  if (!isAdminAuthed()) {
    window.location.replace("login.html");
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
