import { isCloud, rest, uploadNewsPhoto } from "./supabase.js?v=news2";

export const NEWS_STORAGE_KEY = "immba-admin-news-v1";

export const NEWS_SOURCE = "https://www.management.fju.edu.tw/esubweb/immbaengindex/news.php";

const officialDetail = (nid) =>
  `https://www.management.fju.edu.tw/esubweb/immbaengindex/news-detail.php?NID=${nid}`;

export const DEFAULT_NEWS = [
  {
    id: "n1",
    date: "2026-08-19",
    linkUrl: "announcement.html?id=n1",
    order: 1,
    status: "published",
    source: NEWS_SOURCE,
    officialUrl: officialDetail(187),
    title: {
      en: "Spring 2027, apply NOW!! (Sep 14 - Oct 14) - This track is open to international students only",
      zh: "2027 春季班，立即申請！！（9/14–10/14）— 本通道僅開放國際學生",
    },
    content: {
      en: [
        "Spring 2027",
        "★ When to apply: Sep 14 - Oct 14",
        "★ How to apply: Apply online and submit required documents.",
        "★ Required Documents",
        "1.The certificate or diploma of your highest degree",
        "2.Complete academic transcripts issued by your school for each year of study",
        "3.A financial statement showing that you have sufficient funds to study in Taiwan",
        "4.Receipt for application fee",
        "5.Verification of nationality",
        "6.Declaration Form: Download the form from the application system",
        "7.Two recommendation letters",
        "8.Transcript of English Proficiency",
        "9.A biography with a study plan",
        "10.Any other materials which may contribute to the application for admission",
        "For more detailed information:",
        "http://www.management.fju.edu.tw/esubweb/immbaengindex/enroll.php?IID=3",
      ].join("\n"),
      zh: [
        "2027 春季班",
        "★ 申請時間：9 月 14 日至 10 月 14 日",
        "★ 申請方式：線上申請並繳交應備文件。",
        "★ 應備文件",
        "1.最高學歷證書或文憑",
        "2.就讀各學年完整成績單（由學校核發）",
        "3.足以證明有能力在臺求學的財力證明",
        "4.報名費繳費收據",
        "5.國籍證明",
        "6.切結書：請自申請系統下載",
        "7.兩封推薦信",
        "8.英語能力成績單",
        "9.含讀書計畫之自傳",
        "10.其他有助於入學申請的資料",
        "更多詳細資訊：",
        "http://www.management.fju.edu.tw/esubweb/immbaengindex/enroll.php?IID=3",
      ].join("\n"),
    },
  },
  {
    id: "n2",
    date: "2026-09-08",
    linkUrl: "announcement.html?id=n2",
    order: 2,
    status: "published",
    source: NEWS_SOURCE,
    officialUrl: officialDetail(421),
    title: {
      en: "【How much is possible in two years?】",
      zh: "【兩年可以完成多少事？】",
    },
    content: {
      en: [
        "If you're choosing a graduate program, you may be looking for more than just a master's degree.",
        "International Management MBA (imMBA) offers a fully English-taught environment where you study with students from around the world, gain cross-cultural experience, and build an international network. You'll also have opportunities to study abroad and explore more possibilities.",
        "What is imMBA all about? Who is it for? What opportunities does it offer?",
        "Join us on September 29 and discover where imMBA could take you.",
        "Fu Jen imMBA 2027 Admissions Information Session",
        "September 29 (Tue.)｜12:10 PM｜LM202 Meeting Room",
        "Registration opens on September 14 (Mon.). Stay tuned!",
        "Your future starts with imMBA.",
        "#FJCU_imMBA #Dual_Master_Degree",
      ].join("\n"),
      zh: [
        "如果你正在選擇研究所，你要找的也許不只是一張碩士文憑。",
        "國際經營管理碩士（imMBA）提供全英語授課環境，與來自世界各地的同學一起學習、累積跨文化經驗並建立國際人脈。你也有機會出國研修、探索更多可能。",
        "imMBA 是什麼？適合誰？能帶來哪些機會？",
        "9 月 29 日與我們見面，看看 imMBA 能帶你走多遠。",
        "輔大 imMBA 2027 招生說明會",
        "9 月 29 日（二）｜中午 12:10｜LM202 會議室",
        "報名於 9 月 14 日（一）開始，敬請期待！",
        "你的未來，從 imMBA 開始。",
        "#FJCU_imMBA #Dual_Master_Degree",
      ].join("\n"),
    },
  },
  {
    id: "n3",
    date: "2026-09-02",
    linkUrl: "announcement.html?id=n3",
    order: 3,
    status: "published",
    source: NEWS_SOURCE,
    officialUrl: officialDetail(420),
    title: {
      en: "【90 Seconds with the Professor｜AI × Product】",
      zh: "【教授 90 秒｜AI × 產品】",
    },
    content: {
      en: [
        "What is AI-Assisted Digital Product Development all about?",
        "Starting with a business idea, how can AI support the development of a digital product? And what skills can business students gain from this course?",
        "In just 90 seconds, our professor introduces the course and gives you a quick look at the key ideas behind AI × Product.",
        "90 seconds—let's hear from the professor.",
        "#FJCU_imMBA #dual_master_degree",
      ].join("\n"),
      zh: [
        "「AI 輔助數位產品開發」到底在學什麼？",
        "從一個商業想法出發，AI 如何協助開發數位產品？商管學生又能從這門課得到哪些能力？",
        "只要 90 秒，教授介紹這門課，帶你快速認識 AI × 產品的核心概念。",
        "90 秒——聽聽教授怎麼說。",
        "#FJCU_imMBA #dual_master_degree",
      ].join("\n"),
    },
  },
  {
    id: "n4",
    date: "2026-08-26",
    linkUrl: "announcement.html?id=n4",
    order: 4,
    status: "published",
    source: NEWS_SOURCE,
    officialUrl: officialDetail(419),
    title: {
      en: "【New Course Spotlight｜Data Analytics for International Business】",
      zh: "【新課焦點｜國際企業資料分析】",
    },
    content: {
      en: [
        "Last week, we explored AI × Product. This week, we look at AI × Data and how data supports better business decisions.",
        "In the AI era, identifying problems, spotting trends, and making data-informed decisions are becoming essential skills for business professionals.",
        "This academic year, Fu Jen imMBA introduces Data Analytics for International Business, covering data visualization, statistical analysis, and machine learning through real-world business applications.",
        "From AI × Product to AI × Data, these two new courses respond to the changes brought by AI from different angles, helping business students build the skills to solve problems and make better decisions.",
        "#FJCU_imMBA #dual_master_degree",
      ].join("\n"),
      zh: [
        "上週我們談了 AI × 產品。本週來看 AI × 資料，以及資料如何支持更好的商業決策。",
        "在 AI 時代，辨識問題、掌握趨勢，並依資料做出決策，正成為商管專業人士的關鍵能力。",
        "本學年輔大 imMBA 新開「國際企業資料分析」，透過真實商業應用教授資料視覺化、統計分析與機器學習。",
        "從 AI × 產品到 AI × 資料，兩門新課從不同角度回應 AI 帶來的改變，幫助商管學生培養解決問題與做出更好決策的能力。",
        "#FJCU_imMBA #dual_master_degree",
      ].join("\n"),
    },
  },
  {
    id: "n5",
    date: "2026-07-29",
    linkUrl: "announcement.html?id=n5",
    order: 5,
    status: "published",
    source: NEWS_SOURCE,
    officialUrl: officialDetail(415),
    title: {
      en: "【Partner Spotlight | IQS School of Management】",
      zh: "【夥伴聚焦｜IQS 管理學院】",
    },
    content: {
      en: [
        "When people think of Spain, Barcelona is often known for its architecture and vibrant culture. For business students, it is also one of Europe's leading hubs for innovation and entrepreneurship.",
        "Located in Barcelona, IQS School of Management is part of IQS, a founding member of Universitat Ramon Llull, and one of the dual-degree partners of Fu Jen imMBA. Founded in 1905, IQS School of Management is AACSB-accredited and is recognized for integrating management, technology, and innovation.",
        "Through the imMBA 1+1 Dual Master's Degree Program, students may spend their second year at IQS, choosing between the Master in Industrial Business Management and the Master in International Marketing in a Digital Environment. Upon meeting the graduation requirements of both institutions, students earn master's degrees from both universities. Under the partnership agreement, imMBA dual-degree students are eligible for a tuition discount while studying at IQS.",
        "The partnership offers students the opportunity to experience the European higher education system, broaden their global perspective, and thrive in an increasingly interconnected world.",
        "#FJCU_imMBA #Dual_Master_Degree",
      ].join("\n"),
      zh: [
        "提到西班牙，人們常想到巴塞隆納的建築與活力文化。對商管學生而言，這裡也是歐洲創新與創業的重要樞紐之一。",
        "位於巴塞隆納的 IQS School of Management 隸屬 IQS，是 Ramon Llull 大學創始成員之一，也是輔大 imMBA 雙聯夥伴。創立於 1905 年，IQS School of Management 具 AACSB 認證，以整合管理、科技與創新著稱。",
        "透過 imMBA 1+1 雙聯碩士，學生可於第二年到 IQS 就讀，選擇工業企業管理碩士或數位環境國際行銷碩士。符合兩校畢業規定後，可取得兩校碩士學位。依合作協議，imMBA 雙聯生於 IQS 就讀可享學費優惠。",
        "這項合作讓學生體驗歐洲高等教育、拓展全球視野，並在日益連結的世界中成長。",
        "#FJCU_imMBA #Dual_Master_Degree",
      ].join("\n"),
    },
  },
  {
    id: "n6",
    date: "2026-07-15",
    linkUrl: "announcement.html?id=n6",
    order: 6,
    status: "published",
    source: NEWS_SOURCE,
    officialUrl: officialDetail(411),
    title: {
      en: "【Across the Pacific, One More Global Partner】",
      zh: "【跨越太平洋，再添全球夥伴】",
    },
    content: {
      en: [
        "Recently, faculty members from Fu Jen's College of Management visited sister school California State Polytechnic University, Pomona (CPP). The two sides discussed various areas of collaboration, including the possibility of a 1+1 dual master's degree for the International Management MBA (imMBA).",
        "CPP is part of the California State University system. Its College of Business Administration holds AACSB accreditation in both business and accounting and is known for its Learn by Doing approach. Its research and practice centers focus on areas such as Customer Insights, Entrepreneurship, Digital Innovation, Business Analytics, and Cyber Risk.",
        "Both institutions will continue discussions on curriculum alignment, credit transfer, and program planning, with the goal of creating more international learning and dual degree opportunities for imMBA students.",
        "#FJCU_imMBA #Dual_Master_Degree",
      ].join("\n"),
      zh: [
        "近日，輔大管理學院師長拜訪姐妹校加州州立理工大學波莫納分校（CPP）。雙方討論多項合作，包括國際經營管理碩士（imMBA）1+1 雙聯碩士的可能。",
        "CPP 隸屬加州州立大學系統。其商管學院在商學與會計皆具 AACSB 認證，以「做中學」著稱。研究與實務中心涵蓋顧客洞察、創業、數位創新、商業分析與網路風險等領域。",
        "雙方將持續就課程對接、學分採計與學程規劃進行討論，為 imMBA 學生創造更多國際學習與雙聯機會。",
        "#FJCU_imMBA #Dual_Master_Degree",
      ].join("\n"),
    },
  },
];

