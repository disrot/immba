const BASE = "https://www.management.fju.edu.tw/esubweb/immbaengindex/";

const PAGE_OFFICIAL = {
  "index.html": `${BASE}subindex.php`,
  "": `${BASE}subindex.php`,
  "about.html": `${BASE}profile.php?IID=2`,
  "environment.html": `${BASE}profile.php?IID=36`,
  "admissions.html": `${BASE}enroll.php?IID=3`,
  "curriculum.html": `${BASE}class.php?CID=1`,
  "faculty.html": `${BASE}teacher.php`,
  "guide.html": `${BASE}subedit.php?EID=35`,
  "graduation.html": `${BASE}subedit.php?EID=16`,
  "dual-degree.html": `${BASE}subedit.php?EID=24`,
  "announcement.html": `${BASE}news.php`,
  "highlights.html": `${BASE}subedit.php?EID=36`,
};

const twinLink = (href, label) => {
  const a = document.createElement("a");
  a.className = "official-twin";
  a.href = href;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.dataset.i18n = "official.page";
  a.textContent = label;
  return a;
};

export const applyOfficialLinks = (dict) => {
  const label = dict["official.page"] || "Official page";
  const file = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  const isHome = file === "index.html" || file === "";
  const pageUrl = PAGE_OFFICIAL[file];
  if (pageUrl && !isHome) {
    const heading = document.querySelector("main h1, main .dir-headline, main h2");
    if (
      heading &&
      !heading.closest(".hero") &&
      !heading.parentElement?.querySelector(".official-twin")
    ) {
      heading.insertAdjacentElement("afterend", twinLink(pageUrl, label));
    }
  }

  const newsSource = document.querySelector(".news-source-ref a");
  if (newsSource) newsSource.href = `${BASE}news.php`;

  const nested = /\/(announcements|events)\//.test(location.pathname);
  const highlightsHref = nested ? "../highlights.html" : "highlights.html";
  document.querySelectorAll('a[data-i18n="nav.highlights"]').forEach((link) => {
    link.setAttribute("href", highlightsHref);
  });

  document.querySelector("[data-official-rail]")?.remove();

  document.querySelectorAll("[data-i18n='official.page']").forEach((node) => {
    node.textContent = label;
  });
};
