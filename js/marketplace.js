import { currentProfile, isSellerAuthed } from "./auth.js?v=lab4";
import { getAuthSession, rpc } from "./supabase.js?v=secure1";
import { listCloudListings } from "./listings-store.js?v=bump1";
import { BUYER_ITEM_FEE, DELIVERY_FEE, availableQty, defaultOnHand, marketMode, releaseExpired, setMarketMode, syncC2c } from "./trade.js?v=lab4";
import { rotatedPackets } from "./shelf-rotation.js?v=pass2";
import { odo } from "./odometer.js?v=odo3";
import { addBagLine, readBag } from "./bag-store.js?v=lab4";

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
    sold: false,
    en: {
      title: "Organization Design",
      format: "Digital packet",
      style: "Notes",
      blurb: "Lecture notes for Organization Design and Management, from the English-taught section.",
      details: ["Core required course", "Digital lecture notes", "Campus shelf"],
      pickup: "Digital delivery by campus email after the order is accepted.",
    },
    zh: {
      title: "組織設計與管理",
      format: "數位教材包",
      style: "筆記",
      blurb: "組織設計與管理課堂筆記，來自英語授課班級。",
      details: ["核心必修", "數位課堂筆記", "書架教材"],
      pickup: "訂單接受後以校園信箱寄出。",
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

const PACKET_FACTS = {
  ibm: ["IBM", "Good", "良好"],
  ethics: ["ETH", "New", "全新"],
  strategy: ["STR", "New", "全新"],
  supply: ["OSC", "Good", "良好"],
  marketing: ["MKT", "New", "全新"],
  org: ["ORG", "New", "全新"],
  finance: ["FIN", "Good", "良好"],
  hr: ["HRM", "New", "全新"],
  analytics: ["BAN", "New", "全新"],
  ai: ["DIG", "New", "全新"],
  "ibm-used": ["IBM", "Good", "良好"],
  thesis: ["RES", "New", "全新"],
};

const COND_ZH = {
  New: "全新",
  "Like New": "近全新",
  Good: "良好",
  Fair: "普通",
  Worn: "有使用痕跡",
  Used: "二手",
  Digital: "數位",
  Item: "物品",
};

const withFacts = (item) => {
  const facts = PACKET_FACTS[item.id];
  if (!facts) return item;
  const [course, condition, conditionZh] = facts;
  return {
    ...item,
    course: item.course || course,
    condition: item.condition || condition,
    conditionZh: item.conditionZh || conditionZh,
    firm: item.firm !== false,
    sellerName: item.sellerName || "imMBA shelf",
  };
};

export const listingHref = (id) => `listing.html?id=${encodeURIComponent(id)}`;

const viewerSignedIn = () => Boolean(getAuthSession()?.email || getAuthSession()?.access_token);

const openListingGate = () => {
  let gate = document.querySelector("[data-listing-gate]");
  if (!gate) {
    gate = document.createElement("div");
    gate.className = "listing-gate";
    gate.setAttribute("data-listing-gate", "");
    gate.setAttribute("role", "dialog");
    gate.setAttribute("aria-modal", "true");
    document.body.append(gate);
    gate.addEventListener("click", (event) => {
      if (event.target === gate || event.target.closest("[data-gate-close]")) closeListingGate();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !gate.hidden) closeListingGate();
    });
  }
  const zh = document.body?.dataset.lang === "zh";
  gate.innerHTML = `
    <div class="listing-gate-card">
      <button type="button" class="listing-gate-close" data-gate-close aria-label="${zh ? "關閉" : "Close"}">×</button>
      <img src="images/logo.png" alt="" width="64" height="64">
      <h2>${zh ? "登入後才能看這本書" : "Log in to view this listing"}</h2>
      <p>${zh ? "登入後才能看教材、價格和取件方式。" : "Sign in to see the book, the price, and how to pick it up."}</p>
      <a class="pdp-bag" href="market-account.html">${zh ? "登入" : "Log in"}</a>
      <a class="listing-gate-alt" href="market-account.html?mode=register">${zh ? "註冊" : "Sign up"}</a>
    </div>`;
  gate.hidden = false;
  document.body.classList.add("is-gated");
  gate.querySelector(".pdp-bag")?.focus();
};

const closeListingGate = () => {
  const gate = document.querySelector("[data-listing-gate]");
  if (gate) gate.hidden = true;
  document.body.classList.remove("is-gated");
  if (document.querySelector("[data-pdp]")) location.href = "marketplace.html";
};

document.addEventListener("click", (event) => {
  const link = event.target.closest("a[href*='listing.html']");
  if (!link || viewerSignedIn()) return;
  event.preventDefault();
  openListingGate();
});

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

const packetById = (id) =>
  sellerPackets().find((item) => item.id === id) ||
  rotatedPackets().find((item) => item.id === id) ||
  extraCache.find((item) => item.id === id) ||
  PACKETS.map(withFacts).find((item) => item.id === id);

export const shelfItem = (id) => packetById(id);

export const shelfSearch = (query, limit = 8) => {
  const q = String(query || "").trim().toLowerCase();
  const lang = currentLang();
  return forBuyer([...sellerPackets(), ...rotatedPackets(), ...allPackets()])
    .filter((item) => {
      if (!q) return true;
      const copy = item[lang] || item.en || {};
      const hay = [copy.title, item.en?.title, item.zh?.title, item.course, item.professor, item.isbn, item.sku]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    })
    .slice(0, limit)
    .map((item) => ({
      id: item.id,
      title: (item[lang] || item.en)?.title || "Textbook",
      course: item.course || "",
      professor: item.professor || "",
      isbn: item.isbn || "",
      price: item.price,
    }));
};

