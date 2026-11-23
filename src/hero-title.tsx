const TITLES = {
  en: "Fu Jen Catholic University International MBA (imMBA)",
  zh: "輔仁大學國際創業經營管理碩士學位學程",
};

const host = document.querySelector("[data-hero-title]");
if (host) {
  const paint = () => {
    const lang = document.body?.dataset.lang === "zh" ? "zh" : "en";
    host.textContent = TITLES[lang];
  };
  paint();
  window.addEventListener("immba:lang", paint);
}
