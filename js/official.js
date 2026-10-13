const BASE = "https://www.management.fju.edu.tw/esubweb/immbaengindex/";

export const OFFICIAL_MENU = [
  { href: `${BASE}subindex.php`, key: "notice.official" },
  { href: `${BASE}profile.php?IID=2`, key: "nav.overview" },
  { href: `${BASE}profile.php?IID=36`, key: "nav.environment" },
  { href: `${BASE}enroll.php?IID=3`, key: "nav.apply" },
  { href: `${BASE}class.php?CID=1`, key: "nav.requirements" },
  { href: `${BASE}teacher.php`, key: "nav.faculty" },
  { href: `${BASE}subedit.php?EID=35`, key: "nav.guide" },
  { href: `${BASE}subedit.php?EID=16`, key: "nav.graduation" },
  { href: `${BASE}subedit.php?EID=24`, key: "nav.dual" },
  { href: `${BASE}subedit.php?EID=25`, key: "nav.exchange" },
  { href: `${BASE}subedit.php?EID=36`, key: "nav.highlights" },
  { href: `${BASE}download.php`, key: "nav.downloads" },
  { href: `${BASE}news.php`, key: "news.source" },
  { href: "https://www.management.fju.edu.tw/subweb/immba/", key: "official.zh" },
  { href: "https://www.management.fju.edu.tw/index_en.php", key: "official.collegeEn" },
  { href: "https://www.management.fju.edu.tw/subweb/immba/enroll.php?IID=26", key: "official.local" },
  { href: "http://isc.oie.fju.edu.tw/generalServices.jsp?labelID=39", key: "official.iscProc" },
];

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

const placeTwin = (host, href, label) => {
  if (!host || host.querySelector(":scope > .official-twin, .official-twin")) return;
  host.appendChild(twinLink(href, label));
};

export const applyOfficialLinks = (dict) => {
  const label = dict["official.page"] || "Official page";
  const file = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  const pageUrl = PAGE_OFFICIAL[file];
  if (pageUrl) {
    const heading = document.querySelector("main h1, main .dir-headline, main h2");
    if (heading && !heading.parentElement?.querySelector(".official-twin")) {
      heading.insertAdjacentElement("afterend", twinLink(pageUrl, label));
    }
  }

  placeTwin(document.querySelector("#exchange .text-col"), `${BASE}subedit.php?EID=25`, label);
  placeTwin(document.querySelector("#announcements .container"), `${BASE}subedit.php?EID=36`, label);
  placeTwin(document.querySelector("#downloads .container"), `${BASE}download.php`, label);

  const newsSource = document.querySelector(".news-source-ref a");
  if (newsSource) newsSource.href = `${BASE}news.php`;

  const nav = document.querySelector(".footer-nav");
  if (nav && !nav.querySelector("[data-official-rail]")) {
    const col = document.createElement("div");
    col.setAttribute("data-official-rail", "");
    const title = document.createElement("h2");
    title.dataset.i18n = "official.rail";
    title.textContent = dict["official.rail"] || "Official pages";
    const list = document.createElement("ul");
    list.className = "footer-links official-rail";
    OFFICIAL_MENU.forEach((item) => {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = item.href;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.dataset.i18n = item.key;
      a.textContent = dict[item.key] || item.key;
      li.appendChild(a);
      list.appendChild(li);
    });
    col.appendChild(title);
    col.appendChild(list);
    nav.appendChild(col);
  }

  document.querySelectorAll("[data-i18n='official.page']").forEach((node) => {
    node.textContent = label;
  });
};
