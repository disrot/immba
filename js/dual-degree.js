const SCHOOLS = ["flint", "kedge", "iqs"];

const parseSchool = () => {
  const params = new URLSearchParams(window.location.search);
  const query = (params.get("school") || "").toLowerCase();
  if (SCHOOLS.includes(query)) return query;
  const hash = window.location.hash.replace(/^#/, "").toLowerCase();
  if (SCHOOLS.includes(hash)) return hash;
  return "flint";
};

const setSchool = (id, { historyMode = "replace" } = {}) => {
  const school = SCHOOLS.includes(id) ? id : "flint";
  const tabs = document.querySelectorAll("[data-dd-tab]");
  const panels = document.querySelectorAll("[data-dd-panel]");

  tabs.forEach((tab) => {
    const on = tab.dataset.ddTab === school;
    tab.setAttribute("aria-selected", on ? "true" : "false");
    tab.tabIndex = on ? 0 : -1;
    tab.classList.toggle("is-active", on);
  });

  panels.forEach((panel) => {
    const on = panel.dataset.ddPanel === school;
    panel.hidden = !on;
  });

  const url = new URL(window.location.href);
  url.searchParams.set("school", school);
  url.hash = school;
  if (historyMode === "push") {
    history.pushState({ school }, "", `${url.pathname}${url.search}${url.hash}`);
  } else if (historyMode === "replace") {
    history.replaceState({ school }, "", `${url.pathname}${url.search}${url.hash}`);
  }
};

const root = document.querySelector("[data-dd]");
if (root) {
  const tabs = [...root.querySelectorAll("[data-dd-tab]")];
  const rail = root.querySelector("[role='tablist']");
  const desktopDock = window.matchMedia("(min-width: 900px)");
  const syncOrientation = () => {
    if (rail) {
      rail.setAttribute("aria-orientation", desktopDock.matches ? "vertical" : "horizontal");
    }
  };

  setSchool(parseSchool(), { historyMode: "replace" });
  syncOrientation();
  if (typeof desktopDock.addEventListener === "function") {
    desktopDock.addEventListener("change", syncOrientation);
  }

  root.querySelectorAll("[data-dd-jump]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      const school = link.dataset.ddJump;
      setSchool(school, { historyMode: "push" });
      document.getElementById(`dd-panel-${school}`)?.scrollIntoView({ block: "start" });
    });
  });

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      setSchool(tab.dataset.ddTab, { historyMode: "push" });
    });
    tab.addEventListener("keydown", (event) => {
      const keys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"];
      if (!keys.includes(event.key)) return;
      event.preventDefault();
      const current = tabs.indexOf(tab);
      let next = current;
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        next = (current - 1 + tabs.length) % tabs.length;
      } else if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        next = (current + 1) % tabs.length;
      } else if (event.key === "Home") {
        next = 0;
      } else if (event.key === "End") {
        next = tabs.length - 1;
      }
      tabs[next].focus();
      setSchool(tabs[next].dataset.ddTab, { historyMode: "push" });
    });
  });

  window.addEventListener("popstate", () => {
    setSchool(parseSchool(), { historyMode: "none" });
  });
  window.addEventListener("hashchange", () => {
    setSchool(parseSchool(), { historyMode: "replace" });
  });
}
