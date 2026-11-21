const KEY = "immba-office-bento";
const SPANS = [2, 4, 6];

const cardsOf = (grid) => [...grid.querySelectorAll(":scope > .office-widget")];

const readLayout = (grid) =>
  cardsOf(grid).map((card) => ({
    id: card.dataset.bentoId,
    span: Number(card.dataset.span) || 2,
  }));

const saveLayout = (grid) => {
  const board = grid.getAttribute("data-bento") || "analytics";
  let all = {};
  try {
    all = JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    all = {};
  }
  all[board] = readLayout(grid);
  localStorage.setItem(KEY, JSON.stringify(all));
};

const restoreLayout = (grid) => {
  const board = grid.getAttribute("data-bento") || "analytics";
  let saved = [];
  try {
    saved = JSON.parse(localStorage.getItem(KEY) || "{}")[board] || [];
  } catch {
    saved = [];
  }
  const byId = new Map(cardsOf(grid).map((card) => [card.dataset.bentoId, card]));
  saved.forEach((item) => {
    const card = byId.get(item.id);
    if (!card) return;
    card.dataset.span = SPANS.includes(item.span) ? String(item.span) : "2";
    grid.append(card);
  });
};

const nearestCard = (grid, x, y, skip) => {
  const hit = document.elementFromPoint(x, y);
  const card = hit?.closest?.(".office-widget");
  if (!card || card === skip || !grid.contains(card)) return null;
  return card;
};

const stepSpan = (span, delta) => {
  const index = Math.max(0, SPANS.indexOf(span));
  return SPANS[Math.min(SPANS.length - 1, Math.max(0, index + delta))];
};

export const initOfficeBento = (root = document) => {
  root.querySelectorAll("[data-bento]").forEach((grid) => {
    if (grid.dataset.bentoBound === "1") return;
    grid.dataset.bentoBound = "1";
    cardsOf(grid).forEach((card, index) => {
      const title = card.querySelector("h2");
      card.dataset.bentoId = title?.getAttribute("data-i18n") || `card-${index}`;
      const wide = card.classList.contains("office-c8") || card.classList.contains("office-span-2");
      card.dataset.span = wide ? "4" : "2";
      const head = card.querySelector(".office-card-top, .office-widget-head") || card;
      const grip = document.createElement("button");
      grip.type = "button";
      grip.className = "bento-grip";
      grip.dataset.bentoGrip = "";
      const name = title?.textContent?.trim() || "widget";
      grip.setAttribute("aria-label", `Move ${name}`);
      grip.title = "Drag to move. Arrow keys move it.";
      grip.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7h.01M9 12h.01M9 17h.01M15 7h.01M15 12h.01M15 17h.01" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>`;
      head.prepend(grip);
      const resize = document.createElement("button");
      resize.type = "button";
      resize.className = "bento-resize";
      resize.dataset.bentoResize = "";
      resize.setAttribute("aria-label", `Resize ${name}`);
      resize.title = "Drag to resize. Left and right arrows change the width.";
      resize.innerHTML = `<svg viewBox="0 0 10 10" aria-hidden="true"><circle cx="8.5" cy="3.5" r="1.1" fill="currentColor"/><circle cx="6" cy="6" r="1.1" fill="currentColor"/><circle cx="3.5" cy="8.5" r="1.1" fill="currentColor"/></svg>`;
      card.append(resize);
    });
    restoreLayout(grid);

    let drag = null;
    let resize = null;

    grid.addEventListener("pointerdown", (event) => {
      const grip = event.target.closest("[data-bento-grip]");
      const handle = event.target.closest("[data-bento-resize]");
      const card = (grip || handle)?.closest(".office-widget");
      if (!card || !grid.contains(card) || event.button !== 0) return;
      event.preventDefault();
      if (grip) {
        drag = { card, pointerId: event.pointerId };
        card.classList.add("is-lifted");
        grip.setPointerCapture(event.pointerId);
        return;
      }
      resize = {
        card,
        pointerId: event.pointerId,
        startX: event.clientX,
        span: Number(card.dataset.span) || 2,
      };
      handle.setPointerCapture(event.pointerId);
    });

    grid.addEventListener("pointermove", (event) => {
      if (drag && event.pointerId === drag.pointerId) {
        const target = nearestCard(grid, event.clientX, event.clientY, drag.card);
        if (!target) return;
        const box = target.getBoundingClientRect();
        const after = event.clientX > box.left + box.width / 2;
        grid.insertBefore(drag.card, after ? target.nextSibling : target);
        return;
      }
      if (!resize || event.pointerId !== resize.pointerId) return;
      const width = grid.getBoundingClientRect().width / 6;
      const steps = Math.round((event.clientX - resize.startX) / Math.max(width, 1));
      const next = stepSpan(resize.span, steps);
      resize.card.dataset.span = String(next);
    });

    const finish = (event) => {
      if (drag && event.pointerId === drag.pointerId) {
        drag.card.classList.remove("is-lifted");
        drag = null;
        saveLayout(grid);
      }
      if (resize && event.pointerId === resize.pointerId) {
        resize = null;
        saveLayout(grid);
      }
    };
    grid.addEventListener("pointerup", finish);
    grid.addEventListener("pointercancel", finish);

    grid.addEventListener("keydown", (event) => {
      const grip = event.target.closest("[data-bento-grip]");
      const handle = event.target.closest("[data-bento-resize]");
      const card = (grip || handle)?.closest(".office-widget");
      if (!card) return;
      if (grip && (event.key === "ArrowLeft" || event.key === "ArrowRight" || event.key === "ArrowUp" || event.key === "ArrowDown")) {
        event.preventDefault();
        const list = cardsOf(grid);
        const index = list.indexOf(card);
        const next = event.key === "ArrowLeft" || event.key === "ArrowUp" ? list[index - 1] : list[index + 1];
        if (!next) return;
        if (event.key === "ArrowLeft" || event.key === "ArrowUp") grid.insertBefore(card, next);
        else grid.insertBefore(next, card);
        saveLayout(grid);
        grip.focus();
      }
      if (handle && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
        event.preventDefault();
        const delta = event.key === "ArrowRight" ? 1 : -1;
        card.dataset.span = String(stepSpan(Number(card.dataset.span) || 2, delta));
        saveLayout(grid);
      }
    });
  });
};
