const FILE = () => location.pathname.split("/").pop() || "index.html";

const HEROES = {
  "about.html": { title: "intro.title", image: "about-campus.jpg" },
  "environment.html": { title: "env.headline", image: "campus-glass.jpg" },
  "admissions.html": { title: "admissions.title", image: "feat-admissions.jpg" },
  "curriculum.html": { title: "curr.title", image: "feat-curriculum.jpg" },
  "faculty.html": { title: "faculty.headline", image: "about-faculty.jpg" },
  "guide.html": { title: "guide.title", image: "campus-md.jpg" },
  "graduation.html": { title: "grad.pageTitle", image: "cap-architecture.jpg" },
  "exchange.html": { title: "exchange.officialTitle", image: "feat-exchange.jpg" },
  "highlights.html": { title: "highlights.pageTitle", image: "campus-1.jpg" },
};

export const initPageHero = () => {
  if (document.querySelector(".hero, .dd-hero, .office-page, .login-page, .pending-page, .page-hero")) return;
  const main = document.getElementById("main");
  if (!main) return;
  if (/\/(announcements|events)\//.test(location.pathname)) return;
  const spec = HEROES[FILE()];
  if (!spec?.title) return;
  const prefix = "";
  const section = document.createElement("section");
  section.className = "page-hero";
  section.innerHTML = `
    <div class="page-hero-media">
      <img src="${prefix}images/${spec.image}" alt="" />
    </div>
    <div class="container page-hero-copy">
      <h1 data-i18n="${spec.title}"></h1>
    </div>
  `;
  main.prepend(section);
  document.body.classList.add("has-page-hero");
};