const allPackets = () => {
  const seen = new Set();
  return [...extraCache, ...PACKETS.map(withFacts)].filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
};

const sellerPackets = () => {
  let rows = [];
  try {
    rows = JSON.parse(localStorage.getItem("immba-seller-books") || "[]");
  } catch {
    rows = [];
  }
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((book) => book.status === "active")
    .map((book) => {
      const hand = Number(book.quantity || 1);
      const left = availableQty(book.id, hand);
      const note = String(book.description || "").trim();
      const blurb = note || [book.author, book.edition].filter((part) => String(part || "").trim()).join(" · ");
      const copy = {
        title: book.title,
        format:
          book.kind === "item"
            ? book.delivery
              ? "Item · delivery"
              : "Item · campus pickup"
            : book.delivery
              ? `${book.condition || "Used"} · delivery`
              : `${book.condition || "Used"} · campus pickup`,
        style: book.condition || "Textbook",
        blurb,
        details: [book.course, book.professor, book.condition].filter(Boolean),
        pickup: book.delivery
          ? "Campus pickup, or delivery for NT$60 if you leave it checked in the bag."
          : "Campus hand-off after the seller confirms payment.",
      };
      return {
        id: book.id,
        sku: book.isbn || String(book.id).slice(0, 8),
        image: book.photos?.[0] || "",
        gallery: book.photos?.length ? book.photos : [book.photos?.[0]].filter(Boolean),
        family: book.id,
        price: Number(book.price) || 0,
        tag: book.category || "elective",
        kind: book.kind === "item" ? "item" : "book",
        sold: left <= 0,
        stock: left,
        onHand: hand,
        sellerId: book.sellerUserId || book.sellerEmail || "local",
        sellerEmail: String(book.sellerEmail || "").includes("@") ? book.sellerEmail : "",
        sellerUserId: book.sellerUserId || "",
        sellerName: book.sellerName || "Classmate",
        sellerPhoto: book.sellerPhoto || "",
        course: book.course || "",
        professor: book.professor || "",
        condition: book.condition || (book.kind === "item" ? "Item" : "Used"),
        firm: book.firm !== false,
        delivery: Boolean(book.delivery),
        bumped: Boolean(book.bumped),
        posted: true,
        author: book.author || "",
        edition: book.edition || "",
        isbn: book.isbn || "",
        description: note,
        en: copy,
        zh: {
          ...copy,
          pickup: book.delivery ? "可校園面交。若在袋子裡保留外送，另付 NT$60。" : "賣方確認付款後，於校園面交。",
        },
      };
    });
};

const ownKeys = () => {
  const profile = currentProfile();
  return new Set(
    [profile?.email, profile?.user?.email, profile?.user?.id]
      .map((value) => String(value || "").trim().toLowerCase())
      .filter(Boolean),
  );
};

const ownBookIds = () => {
  let rows = [];
  try {
    rows = JSON.parse(localStorage.getItem("immba-seller-books") || "[]");
  } catch {
    rows = [];
  }
  if (!Array.isArray(rows)) return new Set();
  const keys = ownKeys();
  return new Set(
    rows
      .filter((book) => {
        const owner = String(book?.sellerEmail || book?.sellerId || "").trim().toLowerCase();
        if (!owner || owner === "local") return true;
        return keys.has(owner);
      })
      .map((book) => book.id)
      .filter(Boolean),
  );
};

const isOwnListing = (item) => {
  if (!item) return false;
  const owner = String(item.sellerId || item.sellerEmail || "").trim().toLowerCase();
  if (owner && ownKeys().has(owner)) return true;
  return ownBookIds().has(item.id);
};

const forBuyer = (rows) => {
  const mine = ownBookIds();
  const keys = ownKeys();
  const seen = new Set();
  return rows.filter((item) => {
    if (!item || seen.has(item.id)) return false;
    seen.add(item.id);
    const owner = String(item.sellerId || item.sellerEmail || "").trim().toLowerCase();
    if (owner && keys.has(owner)) return false;
    if (mine.has(item.id)) return false;
    return true;
  });
};

const stockOf = (item) => {
  if (item.stock != null && item.onHand != null) return item.stock;
  return availableQty(item.id, item.sold ? 0 : defaultOnHand(item.id));
};

const bumpMark = (lang) =>
  `<span class="shop-bump" title="${lang === "zh" ? "賣方置頂，優先顯示" : "Bumped by the seller for priority visibility"}" aria-label="${lang === "zh" ? "已置頂" : "Bumped"}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2.2 4.6 13.4h6.1l-.9 8.4 9.6-12.6h-6.3z" fill="currentColor"/></svg></span>`;

const CONDITION_ALIAS = { Used: "Good", Digital: "New" };

const canonicalCondition = (value) => CONDITION_ALIAS[value] || value || "";

const conditionText = (item, lang) => {
  const condition = canonicalCondition(item.condition);
  if (lang === "zh") return COND_ZH[condition] || item.conditionZh || condition;
  return condition;
};

const courseText = (item, lang) => {
  const course = String(item.course || "").trim();
  const title = String(item[lang]?.title || "").trim();
  if (!course || course.toLowerCase() === title.toLowerCase()) return "";
  return course;
};

const cardMeta = (item, lang) => [conditionText(item, lang), courseText(item, lang)].filter(Boolean).join(" · ");

const sellerLabel = (item, lang) => {
  const name = String(item.sellerName || "").trim();
  const generic = !name || ["classmate", "a classmate", "local"].includes(name.toLowerCase());
  if (generic) return lang === "zh" ? "一位同學" : "a classmate";
  return name;
};

