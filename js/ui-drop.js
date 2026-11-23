const closeAll = (except) => {
  document.querySelectorAll(".menu-drop.is-open").forEach((node) => {
    if (node !== except) {
      node.classList.remove("is-open");
      node.querySelector("[data-drop-btn]")?.setAttribute("aria-expanded", "false");
    }
  });
};

const selectedLabel = (select) => select.options[select.selectedIndex]?.textContent?.trim() || select.value || "Select";

const placeHighlight = (panel, item) => {
  const highlight = panel.querySelector(".menu-drop-highlight");
  if (!highlight) return;
  if (!item) {
    highlight.hidden = true;
    return;
  }
  highlight.hidden = false;
  highlight.style.height = `${item.offsetHeight}px`;
  highlight.style.transform = `translateY(${item.offsetTop}px)`;
};

export const refreshSelectDrop = (select) => {
  const wrap = select.closest(".menu-drop");
  if (!wrap) return;
  const btn = wrap.querySelector("[data-drop-btn]");
  const panel = wrap.querySelector("[data-drop-panel]");
  if (btn) btn.textContent = selectedLabel(select);
  if (!panel) return;
  let highlight = panel.querySelector(".menu-drop-highlight");
  if (!highlight) {
    highlight = document.createElement("span");
    highlight.className = "menu-drop-highlight";
    highlight.hidden = true;
    panel.prepend(highlight);
  }
  panel.querySelectorAll(".menu-drop-item").forEach((node) => node.remove());
  [...select.options].forEach((option) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = `menu-drop-item${option.selected ? " is-on" : ""}`;
    item.dataset.value = option.value;
    item.setAttribute("role", "option");
    item.setAttribute("aria-selected", String(option.selected));
    item.textContent = option.textContent;
    panel.append(item);
  });
  placeHighlight(panel, wrap.classList.contains("is-open") ? panel.querySelector(".menu-drop-item.is-on") : null);
};

export const bindSelectDrop = (select) => {
  if (!select || select.dataset.dropBound === "1" || select.multiple) return;
  select.dataset.dropBound = "1";
  const office = Boolean(select.closest(".office-page"));
  const wrap = document.createElement("div");
  wrap.className = `menu-drop ${office ? "menu-drop-office" : "menu-drop-public"}`;
  if (select.closest(".office-switch")) wrap.classList.add("menu-drop-title");
  select.classList.add("menu-drop-source");
  select.tabIndex = -1;
  select.setAttribute("aria-hidden", "true");
  select.parentNode.insertBefore(wrap, select);
  wrap.appendChild(select);
  const hostLabel = wrap.closest("label");
  hostLabel?.addEventListener("click", (event) => {
    if (event.target.closest("[data-drop-btn], [data-drop-panel]")) event.preventDefault();
  });
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "menu-drop-btn";
  btn.setAttribute("data-drop-btn", "");
  btn.setAttribute("aria-expanded", "false");
  btn.setAttribute("aria-haspopup", "listbox");
  const panel = document.createElement("div");
  panel.className = "menu-drop-panel";
  panel.setAttribute("data-drop-panel", "");
  panel.setAttribute("role", "listbox");
  wrap.append(btn, panel);
  panel.addEventListener("mouseover", (event) => {
    const item = event.target.closest(".menu-drop-item");
    if (item) placeHighlight(panel, item);
  });
  refreshSelectDrop(select);

  btn.addEventListener("click", (event) => {
    event.preventDefault();
    const open = !wrap.classList.contains("is-open");
    closeAll(wrap);
    wrap.classList.toggle("is-open", open);
    btn.setAttribute("aria-expanded", String(open));
    if (open) requestAnimationFrame(() => placeHighlight(panel, panel.querySelector(".menu-drop-item.is-on")));
  });

  panel.addEventListener("click", (event) => {
    const item = event.target.closest("[data-value]");
    if (!item) return;
    select.value = item.getAttribute("data-value");
    select.dispatchEvent(new Event("change", { bubbles: true }));
    refreshSelectDrop(select);
    wrap.classList.remove("is-open");
    btn.setAttribute("aria-expanded", "false");
  });

  select.addEventListener("change", () => refreshSelectDrop(select));
};

export const bindPanelDrop = (wrap) => {
  if (!wrap || wrap.dataset.dropBound === "1") return;
  wrap.dataset.dropBound = "1";
  wrap.querySelector("[data-drop-btn]")?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const open = !wrap.classList.contains("is-open");
    closeAll(wrap);
    wrap.classList.toggle("is-open", open);
    wrap.querySelector("[data-drop-btn]")?.setAttribute("aria-expanded", String(open));
  });
};

export const initSelectDrops = (root = document) => {
  root.querySelectorAll("select").forEach(bindSelectDrop);
  if (root === document && !window.__immbaDropWatch) {
    window.__immbaDropWatch = true;
    new MutationObserver(() => {
      document.querySelectorAll("select:not([data-drop-bound])").forEach(bindSelectDrop);
    }).observe(document.body, { childList: true, subtree: true });
  }
};

if (!window.__immbaDropDoc) {
  window.__immbaDropDoc = true;
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".menu-drop")) closeAll();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeAll();
  });
}
