import { listCloudListings } from "./listings-store.js?v=notice3";

export const PACKETS = [
  {
    id: "ibm",
    sku: "IBM-01",
    image: "images/marketplace/ibm.jpg",
    gallery: ["images/marketplace/ibm.jpg", "images/marketplace/ibm-used.jpg"],
    family: "ibm",
    price: 450,
    tag: "core",
    kind: "book",
    sold: false,
    en: {
      title: "International Business Management",
      format: "Used book · campus pickup",
      style: "Textbook",
      blurb:
        "Core textbook and case pack for International Business Management, typically circulated between first-year cohorts. Notes in the margins are from the previous English-taught offering.",
      details: ["Core required course", "Print textbook plus case pack", "Highlights and tabs from one prior owner"],
      pickup: "Campus pickup at the College of Management, LM208-1, by appointment after you message the seller.",
    },
    zh: {
      title: "國際企業管理",
      format: "二手書 · 校園面交",
      style: "教科書",
      blurb: "國際企業管理核心教科書與個案教材，常見於一年級同學流轉。書內畫線與標籤來自前一屆英語授課使用。",
      details: ["核心必修", "紙本教科書與個案包", "前持有者畫線與便利貼"],
      pickup: "約定後於管理學院 LM208-1 校園面交。",
    },
  },
  {
    id: "ethics",
    sku: "ETH-02",
    image: "images/marketplace/ethics.jpg",
    gallery: ["images/marketplace/ethics.jpg"],
    family: "ethics",
    price: 120,
    tag: "core",
    kind: "digital",
    sold: false,
    en: {
      title: "Business Ethics",
      format: "Digital packet",
      style: "Packet",
      blurb:
        "2-credit required course packet for Business Ethics. Files include the reading order, discussion prompts, and the short case set used in the English-taught section.",
      details: ["Core required, 2 credits", "PDF packet", "Sent by campus email after confirmation"],
      pickup: "Digital delivery. No campus pickup. The seller sends a link after you write.",
    },
    zh: {
      title: "商業倫理",
      format: "數位教材包",
      style: "教材包",
      blurb: "商業倫理必修 2 學分課程包，含閱讀順序、討論題與英語班使用的短個案。",
      details: ["核心必修 2 學分", "PDF 教材包", "確認後以校園信箱寄出"],
      pickup: "數位交付，無需面交；賣方確認後寄送連結。",
    },
  },
  {
    id: "strategy",
    sku: "STR-03",
    image: "images/marketplace/strategy.jpg",
    gallery: ["images/marketplace/strategy.jpg"],
    family: "strategy",
    price: 380,
    tag: "core",
    kind: "digital",
    sold: false,
    en: {
      title: "Strategic Management",
      format: "Digital packet",
      style: "Packet",
      blurb:
        "Case pack for Strategic Management: A Global Viewpoint. Includes the semester case list and the note pack used in class discussion.",
      details: ["Core required course", "Digital case pack", "Matches the current English syllabus"],
      pickup: "Digital delivery by campus email after you message the seller.",
    },
    zh: {
      title: "策略管理",
      format: "數位教材包",
      style: "教材包",
      blurb: "策略管理：全球觀點個案教材，含學期個案清單與課堂討論筆記。",
      details: ["核心必修", "數位個案包", "對應當學期英語課綱"],
      pickup: "訊息確認後以校園信箱數位交付。",
    },
  },
  {
    id: "supply",
    sku: "SCM-04",
    image: "images/marketplace/supply.jpg",
    gallery: ["images/marketplace/supply.jpg"],
    family: "supply",
    price: 260,
    tag: "core",
    kind: "book",
    sold: false,
    en: {
      title: "Supply Chain and Operations",
      format: "Used book · campus pickup",
      style: "Reader",
      blurb:
        "Used reader for Supply Chain and Operations Management. Spine is creased; problem sets in the back are unmarked.",
      details: ["Core required course", "Print reader", "Light wear on the cover"],
      pickup: "Campus pickup at the College of Management after you agree a time with the seller.",
    },
    zh: {
      title: "供應鏈與作業管理",
      format: "二手書 · 校園面交",
      style: "讀本",
      blurb: "供應鏈與作業管理二手讀本，書脊有摺痕，習題未作答。",
      details: ["核心必修", "紙本讀本", "封面輕微使用痕跡"],
      pickup: "與賣方約定時間後於管理學院面交。",
    },
  },
  {
    id: "marketing",
    sku: "MKT-05",
    image: "images/marketplace/marketing.jpg",
    gallery: ["images/marketplace/marketing.jpg"],
    family: "marketing",
    price: 340,
    tag: "core",
    kind: "digital",
    sold: false,
    en: {
      title: "Marketing Management",
      format: "Digital packet",
      style: "Packet",
      blurb:
        "Course packet for Marketing Management: International Perspectives, with the slide outline and brand cases used in the English section.",
      details: ["Core required course", "Digital packet", "Includes the brand-case appendix"],
      pickup: "Digital delivery by campus email after confirmation.",
    },
    zh: {
      title: "行銷管理",
      format: "數位教材包",
      style: "教材包",
      blurb: "行銷管理：國際觀點課程包，含英語班投影大綱與品牌個案。",
      details: ["核心必修", "數位教材包", "含品牌個案附錄"],
      pickup: "確認後以校園信箱數位交付。",
    },
  },
  {
    id: "org",
    sku: "ORG-06",
    image: "images/marketplace/org.jpg",
    gallery: ["images/marketplace/org.jpg"],
    family: "org",
    price: 200,
    tag: "core",
    kind: "digital",
    sold: true,
    en: {
      title: "Organization Design",
      format: "Digital packet",
      style: "Notes",
      blurb:
        "Lecture notes for Organization Design and Management. This copy has already been reserved by another student.",
      details: ["Core required course", "Digital lecture notes", "Currently unavailable"],
      pickup: "This listing is sold out. Watch the marketplace if a later cohort re-lists it.",
    },
    zh: {
      title: "組織設計與管理",
      format: "數位教材包",
      style: "筆記",
      blurb: "組織設計與管理課堂筆記。此份已由其他同學保留。",
      details: ["核心必修", "數位課堂筆記", "目前無法購買"],
      pickup: "已售出。若後續學長姐再上架，請留意市集。",
    },
  },
  {
    id: "finance",
    sku: "FIN-07",
    image: "images/marketplace/finance.jpg",
    gallery: ["images/marketplace/finance.jpg"],
    family: "finance",
    price: 310,
    tag: "core",
    kind: "book",
    sold: false,
    en: {
      title: "Financial Management",
      format: "Used book · campus pickup",
      style: "Textbook",
      blurb:
        "Used copy of Financial Management: International Perspectives. Formula pages are flagged; end-of-chapter answers are blank.",
      details: ["Core required course", "Print textbook", "Tabs on the formula pages"],
      pickup: "Campus pickup at LM208-1 or the library lobby, agreed with the seller.",
    },
    zh: {
      title: "財務管理",
      format: "二手書 · 校園面交",
      style: "教科書",
      blurb: "財務管理：國際觀點二手書，公式頁有標籤，章末習題未填。",
      details: ["核心必修", "紙本教科書", "公式頁貼有標籤"],
      pickup: "與賣方約定於 LM208-1 或圖書館大廳面交。",
    },
  },
  {
    id: "hr",
    sku: "HRM-08",
    image: "images/marketplace/hr.jpg",
    gallery: ["images/marketplace/hr.jpg"],
    family: "hr",
    price: 190,
    tag: "elective",
    kind: "digital",
    sold: false,
    en: {
      title: "Human Resources",
      format: "Digital packet",
      style: "Reader",
      blurb:
        "Reader for Human Resources and Knowledge Management, with the article list and seminar questions from the elective offering.",
      details: ["Elective", "Digital reader", "Article list included"],
      pickup: "Digital delivery by campus email after you message the seller.",
    },
    zh: {
      title: "人力資源與知識管理",
      format: "數位教材包",
      style: "讀本",
      blurb: "人力資源與知識管理選修讀本，含文章清單與研討問題。",
      details: ["選修", "數位讀本", "含文章清單"],
      pickup: "訊息確認後以校園信箱數位交付。",
    },
  },
  {
    id: "analytics",
    sku: "DAT-09",
    image: "images/marketplace/analytics.jpg",
    gallery: ["images/marketplace/analytics.jpg"],
    family: "analytics",
    price: 180,
    tag: "spotlight",
    kind: "digital",
    sold: false,
    en: {
      title: "Data Analytics",
      format: "Digital packet",
      style: "Notes",
      blurb:
        "Software notes and reading list for Data Analytics for International Business, the new analytics spotlight course.",
      details: ["Spotlight course", "Digital notes", "Includes the software walk-through"],
      pickup: "Digital delivery. Files are sent after the seller confirms your campus email.",
    },
    zh: {
      title: "國際企業資料分析",
      format: "數位教材包",
      style: "筆記",
      blurb: "國際企業資料分析焦點課程的軟體筆記與書單。",
      details: ["焦點課程", "數位筆記", "含軟體操作說明"],
      pickup: "數位交付；賣方確認校園信箱後寄送檔案。",
    },
  },
  {
    id: "ai",
    sku: "AIP-10",
    image: "images/marketplace/ai.jpg",
    gallery: ["images/marketplace/ai.jpg"],
    family: "ai",
    price: 220,
    tag: "spotlight",
    kind: "digital",
    sold: false,
    en: {
      title: "AI-Assisted Digital Product",
      format: "Digital packet",
      style: "Workshop",
      blurb:
        "Workshop pack for AI-Assisted Digital Product Development, with handouts and the recommended product-practice readings.",
      details: ["Spotlight workshop", "Digital pack", "Includes the build checklist"],
      pickup: "Digital delivery by campus email after confirmation.",
    },
    zh: {
      title: "AI 輔助數位產品開發",
      format: "數位教材包",
      style: "工作坊",
      blurb: "AI 輔助數位產品開發工作坊講義與產品實務推薦讀物。",
      details: ["焦點工作坊", "數位教材包", "含實作檢核表"],
      pickup: "確認後以校園信箱數位交付。",
    },
  },
  {
    id: "ibm-used",
    sku: "IBM-11",
    image: "images/marketplace/ibm-used.jpg",
    gallery: ["images/marketplace/ibm-used.jpg", "images/marketplace/ibm.jpg"],
    family: "ibm",
    price: 280,
    tag: "core",
    kind: "book",
    sold: false,
    en: {
      title: "International Business Management",
      format: "Used book · campus pickup",
      style: "Used copy",
      blurb:
        "Previous-cohort used copy of International Business Management. More wear than the other IBM listing; still complete, with no missing cases.",
      details: ["Core required course", "Print textbook", "Heavier cover wear, complete inside"],
      pickup: "Campus pickup, usually at the library entrance, after you message the seller.",
    },
    zh: {
      title: "國際企業管理",
      format: "二手書 · 校園面交",
      style: "學長姐用書",
      blurb: "國際企業管理學長姐流轉用書，比另一份 IBM 書籍更有使用痕跡，內容完整、個案無缺頁。",
      details: ["核心必修", "紙本教科書", "封面較舊、內文完整"],
      pickup: "訊息確認後多於圖書館入口面交。",
    },
  },
  {
    id: "thesis",
    sku: "THS-12",
    image: "images/marketplace/thesis.jpg",
    gallery: ["images/marketplace/thesis.jpg"],
    family: "thesis",
    price: 90,
    tag: "elective",
    kind: "digital",
    sold: false,
    en: {
      title: "THESIS notes",
      format: "Digital packet",
      style: "Checklist",
      blurb:
        "THESIS enrollment notes and defense checklist compiled from program notices. Useful before you add the course or book a defense slot.",
      details: ["Elective / THESIS", "Digital checklist", "Drawn from program notices"],
      pickup: "Digital delivery. The file is sent after you write the seller.",
    },
    zh: {
      title: "THESIS 加選說明",
      format: "數位教材包",
      style: "檢核表",
      blurb: "依學程公告整理的 THESIS 加選說明與口試檢核表，適合加選或預約口試前使用。",
      details: ["選修／THESIS", "數位檢核表", "依學程公告整理"],
      pickup: "數位交付；寫信後寄送檔案。",
    },
  },
];