const clone = (items) => JSON.parse(JSON.stringify(items));

const normalize = (item, index = 0) => ({
  id: String(item?.id || `n-${Date.now()}-${index}`),
  date: item?.date || new Date().toISOString().slice(0, 10),
  linkUrl: item?.linkUrl || "",
  order: Number(item?.order) || index + 1,
  status: item?.status === "draft" ? "draft" : "published",
  source: item?.source || NEWS_SOURCE,
  officialUrl: item?.officialUrl || "",
  title: {
    en: item?.title?.en || "",
    zh: item?.title?.zh || "",
  },
  content: {
    en: item?.content?.en || "",
    zh: item?.content?.zh || "",
  },
  photos: Array.isArray(item?.photos)
    ? item.photos
        .filter((photo) => photo && typeof photo.src === "string" && photo.src)
        .map((photo) => ({ src: photo.src, name: photo.name || "" }))
    : [],
});

let cachedNews = null;

const toRow = (item) => ({
  id: item.id,
  date: item.date,
  link_url: item.linkUrl || "",
  sort_order: Number(item.order) || 0,
  status: item.status === "draft" ? "draft" : "published",
  source: item.source || NEWS_SOURCE,
  official_url: item.officialUrl || "",
  title_en: item.title?.en || "",
  title_zh: item.title?.zh || "",
  content_en: item.content?.en || "",
  content_zh: item.content?.zh || "",
  photos: (item.photos || []).filter((photo) => photo.src && !String(photo.src).startsWith("data:")),
  updated_at: new Date().toISOString(),
});

