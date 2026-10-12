const PACKETS = [
  {
    id: "ibm",
    code: "IBM",
    tone: "lime",
    price: 450,
    tag: "core",
    format: "packet",
    sold: false,
    en: {
      title: "International Business Management — core textbook and case pack",
      format: "Used book · campus pickup",
    },
    zh: {
      title: "國際企業管理 — 核心教科書與個案教材",
      format: "二手書 · 校園面交",
    },
  },
  {
    id: "ethics",
    code: "ETH",
    tone: "ink",
    price: 120,
    tag: "core",
    format: "packet",
    sold: false,
    en: {
      title: "Business Ethics — 2-credit required course packet",
      format: "Digital packet",
    },
    zh: {
      title: "商業倫理 — 必修 2 學分課程包",
      format: "數位教材包",
    },
  },
  {
    id: "strategy",
    code: "STR",
    tone: "sunken",
    price: 380,
    tag: "core",
    format: "packet",
    sold: false,
    en: {
      title: "Strategic Management: A Global Viewpoint — case pack",
      format: "Digital packet",
    },
    zh: {
      title: "策略管理：全球觀點 — 個案教材",
      format: "數位教材包",
    },
  },
  {
    id: "supply",
    code: "SCM",
    tone: "mid",
    price: 260,
    tag: "core",
    format: "packet",
    sold: false,
    en: {
      title: "Supply Chain and Operations Management — reader",
      format: "Used book · campus pickup",
    },
    zh: {
      title: "供應鏈與作業管理 — 讀本",
      format: "二手書 · 校園面交",
    },
  },
  {
    id: "marketing",
    code: "MKT",
    tone: "lime",
    price: 340,
    tag: "core",
    format: "packet",
    sold: false,
    en: {
      title: "Marketing Management: International Perspectives — course packet",
      format: "Digital packet",
    },
    zh: {
      title: "行銷管理：國際觀點 — 課程包",
      format: "數位教材包",
    },
  },
  {
    id: "org",
    code: "ORG",
    tone: "ink",
    price: 200,
    tag: "core",
    format: "packet",
    sold: true,
    en: {
      title: "Organization Design and Management — lecture notes",
      format: "Digital packet",
    },
    zh: {
      title: "組織設計與管理 — 課堂筆記",
      format: "數位教材包",
    },
  },
  {
    id: "finance",
    code: "FIN",
    tone: "sunken",
    price: 310,
    tag: "core",
    format: "packet",
    sold: false,
    en: {
      title: "Financial Management: International Perspectives — packet",
      format: "Used book · campus pickup",
    },
    zh: {
      title: "財務管理：國際觀點 — 教材包",
      format: "二手書 · 校園面交",
    },
  },
  {
    id: "hr",
    code: "HRM",
    tone: "mid",
    price: 190,
    tag: "elective",
    format: "packet",
    sold: false,
    en: {
      title: "Human Resources and Knowledge Management — reader",
      format: "Digital packet",
    },
    zh: {
      title: "人力資源與知識管理 — 讀本",
      format: "數位教材包",
    },
  },
  {
    id: "analytics",
    code: "DAT",
    tone: "lime",
    price: 180,
    tag: "spotlight",
    format: "packet",
    sold: false,
    en: {
      title: "Data Analytics for International Business — software notes",
      format: "Digital packet",
    },
    zh: {
      title: "國際企業資料分析 — 軟體筆記與書單",
      format: "數位教材包",
    },
  },
  {
    id: "ai",
    code: "AIP",
    tone: "ink",
    price: 220,
    tag: "spotlight",
    format: "packet",
    sold: false,
    en: {
      title: "AI-Assisted Digital Product Development — workshop pack",
      format: "Digital packet",
    },
    zh: {
      title: "AI 輔助數位產品開發 — 工作坊講義",
      format: "數位教材包",
    },
  },
  {
    id: "ibm-used",
    code: "IBM",
    tone: "sunken",
    price: 280,
    tag: "core",
    format: "book",
    sold: false,
    en: {
      title: "International Business Management — previous cohort used copy",
      format: "Used book · campus pickup",
    },
    zh: {
      title: "國際企業管理 — 學長姐流轉用書",
      format: "二手書 · 校園面交",
    },
  },
  {
    id: "thesis",
    code: "THS",
    tone: "mid",
    price: 90,
    tag: "elective",
    format: "packet",
    sold: false,
    en: {
      title: "THESIS enrollment notes and defense checklist",
      format: "Digital packet",
    },
    zh: {
      title: "THESIS 加選說明與口試檢核表",
      format: "數位教材包",
    },
  },
];

const BANNER = ["IBM", "STR", "SCM", "MKT", "ORG", "FIN", "ETH"];

const currentLang = () => (document.body?.dataset.lang === "zh" ? "zh" : "en");

const money = (n) =>
  currentLang() === "zh" ? `NT$${n.toLocaleString("zh-TW")}` : `NT$${n.toLocaleString("en-US")}`;

export const initMarketplace = () => {
  const root = document.querySelector("[data-shop]");
  if (!root || root.dataset.bound === "1") return;
  root.dataset.bound = "1";

  const filter = root.querySelector("[data-shop-filter]");
  const sort = root.querySelector("[data-shop-sort]");
  const count = root.querySelector("[data-shop-count]");
  const grid = root.querySelector("[data-shop-grid]");
  const empty = root.querySelector("[data-shop-empty]");
  const banner = root.querySelector("[data-shop-banner]");

  if (banner) {
    banner.innerHTML = BANNER.map(
      (code, i) => `<span class="shop-notebook shop-notebook--${i % 4}" aria-hidden="true">${code}</span>`
    ).join("");
  }

  const render = () => {
    const tag = filter?.value || "all";
    const order = sort?.value || "featured";
    let list = PACKETS.filter((item) => tag === "all" || item.tag === tag);

    if (order === "az") {
      list = [...list].sort((a, b) => a[currentLang()].title.localeCompare(b[currentLang()].title));
    } else if (order === "za") {
      list = [...list].sort((a, b) => b[currentLang()].title.localeCompare(a[currentLang()].title));
    } else if (order === "price-asc") {
      list = [...list].sort((a, b) => a.price - b.price);
    } else if (order === "price-desc") {
      list = [...list].sort((a, b) => b.price - a.price);
    }

    const n = list.length;
    if (count) {
      count.textContent =
        currentLang() === "zh" ? `${n} 件教材` : `${n} product${n === 1 ? "" : "s"}`;
    }

    grid.innerHTML = list
      .map((item) => {
        const copy = item[currentLang()];
        const price = item.sold
          ? `<span class="shop-sold">${currentLang() === "zh" ? "已售出" : "Sold out"}</span>`
          : `<span class="shop-price">${money(item.price)}</span>`;
        return `<article class="shop-card${item.sold ? " is-sold" : ""}">
          <div class="shop-cover shop-cover--${item.tone}" aria-hidden="true">
            <span>${item.code}</span>
          </div>
          <h2>${copy.title}</h2>
          <p class="shop-format">${copy.format}</p>
          <p class="shop-price-row">${price}</p>
        </article>`;
      })
      .join("");

    if (empty) empty.hidden = list.length > 0;
  };

  filter?.addEventListener("change", render);
  sort?.addEventListener("change", render);
  window.addEventListener("immba:lang", render);
  render();
};