const TAG_LABEL = {
  en: { core: "Core", spotlight: "Spotlight", elective: "Elective" },
  zh: { core: "核心課程", spotlight: "焦點課程", elective: "選修" },
};

export const listingHref = (id) => `listing.html?id=${encodeURIComponent(id)}`;

const currentLang = () => (document.body?.dataset.lang === "zh" ? "zh" : "en");

const esc = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const money = (n) =>
  currentLang() === "zh" ? `NT$${n.toLocaleString("zh-TW")}` : `NT$${n.toLocaleString("en-US")}`;

let extraCache = [];

const packetById = (id) => extraCache.find((item) => item.id === id) || PACKETS.find((item) => item.id === id);

const allPackets = () => {
  const seen = new Set();
  return [...extraCache, ...PACKETS].filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
};

const cardHTML = (item) => {
  const copy = item[currentLang()];
  const lang = currentLang();
  const soldLabel = lang === "zh" ? "已售出" : "Sold out";
  const tag = TAG_LABEL[lang][item.tag] || "";
  const price = item.sold ? `<span class="shop-sold">${soldLabel}</span>` : `<span class="shop-price">${money(item.price)}</span>`;
  return `<a class="shop-card${item.sold ? " is-sold" : ""}" href="${listingHref(item.id)}">
    <div class="shop-cover">
      <img src="${esc(item.image)}" alt="" width="900" height="1120" loading="lazy">
      ${item.sold ? `<span class="shop-badge">${soldLabel}</span>` : ""}
    </div>
    <p class="shop-card-kicker">${esc(tag)}</p>
    <h2>${esc(copy.title)}</h2>
    <p class="shop-price-row">${price}</p>
  </a>`;
};

