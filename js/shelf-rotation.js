const WINDOW_MS = 2 * 60 * 60 * 1000;

const IMAGES = [
  "images/marketplace/ibm.jpg",
  "images/marketplace/strategy.jpg",
  "images/marketplace/marketing.jpg",
  "images/marketplace/finance.jpg",
  "images/marketplace/hr.jpg",
  "images/marketplace/analytics.jpg",
  "images/marketplace/ai.jpg",
  "images/marketplace/ethics.jpg",
  "images/marketplace/supply.jpg",
  "images/marketplace/thesis.jpg",
  "images/marketplace/ibm-used.jpg",
];

const BOOKS = [
  ["Cross-border Case Notes", "跨國個案筆記", "IBM 514", "core", 260],
  ["Global Strategy Workbook", "全球策略練習簿", "IBM 532", "core", 240],
  ["Brand Plan Scratchpad", "品牌計畫草稿", "MKT 521", "core", 180],
  ["Pricing Workshop Packet", "定價工作坊教材", "MKT 508", "elective", 150],
  ["Campus Finance Drills", "財務演練題", "FIN 501", "core", 220],
  ["Valuation Margin Notes", "評價課眉批", "FIN 518", "elective", 200],
  ["People Analytics Sheets", "人力分析表", "HRM 506", "elective", 160],
  ["Hiring Case Set", "招募個案集", "HRM 512", "elective", 140],
  ["Ops Flow Cheat Sheet", "營運流程速記", "OSC 503", "core", 190],
  ["Supplier Map Packet", "供應商地圖教材", "OSC 517", "spotlight", 170],
  ["Ethics Discussion Cards", "倫理討論卡", "ETH 502", "core", 110],
  ["Stakeholder Note Pack", "利害關係人筆記", "ETH 509", "elective", 130],
  ["Dashboard Walkthrough", "儀表板演練", "BAN 504", "spotlight", 210],
  ["Survey Coding Notes", "問卷編碼筆記", "BAN 511", "spotlight", 160],
  ["Prototype Critique Log", "原型講評紀錄", "DIG 507", "spotlight", 180],
  ["Service Blueprint Packet", "服務藍圖教材", "DIG 515", "elective", 150],
  ["Thesis Outline Samples", "論文大綱範例", "RES 601", "elective", 90],
  ["Citation Desk Guide", "引用桌邊指南", "RES 608", "elective", 80],
];

const CONDITIONS = [
  ["Like New", "近全新"],
  ["Good", "良好"],
  ["Fair", "普通"],
];

const mulberry32 = (seed) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const shelfWindow = () => Math.floor(Date.now() / WINDOW_MS);

export const shelfRefreshIn = () => WINDOW_MS - (Date.now() % WINDOW_MS);

export const rotatedPackets = () => {
  const bucket = shelfWindow();
  const rand = mulberry32(bucket + 17);
  const start = Math.floor(rand() * BOOKS.length);
  const picked = Array.from({ length: 9 }, (_, index) => BOOKS[(start + index) % BOOKS.length]);
  return picked.map((book, index) => {
    const [en, zh, course, tag, base] = book;
    const condition = CONDITIONS[Math.floor(rand() * CONDITIONS.length)];
    const price = Math.max(60, Math.round((base + Math.floor(rand() * 9) * 10 - 40) / 10) * 10);
    const bumped = index < 2 && rand() > 0.35;
    const delivery = rand() > 0.72;
    const image = IMAGES[(bucket + index) % IMAGES.length];
    const id = `rot-${bucket}-${index}`;
    const copy = {
      title: en,
      format: delivery ? `${condition[0]} · delivery` : `${condition[0]} · campus pickup`,
      style: condition[0],
      blurb: `${course} notes from the current two-hour shelf. ${condition[0]} copy, passed along by an imMBA classmate.`,
      details: [course, condition[0], bumped ? "Bumped listing" : "Cohort shelf"],
      pickup: delivery
        ? "Campus pickup, or delivery for NT$60 if you leave it checked in the bag."
        : "Campus pickup after the seller confirms payment.",
    };
    return {
      id,
      sku: `ROT-${bucket}-${index + 1}`,
      image,
      gallery: [image],
      family: id,
      price,
      tag,
      kind: "book",
      sold: false,
      bumped,
      delivery,
      course,
      condition: condition[0],
      conditionZh: condition[1],
      professor: "",
      firm: true,
      sellerId: "shelf",
      sellerName: "A classmate",
      rotating: true,
      en: copy,
      zh: {
        ...copy,
        title: zh,
        format: delivery ? `${condition[1]} · 外送` : `${condition[1]} · 校園面交`,
        style: condition[1],
        blurb: `這一輪兩小時書架上的 ${course} 筆記。${condition[1]}，由 imMBA 同學流轉。`,
        details: [course, condition[1], bumped ? "置頂刊登" : "這一輪書架"],
        pickup: delivery ? "可校園面交。若在袋子裡保留外送，另付 NT$60。" : "賣方確認付款後於校園面交。",
      },
    };
  });
};
