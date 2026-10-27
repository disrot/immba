const closeAll = (except) => {
  document.querySelectorAll(".menu-drop.is-open").forEach((node) => {
    if (node !== except) {
      node.classList.remove("is-open");
      node.querySelector("[data-drop-btn]")?.setAttribute("aria-expanded", "false");
    }
  });
};

const selectedLabel = (select) => select.options[select.selectedIndex]?.textContent?.trim() || select.value || "Select";

export const refreshSelectDrop = (select) => {
  const wrap = select.closest(".menu-drop");
  if (!wrap) return;
  const btn = wrap.querySelector("[data-drop-btn]");
  const panel = wrap.querySelector("[data-drop-panel]");
  if (btn) btn.textContent = selectedLabel(select);
  if (!panel) return;
  panel.innerHTML = [...select.options]
    .map(
      (option) =>
        `<button type="button" class="menu-drop-item${option.selected ? " is-on" : ""}" data-value="${option.value}">${option.textContent}</button>`
    )
    .join("");
};

export const bindSelectDrop = (select) => {
  if (!select || select.dataset.dropBound === "1" || select.multiple) return;
  select.dataset.dropBound = "1";
  const office = Boolean(select.closest(".office-page"));
  const wrap = document.createElement("div");
  wrap.className = `menu-drop ${office ? "menu-drop-office" : "menu-drop-public"}`;
  if (select.closest(".office-switch")) wrap.classList.add("menu-drop-title");
  select.classList.add("menu-drop-source");
  select.parentNode.insertBefore(wrap, select);
  wrap.appendChild(select);
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
  refreshSelectDrop(select);

  btn.addEventListener("click", (event) => {
    event.preventDefault();
    const open = !wrap.classList.contains("is-open");
    closeAll(wrap);
    wrap.classList.toggle("is-open", open);
    btn.setAttribute("aria-expanded", String(open));
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