const fromRow = (row, index = 0) =>
  normalize({
    id: row.id,
    date: row.date,
    linkUrl: row.link_url,
    order: row.sort_order,
    status: row.status,
    source: row.source,
    officialUrl: row.official_url,
    title: { en: row.title_en, zh: row.title_zh },
    content: { en: row.content_en, zh: row.content_zh },
    photos: Array.isArray(row.photos) ? row.photos : [],
  }, index);

const cloudNews = (path, options = {}) => rest(path, { ...options, anon: true });

const listCloudNews = async () => {
  const rows = await cloudNews("news?select=*&order=sort_order.asc,date.desc");
  return Array.isArray(rows) ? rows.map(fromRow) : [];
};

const dataUrlToFile = (src, name) => {
  const match = String(src).match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  const bytes = Uint8Array.from(atob(match[2]), (char) => char.charCodeAt(0));
  return new File([bytes], name || "photo.jpg", { type: match[1] || "image/jpeg" });
};

const publishPhotos = async (item) => {
  const photos = [];
  for (const photo of item.photos || []) {
    if (!photo?.src) continue;
    if (!String(photo.src).startsWith("data:")) {
      photos.push({ src: photo.src, name: photo.name || "" });
      continue;
    }
    try {
      const file = dataUrlToFile(photo.src, photo.name);
      const src = file ? await uploadNewsPhoto(file, `${item.id}-${Date.now()}-${photo.name || "photo.jpg"}`) : photo.src;
      photos.push({ src, name: photo.name || "" });
    } catch {
      /* Keep data URLs off the cloud row so a large photo cannot block the post. */
    }
  }
  return { ...item, photos };
};

