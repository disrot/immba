import { NEWS_SOURCE, getNewsById, publishedNews } from "./news-store.js";

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
    return new URL(href, document.baseURI).href;
  } catch {
    return href;
  }
};

export const renderNewsCards = (lang, labels) => {
  const list = document.querySelector("[data-news-list]");
  if (!list) return;
  const items = publishedNews();
  list.innerHTML = items
    .map((item) => {
      const title = item.title[lang] || item.title.en || item.title.zh;
      const cover = item.photos?.[0]?.src;
      return `<a class="news-item news-card" href="${escapeHtml(resolveHref(item))}">
        ${cover ? `<img class="news-card-photo" src="${escapeHtml(cover)}" alt="" />` : ""}
        <time datetime="${escapeHtml(item.date)}">${escapeHtml(displayDate(item.date))}</time>
        <h3>${escapeHtml(title)}</h3>
        <span class="arrow-link">${escapeHtml(labels.view)}</span>
      </a>`;
    })
    .join("");
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
    <a class="article-back" href="index.html#announcements">${escapeHtml(lang === "zh" ? "返回亮點" : "Back to highlights")}</a>
    <span class="rule" aria-hidden="true"></span>
    <p class="label">${escapeHtml(lang === "zh" ? "公告" : "Announcement")}</p>
    <time datetime="${escapeHtml(item.date)}">${escapeHtml(displayDate(item.date))}</time>
    <h1>${escapeHtml(title)}</h1>
    ${paragraphs.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}
    ${photos ? `<div class="article-photos">${photos}</div>` : ""}
    <p class="news-source-ref"><a href="${escapeHtml(item.source || NEWS_SOURCE)}" target="_blank" rel="noopener noreferrer">${escapeHtml(lang === "zh" ? "官方消息" : "Official news")}</a></p>
  `;
};
