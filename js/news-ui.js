import { NEWS_SOURCE, getNewsById, publishedNews } from "./news-store.js?v=news2";

const FALLBACK_COVERS = [
  "images/campus-glass.jpg",
  "images/campus-md.jpg",
  "images/feat-admissions.jpg",
  "images/feat-curriculum.jpg",
  "images/feat-exchange.jpg",
  "images/about-campus.jpg",
];

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const displayDate = (iso) => String(iso || "").replaceAll("-", "/");

const resolveHref = (item) => {
  const href = (item.linkUrl || `announcement.html?id=${item.id}`).trim();
  try {
    const url = new URL(href, document.baseURI);
    if (url.origin === location.origin) {
      const file = url.pathname.split("/").pop() || href;
      return `${file}${url.search}${url.hash}`;
    }
    return url.href;
  } catch {
    return href;
  }
};

const coverOf = (item, index) => item.photos?.[0]?.src || FALLBACK_COVERS[index % FALLBACK_COVERS.length];

const insightCard = (item, lang, labels, index) => {
  const title = item.title[lang] || item.title.en || item.title.zh;
  return `<a class="insight-card is-cover" href="${escapeHtml(resolveHref(item))}">
      <img src="${escapeHtml(coverOf(item, index))}" alt="" />
      <span class="insight-shade" aria-hidden="true"></span>
      <span class="insight-pills">
        <span><time datetime="${escapeHtml(item.date)}">${escapeHtml(displayDate(item.date))}</time></span>
        <span>${escapeHtml(labels.kicker || "Announcement")}</span>
      </span>
      <span class="insight-copy">
        <h3>${escapeHtml(title)}</h3>
        <span class="insight-more">${escapeHtml(labels.view)}</span>
      </span>
    </a>`;
};

export const renderNewsCards = (lang, labels) => {
  const lists = document.querySelectorAll("[data-news-list]");
  if (!lists.length) return;
  const all = publishedNews();
  lists.forEach((list) => {
    const limit = Number(list.dataset.newsLimit) || 0;
    const items = limit > 0 ? all.slice(0, limit) : all;
    list.innerHTML = items.map((item, index) => insightCard(item, lang, labels, index)).join("");
  });
};

export const renderNewsArticle = (lang) => {
  const article = document.querySelector("[data-news-article]");
  if (!article) return;
  const id = new URLSearchParams(window.location.search).get("id");
  const item = getNewsById(id);
  if (!item) {
    article.innerHTML = `<p>Announcement not found.</p>`;
    return;
  }
  const title = item.title[lang] || item.title.en || item.title.zh;
  const body = item.content[lang] || item.content.en || item.content.zh;
  const paragraphs = body
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const photos = (item.photos || [])
    .map((photo) => `<figure class="article-figure"><img src="${escapeHtml(photo.src)}" alt="" /></figure>`)
    .join("");
  document.title = `${title} — imMBA`;
  article.innerHTML = `
    <a class="article-back" href="highlights.html">${escapeHtml(lang === "zh" ? "返回亮點" : "Back to highlights")}</a>
    <span class="rule" aria-hidden="true"></span>
    <p class="label">${escapeHtml(lang === "zh" ? "公告" : "Announcement")}</p>
    <time datetime="${escapeHtml(item.date)}">${escapeHtml(displayDate(item.date))}</time>
    <h1>${escapeHtml(title)}</h1>
    ${paragraphs.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}
    ${photos ? `<div class="article-photos">${photos}</div>` : ""}
    <p class="news-source-ref"><a href="${escapeHtml(item.source || NEWS_SOURCE)}" target="_blank" rel="noopener noreferrer">${escapeHtml(lang === "zh" ? "官方消息" : "Official news")}</a></p>
  `;
};