const writeLocalNews = async (items) => {
  try {
    await writeIdbNews(items);
  } catch {
    /* IndexedDB can be blocked in private windows */
  }
  try {
    localStorage.setItem(NEWS_STORAGE_KEY, JSON.stringify(items));
  } catch {
    try {
      const slim = items.map((item) => ({
        ...item,
        photos: (item.photos || [])
          .filter((photo) => photo.src && !photo.src.startsWith("data:"))
          .map((photo) => ({ src: photo.src, name: photo.name || "" })),
      }));
      localStorage.setItem(NEWS_STORAGE_KEY, JSON.stringify(slim));
    } catch {
      /* cache is optional when cloud is the source of truth */
    }
  }
};

const writeCloudNews = async (items) => {
  const published = [];
  for (const item of items) {
    published.push(await publishPhotos(item));
  }
  const existing = await listCloudNews();
  const keep = new Set(published.map((item) => item.id));
  for (const row of existing) {
    if (!keep.has(row.id)) {
      await cloudNews(`news?id=eq.${encodeURIComponent(row.id)}`, { method: "DELETE" });
    }
  }
  for (const item of published) {
    const payload = toRow(item);
    const found = existing.find((row) => row.id === item.id);
    if (found) {
      await cloudNews(`news?id=eq.${encodeURIComponent(item.id)}`, { method: "PATCH", body: payload });
    } else {
      await cloudNews("news", { method: "POST", body: payload });
    }
  }
  return published;
};

const readLocalNews = () => {
  try {
    const raw = localStorage.getItem(NEWS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.length) return null;
    return parsed.map(normalize);
  } catch {
    return null;
  }
};