const localBagRows = () => {
  try {
    const rows = JSON.parse(localStorage.getItem("immba-local-bag") || "[]");
    if (!Array.isArray(rows)) return [];
    const now = Date.now();
    return rows.filter((row) => !row.holdUntil || Number(row.holdUntil) > now);
  } catch {
    return [];
  }
};

let bagServerSync = null;

const paintBagCount = (count) => {
  const n = Math.max(0, Number(count) || 0);
  const lang = currentLang();
  document.querySelectorAll(".shop-icon-bag").forEach((bag) => {
    let badge = bag.querySelector("[data-bag-count]");
    if (!badge) {
      badge = document.createElement("span");
      badge.className = "bag-badge";
      badge.setAttribute("data-bag-count", "");
      bag.append(badge);
    }
    badge.hidden = n <= 0;
    badge.innerHTML = odo(`bag-${bag.getAttribute("href") || "bag"}`, n > 9 ? "9+" : String(n));
    bag.setAttribute("aria-label", lang === "zh" ? (n ? `袋子，${n} 件` : "袋子") : n ? `Bag, ${n} ${n === 1 ? "item" : "items"}` : "Bag");
  });
};

export const paintBagBadge = async () => {
  const rows = localBagRows();
  const local = rows.reduce((sum, row) => sum + Math.max(0, Number(row.quantity) || 0), 0);
  const seen = new Set(rows.map((row) => row.listing_id));
  paintBagCount(local);
  if (!getAuthSession()?.access_token || bagServerSync) return;
  bagServerSync = rpc("cart_get")
    .then((cart) => {
      const extra = (cart?.items || []).reduce((sum, item) => {
        if (seen.has(item.listing_id)) return sum;
        return sum + Math.max(0, Number(item.quantity) || 0);
      }, 0);
      paintBagCount(local + extra);
    })
    .catch(() => {
      bagServerSync = null;
    });
};

const prettySeller = (item, lang) => {
  const name = sellerLabel(item, lang);
  if (name === "a classmate") return lang === "zh" ? "一位同學" : "A classmate";
  return name;
};

const cardHTML = (item) => {
  const copy = item[currentLang()];
  const lang = currentLang();
  const left = stockOf(item);
  const sold = left <= 0;
  const soldLabel = lang === "zh" ? "已售出" : "Sold out";
  const tag = TAG_LABEL[lang][item.tag] || "";
  const meta = cardMeta(item, lang);
  const who = prettySeller(item, lang);
  const byline = item.posted ? (lang === "zh" ? `${who} 刊登` : `Posted by ${who}`) : who;
  const price = sold
    ? `<span class="shop-sold">${soldLabel}</span>`
    : `<span class="shop-price">${odo(`card-${item.id}`, money(item.price))}</span>`;
  const photo = item.image
    ? `<img src="${esc(item.image)}" alt="" width="900" height="1120" loading="lazy">`
    : `<span class="shop-cover-empty"></span>`;
  const cond = canonicalCondition(item.condition);
  const condLabel = conditionText(item, lang);
  const stockLine = sold
    ? soldLabel
    : left <= 2
      ? lang === "zh"
        ? `只剩 ${left}`
        : `Only ${left} left`
      : lang === "zh"
        ? `剩 ${left}`
        : `${left} left`;
  const handoff = lang === "zh" ? "面交" : "Campus";
  const course = item.course ? `<span class="shop-code">${esc(item.course)}</span>` : "";
  const face = item.sellerPhoto
    ? `<img class="shop-face" src="${esc(item.sellerPhoto)}" alt="" width="22" height="22">`
    : `<span aria-hidden="true">${esc(who.slice(0, 1).toUpperCase())}</span>`;
  return `<article class="shop-card${sold ? " is-sold" : ""}${item.posted ? " is-posted" : ""}">
    <a class="shop-card-hit" href="${listingHref(item.id)}"><span class="sr-only">${esc(copy.title)}</span></a>
    <div class="shop-cover">${item.bumped ? bumpMark(lang) : ""}${course}${photo}</div>
    <div class="shop-card-body">
      <div class="shop-card-titleline">
        <h2>${esc(copy.title)}</h2>
        <p class="shop-price-row">${price}</p>
      </div>
      <p class="shop-meta"><span class="shop-cond" data-cond="${esc(cond)}">${esc(condLabel)}</span><span class="${!sold && left <= 2 ? "is-low" : ""}">${esc(stockLine)}</span></p>
      <p class="shop-seller">${face}<span>${esc(byline)}</span><span class="shop-handoff">${handoff}</span></p>
    </div>
    <p class="sr-only">${esc(tag)} ${esc(meta)}</p>
  </article>`;
};

