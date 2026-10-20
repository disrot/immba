import { facultyPhotoSrc, listFaculty } from "./faculty-store.js";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const currentLang = () => (document.body?.dataset.lang === "zh" ? "zh" : "en");

const t = (en, zh) => (currentLang() === "zh" ? zh : en);

export const initFacultyDirectory = () => {
  const root = document.querySelector("[data-faculty-directory]");
  if (!root || root.dataset.bound === "1") return;
  root.dataset.bound = "1";

  const search = root.querySelector("[data-faculty-search]");
  const typeSelect = root.querySelector("[data-faculty-type]");
  const letters = root.querySelector("[data-faculty-letters]");
  const grid = root.querySelector("[data-faculty-grid]");
  const empty = root.querySelector("[data-faculty-empty]");
  let letter = "all";
  let people = [];

  letters.innerHTML = ["all", ...LETTERS]
    .map(
      (value) =>
        `<button type="button" class="dir-letter${value === "all" ? " is-active" : ""}" data-letter="${value}">${
          value === "all" ? "" : value
        }</button>`
    )
    .join("");

  const allBtn = letters.querySelector('[data-letter="all"]');
  if (allBtn) allBtn.setAttribute("data-i18n-letter-all", "");

  const labelAll = () => {
    const btn = letters.querySelector('[data-letter="all"]');
    if (btn) btn.textContent = t("All", "全部");
  };

  const matches = (person) => {
    const q = (search?.value || "").trim().toLowerCase();
    const type = typeSelect?.value || "all";
    const copy = person[currentLang()];
    const hay = `${person.name} ${copy.role} ${copy.specialties} ${copy.education}`.toLowerCase();
    if (q && !hay.includes(q)) return false;
    if (type !== "all" && person.type !== type) return false;
    if (letter !== "all" && (person.last || person.name || " ")[0].toUpperCase() !== letter) return false;
    return true;
  };

  const render = () => {
    labelAll();
    const list = people.filter(matches);
    grid.innerHTML = list
      .map((person) => {
        const copy = person[currentLang()];
        const website = person.website
          ? `<p class="dir-card-contact"><a href="${person.website}" target="_blank" rel="noopener noreferrer">${t(
              "Personal website",
              "個人網站"
            )}</a></p>`
          : "";
        const tel = person.tel
          ? `<p class="dir-card-contact"><span>${t("TEL", "電話")}</span> ${person.tel}</p>`
          : "";
        const mail = person.email
          ? `<p class="dir-card-contact"><span>${t("E-mail", "電子郵件")}</span> <a href="mailto:${person.email}">${person.email}</a></p>`
          : "";
        return `<article class="dir-card">
          <div class="dir-card-photo">
            <img src="${facultyPhotoSrc(person.photo)}" alt="${person.name}" width="400" height="400" />
          </div>
          <h2>${person.name}</h2>
          <p class="dir-card-title">${copy.role}</p>
          <p class="dir-card-spec">${copy.specialties}</p>
          <p class="dir-card-edu"><span>${t("Education", "學歷")}</span> ${copy.education}</p>
          ${tel}${mail}${website}
        </article>`;
      })
      .join("");
    empty.hidden = list.length > 0;
  };

  letters.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-letter]");
    if (!btn) return;
    letter = btn.getAttribute("data-letter");
    letters.querySelectorAll(".dir-letter").forEach((node) => {
      node.classList.toggle("is-active", node === btn);
    });
    render();
  });

  search?.addEventListener("input", render);
  typeSelect?.addEventListener("change", render);
  window.addEventListener("immba:lang", render);
  void listFaculty().then((records) => {
    people = records;
    render();
  });
};
