const FILE = () => location.pathname.split("/").pop() || "index.html";

const HEROES = {
  "about.html": { kicker: "nav.overview", title: "nav.about", image: "about-campus.jpg" },
  "environment.html": { kicker: "nav.environment", title: "env.headline", image: "campus-glass.jpg" },
  "admissions.html": { kicker: "nav.admissions", title: "admissions.title", image: "feat-admissions.jpg" },
  "curriculum.html": { kicker: "nav.courses", title: "curr.title", image: "feat-curriculum.jpg" },
  "faculty.html": { kicker: "nav.faculty", title: "faculty.headline", image: "about-faculty.jpg" },
  "guide.html": { kicker: "nav.guide", title: "guide.title", image: "campus-md.jpg" },
  "graduation.html": { kicker: "nav.graduation", title: "grad.pageTitle", image: "cap-architecture.jpg" },
  "dual-degree.html": { kicker: "nav.dual", title: "dual.pageTitle", image: "feat-dual.jpg" },
  "exchange.html": { kicker: "nav.exchange", title: "exchange.title", image: "feat-exchange.jpg" },
  "highlights.html": { kicker: "nav.highlights", title: "highlights.pageTitle", image: "campus-1.jpg" },
  "announcement.html": { kicker: "article.announcement", title: "nav.highlights", image: "campus-glass.jpg" },
};

export const initPageHero = () => {
  if (document.querySelector(".hero, .dd-hero, .office-page, .login-page, .pending-page, .page-hero")) return;
  const main = document.getElementById("main");
  if (!main) return;
  const nested = /\/(announcements|events)\//.test(location.pathname);
  const spec = nested
    ? { kicker: "article.announcement", title: "nav.highlights", image: "campus-glass.jpg" }
    : HEROES[FILE()];
  if (!spec) return;
  const prefix = nested ? "../" : "";
  const section = document.createElement("section");
  section.className = "page-hero";
  section.innerHTML = `
    <div class="page-hero-media">
      <img src="${prefix}images/${spec.image}" alt="" />
    </div>
    <div class="container page-hero-copy">
      <p class="label" data-i18n="${spec.kicker}"></p>
      <h1 data-i18n="${spec.title}"></h1>
    </div>
  `;
  main.prepend(section);
  document.body.classList.add("has-page-hero");
};