export const initMarketplace = () => {
  const root = document.querySelector("[data-shop]");
  if (!root || root.dataset.bound === "1") return;
  if (marketMode() !== "buyer") setMarketMode("buyer");
  root.dataset.bound = "1";
  void syncC2c();

  const sort = root.querySelector("[data-shop-sort]");
  const search = root.querySelector("[data-shop-search]");
  const count = root.querySelector("[data-shop-count]");
  const grid = root.querySelector("[data-shop-grid]");
  const empty = root.querySelector("[data-shop-empty]");
  const modeSlot = root.querySelector("[data-market-mode]");
  const pager = root.querySelector("[data-shop-pager]");
  const cats = root.querySelector("[data-shop-cats]");
  const conds = root.querySelector("[data-shop-conds]");
  const filters = root.querySelector(".shop-filters");
  const clearBtn = root.querySelector("[data-shop-clear]");
  const filtersTitle = root.querySelector("[data-shop-filters-title]");
  const priceLabel = root.querySelector("[data-shop-price-label]");
  const minInput = root.querySelector("[data-shop-min]");
  const maxInput = root.querySelector("[data-shop-max]");
  const rangeMin = root.querySelector("[data-shop-range-min]");
  const rangeMax = root.querySelector("[data-shop-range-max]");
  const priceLow = root.querySelector("[data-price-low]");
  const priceHigh = root.querySelector("[data-price-high]");
  const priceFill = root.querySelector("[data-price-fill]");
  const priceGhost = root.querySelector("[data-price-ghost]");
  const priceTrack = root.querySelector("[data-price-track]");
  const priceClear = root.querySelector("[data-price-clear]");
  const priceClearLabel = root.querySelector("[data-price-clear-label]");
  const PRICE_MIN = 0;
  const PRICE_MAX = 2000;
  const PRICE_STEP = 10;
  const activeRow = root.querySelector("[data-shop-active]");
  const trust = root.querySelector("[data-shop-trust]");
  const filterOpen = root.querySelector("[data-shop-filters-open]");
  const heading = root.querySelector("[data-shop-heading]");
  const sub = root.querySelector("[data-shop-sub]");
  let extra = [];
  let page = 1;
  let category = "all";
  let condition = "all";
  const pageSize = 9;

  const catalog = () => forBuyer([...sellerPackets(), ...rotatedPackets(), ...allPackets()]);

  const paintMode = () => {
    if (!modeSlot) return;
    const lang = currentLang();
    const account = root.querySelector("[data-shop-account]");
    const signedIn = isSellerAuthed();
    const accountLabel = signedIn ? (lang === "zh" ? "帳戶" : "Account") : lang === "zh" ? "登入" : "Log in";
    if (account) account.setAttribute("aria-label", accountLabel);
    const accountText = root.querySelector("[data-shop-account-label]");
    if (accountText) accountText.textContent = accountLabel;
    void paintBagBadge();
    if (!signedIn) {
      modeSlot.innerHTML = "";
      return;
    }
    const seller = marketMode() === "seller";
    modeSlot.innerHTML = `<div class="mode-switch" role="group" aria-label="${lang === "zh" ? "使用模式" : "Account mode"}">
      <button type="button" data-set-mode="buyer" aria-pressed="${seller ? "false" : "true"}">${lang === "zh" ? "買家" : "Buyer"}</button>
      <button type="button" data-set-mode="seller" aria-pressed="${seller ? "true" : "false"}">${lang === "zh" ? "賣方" : "Seller"}</button>
    </div>`;
  };

  const priceOk = (price) => {
    const min = minInput?.value === "" ? null : Number(minInput.value);
    const max = maxInput?.value === "" ? null : Number(maxInput.value);
    if (min != null && !Number.isNaN(min) && price < min) return false;
    if (max != null && !Number.isNaN(max) && price > max) return false;
    return true;
  };

  const paintFilters = (listFor) => {
    const lang = currentLang();
    const t = (en, zh) => (lang === "zh" ? zh : en);
    const chip = (group, value, label, current, total) => {
      const empty = value !== "all" && total === 0 && current !== value;
      return `<button type="button" class="${empty ? "is-empty" : ""}" data-shop-pick="${group}" data-value="${value}" aria-pressed="${current === value ? "true" : "false"}" ${empty ? "disabled" : ""}><span>${esc(label)}</span><span class="shop-facet-count">${total}</span></button>`;
    };
    const catsRows = [
      ["all", "All", "全部"],
      ["core", "Core", "核心課程"],
      ["spotlight", "Spotlight", "焦點課程"],
      ["elective", "Elective", "選修"],
    ];
    const condRows = [
      ["all", "All", "全部"],
      ["New", "New", "全新"],
      ["Like New", "Like New", "近全新"],
      ["Good", "Good", "良好"],
      ["Fair", "Fair", "普通"],
      ["Worn", "Worn", "有使用痕跡"],
    ];
    if (cats) {
      cats.innerHTML = `<fieldset class="shop-facets"><legend>${t("Category", "分類")}</legend><div class="shop-chips">${catsRows
        .map(([value, en, zh]) => chip("cat", value, t(en, zh), category, listFor("cat", value).length))
        .join("")}</div></fieldset>`;
    }
    if (conds) {
      conds.innerHTML = `<fieldset class="shop-facets"><legend>${t("Condition", "書況")}</legend><div class="shop-facet-list">${condRows
        .map(([value, en, zh]) => chip("cond", value, t(en, zh), condition, listFor("cond", value).length))
        .join("")}</div></fieldset>`;
    }
    if (filtersTitle) filtersTitle.textContent = t("Filters", "篩選");
    if (priceLabel) priceLabel.textContent = t("Price range", "價格範圍");
    if (clearBtn) clearBtn.textContent = t("Clear", "清除");
    if (priceClearLabel) priceClearLabel.textContent = t("Clear", "清除");
  };

  const moneyLabel = (value) => Number(value).toLocaleString("en-US");

  const paintPriceSlider = () => {
    if (!rangeMin || !rangeMax) return;
    let low = Number(rangeMin.value);
    let high = Number(rangeMax.value);
    if (low > high) {
      if (document.activeElement === rangeMin) high = low;
      else low = high;
      rangeMin.value = String(low);
      rangeMax.value = String(high);
    }
    if (minInput) minInput.value = low > PRICE_MIN ? String(low) : "";
    if (maxInput) maxInput.value = high < PRICE_MAX ? String(high) : "";
    if (priceLow) priceLow.textContent = moneyLabel(low);
    if (priceHigh) priceHigh.textContent = moneyLabel(high);
    const span = PRICE_MAX - PRICE_MIN;
    const lowPct = ((low - PRICE_MIN) / span) * 100;
    const highPct = ((high - PRICE_MIN) / span) * 100;
    if (priceFill) {
      priceFill.style.left = `${lowPct}%`;
      priceFill.style.width = `${Math.max(0, highPct - lowPct)}%`;
    }
    if (priceClear) priceClear.hidden = low <= PRICE_MIN && high >= PRICE_MAX;
  };

  const matchesQuery = (item, query, lang) => {
    if (!query) return true;
    const copy = item[lang] || item.en || {};
    const hay = [copy.title, item.en?.title, item.zh?.title, item.sku, item.course, item.professor, item.isbn, item.sellerName, copy.blurb]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(query);
  };

  const render = ({ resetPage = false } = {}) => {
    if (resetPage) page = 1;
    releaseExpired();
    paintPriceSlider();
    paintMode();
    const lang = currentLang();
    if (search) {
      search.placeholder = lang === "zh" ? "搜尋" : "Search";
      search.setAttribute("aria-label", lang === "zh" ? "搜尋書名、課程或老師" : "Search title, course, or professor");
    }
    if (heading) heading.textContent = lang === "zh" ? "這一屆的教材" : "From this cohort";
    const order = sort?.value || "featured";
    const query = (search?.value || "").trim().toLowerCase();
    const priced = catalog().filter((item) => stockOf(item) > 0 && priceOk(item.price) && matchesQuery(item, query, lang));
    const listFor = (group, value) =>
      priced.filter((item) => {
        const catOk = group === "cat" ? value === "all" || item.tag === value : category === "all" || item.tag === category;
        const condOk = group === "cond" ? value === "all" || canonicalCondition(item.condition) === value : condition === "all" || canonicalCondition(item.condition) === condition;
        return catOk && condOk;
      });
    paintFilters(listFor);
    const active = [];
    if (category !== "all") {
      active.push(category === "core" ? (lang === "zh" ? "核心課程" : "Core") : category === "spotlight" ? (lang === "zh" ? "焦點課程" : "Spotlight") : lang === "zh" ? "選修" : "Elective");
    }
    if (condition !== "all") {
      const condLabel = {
        New: ["New", "全新"],
        "Like New": ["Like New", "近全新"],
        Good: ["Good", "良好"],
        Fair: ["Fair", "普通"],
        Worn: ["Worn", "有使用痕跡"],
      }[condition];
      active.push(condLabel ? (lang === "zh" ? condLabel[1] : condLabel[0]) : condition);
    }
    if (minInput?.value) active.push(lang === "zh" ? `NT$${minInput.value} 起` : `From NT$${minInput.value}`);
    if (maxInput?.value) active.push(lang === "zh" ? `NT$${maxInput.value} 內` : `Up to NT$${maxInput.value}`);
    if (sub) sub.textContent = active.length ? active.join(" · ") : lang === "zh" ? "款項直接付給同學。" : "You pay the classmate directly.";
    if (clearBtn) clearBtn.hidden = active.length === 0 && !query;
    if (trust) {
      const bits = lang === "zh" ? ["imMBA 同學", "校園面交", "直接付款"] : ["Verified imMBA peers", "Campus hand-off", "Direct payment"];
      trust.innerHTML = bits.map((bit) => `<li>${bit}</li>`).join("");
    }
    if (filterOpen) filterOpen.textContent = lang === "zh" ? `篩選${active.length ? ` ${active.length}` : ""}` : `Filters${active.length ? ` ${active.length}` : ""}`;
    if (activeRow) {
      const chips = [];
      if (category !== "all") chips.push(`<button type="button" data-shop-clear-one="cat">${active[0]} ×</button>`);
      if (condition !== "all") chips.push(`<button type="button" data-shop-clear-one="cond">${esc(condition)} ×</button>`);
      if (minInput?.value) chips.push(`<button type="button" data-shop-clear-one="min">NT$${esc(minInput.value)}+ ×</button>`);
      if (maxInput?.value) chips.push(`<button type="button" data-shop-clear-one="max">≤ NT$${esc(maxInput.value)} ×</button>`);
      activeRow.hidden = chips.length === 0;
      activeRow.innerHTML = chips.join("");
    }
    let list = listFor("cat", category);

    const compare =
      order === "az"
        ? (a, b) => a[lang].title.localeCompare(b[lang].title)
        : order === "za"
          ? (a, b) => b[lang].title.localeCompare(a[lang].title)
          : order === "price-asc"
            ? (a, b) => a.price - b.price
            : order === "price-desc"
              ? (a, b) => b.price - a.price
              : () => 0;
    const bumpRank = (item) => (item.bumped ? (item.posted ? 2 : 1) : 0);
    list = [...list].sort((a, b) => bumpRank(b) - bumpRank(a) || compare(a, b));

    const n = list.length;
    const pages = Math.max(1, Math.ceil(n / pageSize));
    page = Math.min(page, pages);
    if (count) {
      const noun = lang === "zh" ? "件教材" : n === 1 ? "listing" : "listings";
      if (!count.querySelector("[data-shop-count-n]")) {
        count.innerHTML = `<span data-shop-count-n></span><span data-shop-count-noun></span>`;
      }
      const nounNode = count.querySelector("[data-shop-count-noun]");
      const numberNode = count.querySelector("[data-shop-count-n]");
      if (numberNode) numberNode.textContent = String(n);
      if (nounNode) nounNode.textContent = noun;
    }

    const view = list.slice((page - 1) * pageSize, page * pageSize);
    grid.innerHTML = view.map(cardHTML).join("");
    if (empty) empty.hidden = list.length > 0;
    if (pager) {
      pager.hidden = pages < 2;
      const button = (label, value, current = false, disabled = false) =>
        `<button type="button" data-shop-page="${value}" ${current ? 'aria-current="page"' : ""} ${disabled ? "disabled" : ""}>${label}</button>`;
      pager.innerHTML = [
        button(lang === "zh" ? "上一頁" : "Previous", "prev", false, page === 1),
        ...Array.from({ length: pages }, (_, index) => button(String(index + 1), String(index + 1), page === index + 1)),
        button(lang === "zh" ? "下一頁" : "Next", "next", false, page === pages),
      ].join("");
    }
  };

  sort?.addEventListener("change", () => render({ resetPage: true }));
  search?.addEventListener("input", () => render({ resetPage: true }));
  const snapPrice = (value) => {
    const snapped = Math.round((Number(value) - PRICE_MIN) / PRICE_STEP) * PRICE_STEP + PRICE_MIN;
    return Math.max(PRICE_MIN, Math.min(PRICE_MAX, snapped));
  };
  rangeMin?.addEventListener("input", () => {
    if (Number(rangeMin.value) > Number(rangeMax.value)) rangeMin.value = rangeMax.value;
    render({ resetPage: true });
  });
  rangeMax?.addEventListener("input", () => {
    if (Number(rangeMax.value) < Number(rangeMin.value)) rangeMax.value = rangeMin.value;
    render({ resetPage: true });
  });
  rangeMin?.addEventListener("pointerdown", () => {
    rangeMin.style.zIndex = "4";
    if (rangeMax) rangeMax.style.zIndex = "2";
  });
  rangeMax?.addEventListener("pointerdown", () => {
    rangeMax.style.zIndex = "4";
    if (rangeMin) rangeMin.style.zIndex = "2";
  });
  priceClear?.addEventListener("click", () => {
    if (rangeMin) rangeMin.value = String(PRICE_MIN);
    if (rangeMax) rangeMax.value = String(PRICE_MAX);
    render({ resetPage: true });
  });
  priceTrack?.addEventListener("mousemove", (event) => {
    if (!priceGhost || !priceTrack) return;
    const rect = priceTrack.getBoundingClientRect();
    if (!rect.width) return;
    const preview = snapPrice(((event.clientX - rect.left) / rect.width) * (PRICE_MAX - PRICE_MIN) + PRICE_MIN);
    const low = Number(rangeMin?.value || PRICE_MIN);
    const high = Number(rangeMax?.value || PRICE_MAX);
    const span = PRICE_MAX - PRICE_MIN;
    const pct = (value) => ((value - PRICE_MIN) / span) * 100;
    if (preview < low) {
      priceGhost.hidden = false;
      priceGhost.style.left = `${pct(preview)}%`;
      priceGhost.style.width = `${pct(low) - pct(preview)}%`;
    } else if (preview > high) {
      priceGhost.hidden = false;
      priceGhost.style.left = `${pct(high)}%`;
      priceGhost.style.width = `${pct(preview) - pct(high)}%`;
    } else {
      priceGhost.hidden = true;
    }
  });
  priceTrack?.addEventListener("mouseleave", () => {
    if (priceGhost) priceGhost.hidden = true;
  });
  filterOpen?.addEventListener("click", () => filters?.classList.toggle("is-open"));
  root.querySelector(".shop-results")?.addEventListener("click", (event) => {
    const chip = event.target.closest("[data-shop-clear-one]");
    if (!chip) return;
    const which = chip.getAttribute("data-shop-clear-one");
    if (which === "cat") category = "all";
    if (which === "cond") condition = "all";
    if (which === "min" && rangeMin) rangeMin.value = String(PRICE_MIN);
    if (which === "max" && rangeMax) rangeMax.value = String(PRICE_MAX);
    render({ resetPage: true });
  });
  const clearShelf = () => {
    category = "all";
    condition = "all";
    if (search) search.value = "";
    if (rangeMin) rangeMin.value = String(PRICE_MIN);
    if (rangeMax) rangeMax.value = String(PRICE_MAX);
    render({ resetPage: true });
  };
  window.addEventListener("immba:clear-shelf", clearShelf);
  filters?.addEventListener("click", (event) => {
    if (event.target.closest("[data-shop-clear]")) {
      clearShelf();
      return;
    }
    const button = event.target.closest("[data-shop-pick]");
    if (!button) return;
    const group = button.getAttribute("data-shop-pick");
    const value = button.getAttribute("data-value");
    if (group === "cat") category = value;
    if (group === "cond") condition = value;
    render({ resetPage: true });
  });
  pager?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-shop-page]");
    if (!button || button.disabled) return;
    const value = button.getAttribute("data-shop-page");
    if (value === "prev") page -= 1;
    else if (value === "next") page += 1;
    else page = Number(value) || 1;
    render();
    root.querySelector(".shop-results-bar")?.scrollIntoView({ block: "nearest" });
  });
  modeSlot?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-set-mode]");
    if (!button) return;
    setMarketMode(button.getAttribute("data-set-mode"));
    if (button.getAttribute("data-set-mode") === "seller") location.href = "market-account.html";
    else render();
  });
  window.addEventListener("immba:lang", render);
  window.addEventListener("immba:trade", render);
  window.addEventListener("immba:mode", render);
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
  window.setInterval(() => render(), 30000);
};