const openNewsDb = () =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open("immba-admin-news-db", 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains("news")) {
        request.result.createObjectStore("news");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const readIdbNews = async () => {
  try {
    const db = await openNewsDb();
    return await new Promise((resolve, reject) => {
      const request = db.transaction("news", "readonly").objectStore("news").get("list");
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return null;
  }
};

const writeIdbNews = async (items) => {
  const db = await openNewsDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction("news", "readwrite");
    tx.objectStore("news").put(items, "list");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const loadNews = () =>
  (Array.isArray(cachedNews) && cachedNews.length && cachedNews) ||
  readLocalNews() ||
  clone(DEFAULT_NEWS).map(normalize);

const fallbackNews = (local) =>
  (Array.isArray(local) && local.length ? local : clone(DEFAULT_NEWS)).map(normalize);

const upsertCloudRow = async (item) => {
  const published = await publishPhotos(item);
  const payload = {
    ...toRow(published),
    photos: (published.photos || []).filter((photo) => photo.src && !String(photo.src).startsWith("data:")),
  };
  const existing = await cloudNews(`news?id=eq.${encodeURIComponent(published.id)}&select=id`);
  if (existing?.length) {
    await cloudNews(`news?id=eq.${encodeURIComponent(published.id)}`, { method: "PATCH", body: payload });
  } else {
    await cloudNews("news", { method: "POST", body: payload });
  }
  return fromRow(payload);
};

export const hydrateNews = async () => {
  const fromIdb = await readIdbNews();
  const local = Array.isArray(fromIdb) && fromIdb.length ? fromIdb.map(normalize) : readLocalNews();
  const office = Boolean(document.querySelector("[data-office], [data-admin-form]"));
  if (isCloud()) {
    try {
      let rows = await listCloudNews();
      if (!rows.length) {
        const seed = fallbackNews(local);
        if (office) {
          try {
            rows = await writeCloudNews(seed);
          } catch (error) {
            console.warn("news cloud seed failed", error);
            rows = seed;
          }
        } else {
          rows = seed;
        }
      } else if (local?.length) {
        const ids = new Set(rows.map((item) => item.id));
        for (const item of local.filter((row) => !ids.has(row.id))) {
          try {
            rows.push(await upsertCloudRow(item));
          } catch (error) {
            console.warn("news extra upload failed", item.id, error);
          }
        }
      }
      if (rows.length) {
        cachedNews = rows.map(normalize);
        await writeLocalNews(cachedNews);
        return cachedNews;
      }
    } catch (error) {
      console.warn("news cloud list failed", error);
    }
  }
  cachedNews = fallbackNews(local);
  return cachedNews;
};

export const saveNews = async (items) => {
  let next = items.map(normalize);
  if (isCloud()) {
    next = await writeCloudNews(next);
  }
  cachedNews = next;
  await writeLocalNews(next);
  return next;
};

export const restoreDefaultNews = () => saveNews(clone(DEFAULT_NEWS));

export const publishedNews = () =>
  loadNews()
    .filter((item) => item.status === "published")
    .sort((a, b) => b.date.localeCompare(a.date) || a.order - b.order);

export const getNewsById = (id) => loadNews().find((item) => item.id === id) || null;

export const upsertNews = async (item) => {
  const list = loadNews();
  const index = list.findIndex((row) => row.id === String(item?.id || ""));
  const prev = index >= 0 ? list[index] : {};
  const nextItem = normalize({
    ...prev,
    ...item,
    title: { ...(prev.title || {}), ...(item?.title || {}) },
    content: { ...(prev.content || {}), ...(item?.content || {}) },
  });
  if (index >= 0) list[index] = nextItem;
  else list.push(nextItem);
  return saveNews(list);
};

export const deleteNews = (id) => saveNews(loadNews().filter((item) => item.id !== id));

const translateChunk = async (text, pair) => {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${pair}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("translate failed");
  const data = await response.json();
  const out = data?.responseData?.translatedText;
  if (!out || /INVALID LANGUAGE PAIR|QUERY LENGTH/i.test(out)) throw new Error("translate failed");
  return out;
};

export const autoTranslate = async (text, fromLang) => {
  const source = (text || "").trim();
  if (!source) return "";
  const pair = fromLang === "zh" ? "zh-TW|en" : "en|zh-TW";
  const chunks = [];
  const parts = source.split(/\n+/);
  let buffer = "";
  for (const part of parts) {
    const next = buffer ? `${buffer}\n${part}` : part;
    if (next.length > 420 && buffer) {
      chunks.push(buffer);
      buffer = part;
    } else {
      buffer = next;
    }
  }
  if (buffer) chunks.push(buffer);
  try {
    const translated = [];
    for (const chunk of chunks) {
      translated.push(await translateChunk(chunk, pair));
    }
    return translated.join("\n");
  } catch {
    return source;
  }
};
