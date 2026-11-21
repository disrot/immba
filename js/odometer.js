const EASE = "cubic-bezier(0.23, 1, 0.32, 1)";
const ROLL_MS = 550;
const STAGGER_MS = 30;
const seen = new Map();

const esc = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const digitsFromRight = (text) => {
  const chars = Array.from(text || "");
  const map = new Map();
  chars.forEach((char, index) => {
    const digit = Number.parseInt(char, 10);
    if (!Number.isNaN(digit)) map.set(chars.length - index, digit);
  });
  return map;
};

const face = (text, previous) => {
  const chars = Array.from(text);
  const earlier = previous == null ? null : digitsFromRight(previous);
  return chars
    .map((char, index) => {
      const fromRight = chars.length - index;
      const digit = Number.parseInt(char, 10);
      if (Number.isNaN(digit)) return `<span class="odo-char">${esc(char)}</span>`;
      const from = earlier?.has(fromRight) ? earlier.get(fromRight) : digit;
      return `<span class="odo-window"><span class="odo-sizer">0</span><span class="odo-strip" data-digit="${digit}" data-from="${from}" data-place="${fromRight}" style="transform:translateY(calc(${-from} * 1em))">${"0123456789"
        .split("")
        .map((n) => `<span>${n}</span>`)
        .join("")}</span></span>`;
    })
    .join("");
};

const paint = (node) => {
  const id = node.getAttribute("data-odo") || "";
  const next = node.getAttribute("data-odo-value") || "";
  if (node.dataset.shown === next && node.querySelector(".odo-strip")) return;
  const previous = seen.get(id);
  const visual = document.createElement("span");
  visual.className = "odo-face";
  visual.setAttribute("aria-hidden", "true");
  visual.innerHTML = face(next, previous);
  node.querySelector(".odo-face")?.remove();
  node.append(visual);
  node.dataset.shown = next;
  seen.set(id, next);
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const strips = [...visual.querySelectorAll(".odo-strip")];
  if (previous == null || previous === next || reduce) {
    strips.forEach((strip) => {
      strip.style.transform = `translateY(calc(${-Number(strip.dataset.digit)} * 1em))`;
    });
    return;
  }
  const land = () => {
    strips.forEach((strip) => {
      if (!strip.isConnected) return;
      const place = Number(strip.dataset.place) || 1;
      strip.style.transition = `transform ${ROLL_MS}ms ${EASE} ${(place - 1) * STAGGER_MS}ms`;
      strip.style.transform = `translateY(calc(${-Number(strip.dataset.digit)} * 1em))`;
    });
  };
  requestAnimationFrame(land);
  window.setTimeout(land, 40);
};

export const syncOdo = (root = document) => {
  root.querySelectorAll("[data-odo]").forEach(paint);
};

/** A price or count that rolls when the same id changes. */
export const odo = (id, text) =>
  `<span class="odo" data-odo="${esc(id)}" data-odo-value="${esc(text)}"><span class="sr-only">${esc(text)}</span></span>`;

let scheduled = false;
const schedule = () => {
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(() => {
    scheduled = false;
    syncOdo(document);
  });
};

if (typeof document !== "undefined" && !document.documentElement.dataset.odoWatch) {
  document.documentElement.dataset.odoWatch = "1";
  const start = () => {
    syncOdo(document);
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  };
  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start, { once: true });
}