export const initMarketplace = () => {
  const root = document.querySelector("[data-shop]");
  if (!root || root.dataset.bound === "1") return;
  root.dataset.bound = "1";

  const filter = root.querySelector("[data-shop-filter]");
  const sort = root.querySelector("[data-shop-sort]");
  const count = root.querySelector("[data-shop-count]");
  const grid = root.querySelector("[data-shop-grid]");
  const empty = root.querySelector("[data-shop-empty]");
  let extra = [];

  const catalog = () => allPackets();

  const render = () => {
    const tag = filter?.value || "all";
    const order = sort?.value || "featured";
    let list = catalog().filter((item) => tag === "all" || item.tag === tag);

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
      count.textContent = currentLang() === "zh" ? `${n} 件商品` : `${n} items`;
    }

    grid.innerHTML = list.map(cardHTML).join("");
    if (empty) empty.hidden = list.length > 0;
  };

  filter?.addEventListener("change", render);
  sort?.addEventListener("change", render);
  window.addEventListener("immba:lang", render);
  window.addEventListener("immba:listings", () => {
    void listCloudListings().then((rows) => {
      extra = extraCache = rows;
      render();
    });
  });
  void listCloudListings().then((rows) => {
    extra = extraCache = rows;
    render();
  });
  render();
};

