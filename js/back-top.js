const topLabel = () => (document.body?.dataset.lang === "zh" ? "回到頂端" : "Back to top");

const initBackTop = () => {
  if (document.querySelector("[data-back-top]")) return;

  const backTop = document.createElement("button");
  backTop.type = "button";
  backTop.className = "back-top";
  backTop.setAttribute("data-back-top", "");
  backTop.setAttribute("data-i18n-attr", "aria-label:ui.top");
  backTop.setAttribute("aria-label", topLabel());
  backTop.innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6.5 14.5 12 9l5.5 5.5" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="square" stroke-linejoin="miter"/></svg>';
  document.body.append(backTop);

  const sync = () => {
    backTop.classList.toggle("is-visible", window.scrollY > 360);
  };

  backTop.addEventListener("click", () => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const root = document.scrollingElement || document.documentElement;
    root.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  });

  window.addEventListener("scroll", sync, { passive: true });
  window.addEventListener("immba:lang", () => {
    backTop.setAttribute("aria-label", topLabel());
  });
  sync();
};

initBackTop();