export const initListing = () => {
  const root = document.querySelector("[data-pdp]");
  if (!root || root.dataset.bound === "1") return;
  if (!viewerSignedIn()) openListingGate();
  root.dataset.bound = "1";
  void syncC2c();

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
    const left = stockOf(item);
    const soldOut = left <= 0;
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
      stage.innerHTML = `${item.bumped ? bumpMark(lang) : ""}${
        activeSrc
          ? `<button type="button" class="pdp-zoom" data-pdp-zoom aria-label="${lang === "zh" ? "放大照片" : "Enlarge photo"}"><img src="${esc(activeSrc)}" alt="${esc(copy.title)}" width="1200" height="1500"></button>`
          : ""
      }`;
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
    const bagText = soldOut ? soldLabel : `${bagLabel} — ${money(item.price * qty)}`;
    const mine = isOwnListing(item);
    const ownNote = lang === "zh" ? "這是你的刊登，不能加入自己的袋子。" : "This is your listing, so it stays out of your bag.";
    const cta = mine
      ? `<a class="pdp-mail" href="${mail}">${contact}</a>`
      : soldOut
        ? `<button type="button" class="pdp-bag" disabled>${soldLabel}</button>`
        : `<button type="button" class="pdp-bag" data-pdp-add>${bagText}</button>
         <a class="pdp-mail" href="${mail}">${contact}</a>`;

    const named = sellerLabel(item, lang);
    const who = named === "a classmate" ? (lang === "zh" ? "一位同學" : "a classmate") : named;
    const initial = who.replace(/^A /, "").slice(0, 1).toUpperCase();
    const firmLine = item.firm === false ? (lang === "zh" ? "價格可議" : "Negotiable") : lang === "zh" ? "不二價" : "Firm price";
    const payLine = lang === "zh" ? "款項直接付給這位同學。" : "You pay this classmate directly.";
    const postedNote = String(item.description || copy.blurb || "").trim();
    const facts = [
      [lang === "zh" ? "課程" : "Course", item.course],
      [lang === "zh" ? "老師" : "Professor", item.professor],
      [lang === "zh" ? "書況" : "Condition", conditionText(item, lang)],
      [lang === "zh" ? "作者" : "Author", item.author],
      [lang === "zh" ? "版本" : "Edition", item.edition],
      ["ISBN", item.isbn],
    ].filter(([, value]) => String(value || "").trim());

    if (info) {
      info.innerHTML = `
        <p class="pdp-kicker">${tagLabel}</p>
        <h1 class="pdp-title">${esc(copy.title)}</h1>
        <p class="pdp-price">${soldOut ? soldLabel : odo(`pdp-${item.id}`, money(item.price))}</p>
        ${
          soldOut
            ? ""
            : `<p class="pdp-fee">${lang === "zh" ? `結帳每本服務費 NT$${BUYER_ITEM_FEE}${item.delivery ? `，外送 NT$${DELIVERY_FEE}` : ""}` : `NT$${BUYER_ITEM_FEE} service fee per book at checkout${item.delivery ? `. Delivery is NT$${DELIVERY_FEE}` : ""}`}</p>`
        }
        <div class="pdp-seller">
          <span class="pdp-avatar" aria-hidden="true">${item.sellerPhoto ? `<img src="${esc(item.sellerPhoto)}" alt="" width="42" height="42">` : esc(initial)}</span>
          <div>
            <p>${lang === "zh" ? `賣方是${who}` : `Sold by ${who}`}</p>
            <p>${esc(firmLine)}<br>${esc(payLine)}</p>
          </div>
        </div>
        <p class="pdp-stock">${mine ? ownNote : soldOut ? soldLabel : lang === "zh" ? `可售 ${left}。數量只能在 1 和可售數量之間。` : `${left} available. Quantity stays between 1 and the stock on hand.`}</p>
        ${variantRow}
        ${
          mine
            ? ""
            : `<div class="pdp-field">
          <p class="pdp-label">${qtyLabel}</p>
          <div class="pdp-qty">
            <button type="button" data-qty="-1" ${qty <= 1 || soldOut ? "disabled" : ""} aria-label="Decrease quantity">−</button>
            <span class="trade-money">${odo(`pdp-qty-${item.id}`, String(qty))}</span>
            <button type="button" data-qty="1" ${soldOut || qty >= left ? "disabled" : ""} aria-label="Increase quantity">+</button>
          </div>
        </div>`
        }
        <div class="pdp-actions">${cta}</div>
        <div class="pdp-notes">
          <details>
            <summary>${lang === "zh" ? "校園面交怎麼進行" : "How campus hand-off works"}</summary>
            <ol>
              <li>${lang === "zh" ? "先保留，再把款項付給同學。" : "Reserve the book and pay your classmate."}</li>
              <li>${lang === "zh" ? "賣方確認收到款項。" : "The seller confirms the payment."}</li>
              <li>${lang === "zh" ? "在校園碰面交書。" : "Meet on campus and hand over the book."}</li>
            </ol>
          </details>
          <details>
            <summary>${lang === "zh" ? "費用與取消" : "Fees and cancellation"}</summary>
            <p>${lang === "zh" ? `下單後保留 10 分鐘。每本服務費 NT$${BUYER_ITEM_FEE}。逾時未付款，書會回到市集。` : `A 10-minute hold starts after you place the order. Each book adds NT$${BUYER_ITEM_FEE}. If the timer ends, the book returns to the marketplace.`}</p>
          </details>
        </div>
        <p class="pdp-sku">${skuLabel} ${esc(item.sku)}</p>`;
    }

    if (story) {
      story.innerHTML = `
        <h2>${item.posted ? (lang === "zh" ? `${esc(who)} 寫下的內容` : `What ${esc(who)} posted`) : lang === "zh" ? "商品說明" : "Product details"}</h2>
        ${postedNote ? `<p class="pdp-lead">${esc(postedNote)}</p>` : ""}
        ${
          facts.length
            ? `<dl class="pdp-facts">${facts.map(([label, value]) => `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join("")}</dl>`
            : ""
        }
        <p class="pdp-pickup">${esc(copy.pickup)}</p>`;
    }

    if (dock) {
      dock.hidden = false;
      dock.innerHTML = mine
        ? `<strong>${ownNote}</strong>`
        : soldOut
          ? `<strong>${soldLabel}</strong><button type="button" class="pdp-bag" disabled>${soldLabel}</button>`
          : `<strong class="trade-money">${odo(`pdp-dock-${item.id}`, money(item.price))}</strong><button type="button" class="pdp-bag" data-pdp-add>${bagLabel}</button>`;
    }

    const also = forBuyer([...sellerPackets(), ...rotatedPackets(), ...allPackets()])
      .filter((other) => other.id !== item.id && stockOf(other) > 0)
      .sort((a, b) => Number(b.tag === item.tag) - Number(a.tag === item.tag))
      .slice(0, 3);
    if (relatedGrid && relatedWrap) {
      relatedWrap.hidden = also.length === 0;
      relatedGrid.innerHTML = also.map(cardHTML).join("");
    }
  };

  const lightbox = document.createElement("dialog");
  lightbox.className = "shop-lightbox";
  lightbox.innerHTML = `<form method="dialog"><button value="cancel" aria-label="Close">×</button><button type="button" data-light="prev" aria-label="Previous">‹</button><img alt=""><button type="button" data-light="next" aria-label="Next">›</button></form>`;
  document.body.append(lightbox);
  const copyTitle = (record) => (record[currentLang()] || record.en)?.title || "Textbook";
  const openLightbox = () => {
    const img = lightbox.querySelector("img");
    if (img) img.src = activeSrc;
    lightbox.showModal();
  };
  const stepLightbox = (dir) => {
    const shots = (item?.gallery?.length ? item.gallery : [item?.image]).filter(Boolean);
    if (!shots.length) return;
    const index = Math.max(0, shots.indexOf(activeSrc));
    const next = dir === "prev" ? (index - 1 + shots.length) % shots.length : (index + 1) % shots.length;
    activeSrc = shots[next] || activeSrc;
    const img = lightbox.querySelector("img");
    if (img) img.src = activeSrc;
    render();
  };

  root.addEventListener("click", (event) => {
    const shot = event.target.closest("[data-pdp-shot]");
    if (shot) {
      activeSrc = shot.getAttribute("data-pdp-shot");
      render();
      return;
    }
    const delta = event.target.closest("[data-qty]");
    if (delta && item && stockOf(item) > 0) {
      qty = Math.min(stockOf(item), Math.max(1, qty + Number(delta.getAttribute("data-qty"))));
      render();
      return;
    }
    if (event.target.closest("[data-pdp-add]") && item && !isOwnListing(item)) {
      try {
        const previous = readBag().find((row) => row.listing_id === item.id) || null;
        addBagLine({
          id: item.id,
          title: copyTitle(item),
          unit: item.price,
          image: item.image,
          onHand: Math.max(stockOf(item), 1),
          sellerId: item.sellerId,
          sellerEmail: item.sellerEmail,
          sellerUserId: item.sellerUserId,
          sellerName: item.sellerName || "imMBA shelf",
          posted: Boolean(item.posted),
          generated: !item.posted,
          delivery: Boolean(item.delivery),
          bumped: Boolean(item.bumped),
          qty,
        });
        const zhNow = currentLang() === "zh";
        window.dispatchEvent(new CustomEvent("immba:toast", {
          detail: {
            message: zhNow ? "已加入袋子" : "Added to bag",
            title: copyTitle(item),
            undoId: item.id,
            previous,
            loading: zhNow ? "加入袋子" : "Adding to bag",
            undoLoading: zhNow ? "移出袋子" : "Taking it out",
            undone: zhNow ? "已移出袋子" : "Removed from bag",
          },
        }));
        void paintBagBadge();
      } catch (error) {
        window.dispatchEvent(new CustomEvent("immba:toast", { detail: { message: error.message, error: true } }));
      }
      return;
    }
    if (event.target.closest("[data-pdp-zoom]")) openLightbox();
    if (event.target.closest("[data-pdp-share]")) {
      const url = location.href;
      const zhNow = currentLang() === "zh";
      const note = (ok) => {
        window.dispatchEvent(new CustomEvent("immba:toast", {
          detail: {
            message: ok
              ? (zhNow ? "已複製連結" : "Link copied")
              : (zhNow ? "無法複製連結" : "Could not copy the link"),
          },
        }));
      };
      const copy = async () => {
        try {
          await navigator.clipboard.writeText(url);
          return true;
        } catch {
          const area = document.createElement("textarea");
          area.value = url;
          area.setAttribute("readonly", "");
          area.style.position = "fixed";
          area.style.left = "-999px";
          document.body.append(area);
          area.select();
          const ok = document.execCommand("copy");
          area.remove();
          return ok;
        }
      };
      const share = navigator.share?.bind(navigator);
      if (share) {
        share({ title: item ? copyTitle(item) : "imMBA", url }).catch((error) => {
          if (error?.name === "AbortError") return;
          copy().then(note);
        });
      } else {
        copy().then(note);
      }
    }
    const light = event.target.closest("[data-light]");
    if (light) stepLightbox(light.getAttribute("data-light"));
  });

  window.addEventListener("immba:lang", render);
  void paintBagBadge();
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