export const initListing = () => {
  const root = document.querySelector("[data-pdp]");
  if (!root || root.dataset.bound === "1") return;
  root.dataset.bound = "1";

  const params = new URLSearchParams(window.location.search);
  const crumb = root.querySelector("[data-pdp-crumb]");
  const stage = root.querySelector("[data-pdp-stage]");
  const thumbs = root.querySelector("[data-pdp-thumbs]");
  const info = root.querySelector("[data-pdp-info]");
  const story = root.querySelector("[data-pdp-story]");
  const dock = root.querySelector("[data-pdp-dock]");
  const relatedWrap = root.querySelector("[data-pdp-related]");
  const relatedGrid = root.querySelector("[data-pdp-related-grid]");

  let item = packetById(params.get("id") || "");
  let qty = 1;
  let activeSrc = item?.gallery?.[0] || item?.image || "";

  const setTitle = () => {
    const copy = item[currentLang()];
    document.title = `${copy.title}: imMBA`;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", copy.blurb);
  };

  const render = () => {
    const lang = currentLang();
    const copy = item[lang];
    const tagLabel = TAG_LABEL[lang][item.tag] || "";
    const soldLabel = lang === "zh" ? "已售出" : "Sold out";
    const contact = lang === "zh" ? "寫信給賣方" : "Message the seller";
    const bagLabel = lang === "zh" ? "加入袋子" : "Add to bag";
    const qtyLabel = lang === "zh" ? "數量" : "Quantity";
    const skuLabel = lang === "zh" ? "編號" : "SKU";
    const shots = (item.gallery?.length ? item.gallery : [item.image]).filter(Boolean);
    if (!shots.includes(activeSrc)) activeSrc = shots[0] || "";

    setTitle();

    if (crumb) {
      crumb.innerHTML = `<a href="marketplace.html">${lang === "zh" ? "教材市集" : "Marketplace"}</a>
        <span aria-hidden="true">/</span>
        <a href="marketplace.html">${tagLabel}</a>
        <span aria-hidden="true">/</span>
        <span>${esc(copy.title)}</span>`;
    }

    if (stage) {
      stage.innerHTML = activeSrc
        ? `<img src="${esc(activeSrc)}" alt="${esc(copy.title)}" width="1200" height="1500">`
        : "";
    }
    if (thumbs) {
      thumbs.hidden = shots.length < 2;
      thumbs.innerHTML = shots
        .map(
          (src) =>
            `<button type="button" class="pdp-thumb${src === activeSrc ? " is-active" : ""}" data-pdp-shot="${esc(src)}">
              <img src="${esc(src)}" alt="" width="120" height="150">
            </button>`
        )
        .join("");
    }

    const variants = allPackets().filter((other) => other.family === item.family);
    const variantRow =
      variants.length > 1
        ? `<div class="pdp-field">
            <p class="pdp-label">${lang === "zh" ? "版本" : "Style"}</p>
            <div class="pdp-styles">
              ${variants
                .map(
                  (other) =>
                    `<a class="pdp-style${other.id === item.id ? " is-active" : ""}" href="${listingHref(other.id)}">${other[lang].style}</a>`
                )
                .join("")}
            </div>
          </div>`
        : "";

    const mail = `mailto:imMBA@mail.fju.edu.tw?subject=${encodeURIComponent(`Marketplace: ${copy.title}`)}`;
    const bagHref = `cart.html?listing=${encodeURIComponent(item.id)}&qty=${qty}`;
    const cta = item.sold
      ? `<button type="button" class="pdp-bag" disabled>${soldLabel}</button>`
      : `<a class="pdp-bag" href="${bagHref}">${bagLabel}</a>
         <a class="pdp-mail" href="${mail}">${contact}</a>`;

    if (info) {
      info.innerHTML = `
        <p class="pdp-kicker">${tagLabel}</p>
        <h1 class="pdp-title">${esc(copy.title)}</h1>
        <p class="pdp-price">${item.sold ? soldLabel : money(item.price)}</p>
        <p class="pdp-lead">${esc(copy.blurb)}</p>
        <p class="pdp-sku">${skuLabel} ${esc(item.sku)}</p>
        ${variantRow}
        <div class="pdp-field">
          <p class="pdp-label">${qtyLabel}</p>
          <div class="pdp-qty">
            <button type="button" data-qty="-1" ${qty <= 1 || item.sold ? "disabled" : ""} aria-label="Decrease quantity">−</button>
            <span>${qty}</span>
            <button type="button" data-qty="1" ${item.sold || item.kind === "digital" || qty >= 3 ? "disabled" : ""} aria-label="Increase quantity">+</button>
          </div>
        </div>
        <div class="pdp-actions">${cta}</div>
        <ul class="pdp-notes">
          <li>${esc(copy.format)}</li>
          <li>${lang === "zh" ? "賣方為 imMBA 同學" : "Sold by an imMBA student"}</li>
          <li>${lang === "zh" ? "結帳在 Stripe 上線前不會扣款" : "Payment stays off until Stripe is live"}</li>
        </ul>`;
    }

    if (story) {
      story.innerHTML = `
        <details open>
          <summary>${lang === "zh" ? "商品說明" : "Product details"}</summary>
          <p>${esc(copy.blurb)}</p>
          <ul class="pdp-bullets">${(copy.details || []).map((line) => `<li>${esc(line)}</li>`).join("")}</ul>
        </details>
        <details>
          <summary>${lang === "zh" ? "取件" : "Order details"}</summary>
          <p>${esc(copy.pickup)}</p>
        </details>
        <details>
          <summary>${lang === "zh" ? "imMBA 的不同" : "The imMBA difference"}</summary>
          <p>${lang === "zh" ? "教材跟著英語授課的課綱走，由同學交給下一屆，面交地點多在管理學院。" : "Materials follow the English-taught syllabus and move from one cohort to the next, usually by hand at the College of Management."}</p>
        </details>`;
    }

    if (dock) {
      dock.hidden = false;
      dock.innerHTML = item.sold
        ? `<strong>${soldLabel}</strong><button type="button" class="pdp-bag" disabled>${soldLabel}</button>`
        : `<strong>${money(item.price)}</strong><a class="pdp-bag" href="${bagHref}">${bagLabel}</a>`;
    }

    const also = allPackets()
      .filter((other) => other.id !== item.id)
      .sort((a, b) => Number(b.tag === item.tag) - Number(a.tag === item.tag))
      .slice(0, 4);
    if (relatedGrid && relatedWrap) {
      relatedWrap.hidden = also.length === 0;
      relatedGrid.innerHTML = also.map(cardHTML).join("");
    }
  };

  root.addEventListener("click", (event) => {
    const shot = event.target.closest("[data-pdp-shot]");
    if (shot) {
      activeSrc = shot.getAttribute("data-pdp-shot");
      render();
      return;
    }
    const delta = event.target.closest("[data-qty]");
    if (delta && item && !item.sold) {
      qty = Math.min(3, Math.max(1, qty + Number(delta.getAttribute("data-qty"))));
      render();
    }
  });

  window.addEventListener("immba:lang", render);
  const missing = () => {
    if (dock) dock.hidden = true;
    if (info) {
      info.innerHTML = `<h1 class="pdp-title">${currentLang() === "zh" ? "找不到此教材" : "Listing not found"}</h1>
        <p><a href="marketplace.html">${currentLang() === "zh" ? "返回教材市集" : "Back to Marketplace"}</a></p>`;
    }
  };
  const start = (record) => {
    item = record;
    activeSrc = item.gallery[0] || item.image;
    render();
  };
  if (item) start(item);
  else {
    void listCloudListings().then((rows) => {
      extraCache = rows;
      const found = packetById(params.get("id") || "");
      if (found) start(found);
      else missing();
    });
  }
};
