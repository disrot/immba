import { createListing } from "./listings-store.js?v=notice3";

const BOOKS_KEY = "immba-seller-books";
const MEETS_KEY = "immba-seller-meetups";

const CATALOG = {
  "9780134891262": {
    title: "International Business Management",
    author: "Charles W. L. Hill",
    edition: "13th edition",
  },
  "9781260565799": {
    title: "Strategic Management",
    author: "Frank T. Rothaermel",
    edition: "5th edition",
  },
  "9780134731889": {
    title: "Marketing Management",
    author: "Philip Kotler",
    edition: "15th edition",
  },
  "9780134472133": {
    title: "Financial Management",
    author: "Raymond Brooks",
    edition: "4th edition",
  },
};

const esc = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const zh = () => document.body?.dataset.lang === "zh";
const t = (en, tw) => (zh() ? tw : en);

const readJson = (key, fallback) => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "null");
    return value ?? fallback;
  } catch {
    return fallback;
  }
};

const books = () => readJson(BOOKS_KEY, []);
const saveBooks = (rows) => localStorage.setItem(BOOKS_KEY, JSON.stringify(rows));

const seedMeetups = () => {
  if (localStorage.getItem(MEETS_KEY)) return readJson(MEETS_KEY, []);
  const rows = [
    { id: "m1", buyer: "Lin Wei", title: "Financial Management", place: "Library foyer", when: "Thu 16:30" },
    { id: "m2", buyer: "Sofia Rahman", title: "Business Ethics", place: "LM208-1", when: "Fri 12:10" },
  ];
  localStorage.setItem(MEETS_KEY, JSON.stringify(rows));
  return rows;
};

const isbnDigits = (value) => String(value || "").replace(/[^0-9Xx]/g, "").toUpperCase();

const validIsbn = (value) => {
  const code = isbnDigits(value);
  if (/^\d{13}$/.test(code)) {
    const sum = [...code].reduce((total, digit, index) => total + Number(digit) * (index % 2 ? 3 : 1), 0);
    return sum % 10 === 0;
  }
  if (/^\d{9}[\dX]$/.test(code)) {
    const sum = [...code].reduce((total, digit, index) => total + (digit === "X" ? 10 : Number(digit)) * (10 - index), 0);
    return sum % 11 === 0;
  }
  return false;
};

const lookupBook = (code) =>
  CATALOG[code] || {
    title: `Campus textbook ${code.slice(-4)}`,
    author: "Course reading",
    edition: "Current edition",
  };

const emptyDraft = () => ({
  id: "",
  isbn: "",
  title: "",
  author: "",
  edition: "",
  course: "",
  professor: "",
  condition: "",
  price: "",
  firm: true,
  photos: [],
  status: "active",
});

let view = "dashboard";
let wizardOn = false;
let step = 1;
let draft = emptyDraft();
let looking = false;

const money = (value) => `NT$${Number(value || 0).toLocaleString(zh() ? "zh-TW" : "en-US")}`;

const navItems = () => [
  ["dashboard", t("Dashboard", "總覽")],
  ["listings", t("Active listings", "刊登中")],
  ["meetups", t("Meetups", "面交")],
  ["history", t("History", "紀錄")],
];

const paintNav = () => {
  const items = navItems()
    .map(
      ([key, label]) =>
        `<button type="button" data-seller-view="${key}" aria-current="${view === key ? "page" : "false"}">${label}</button>`
    )
    .join("");
  const side = document.querySelector("[data-seller-nav]");
  const tabs = document.querySelector("[data-seller-tabs]");
  if (side) side.innerHTML = items;
  if (tabs) tabs.innerHTML = items;
};

const metric = (label, value) =>
  `<article class="seller-metric"><p>${esc(label)}</p><strong>${esc(value)}</strong></article>`;

const listingCard = (book) => `<article class="seller-row" data-book="${esc(book.id)}">
  <div class="seller-row-main">
    ${book.photos?.[0] ? `<img src="${esc(book.photos[0])}" alt="">` : `<span class="seller-row-fallback"></span>`}
    <div>
      <h3>${esc(book.title)}</h3>
      <p>${esc(book.course)} · ${esc(book.professor)}</p>
      <p>${money(book.price)} · ${esc(book.condition)}</p>
    </div>
  </div>
  <div class="seller-row-actions">
    <label>
      <span class="sr-only">${t("Status", "狀態")}</span>
      <select data-status>
        ${["active", "pending", "sold"]
          .map((status) => {
            const label = status === "active" ? t("Active", "刊登中") : status === "pending" ? t("Pending", "待面交") : t("Sold", "已售出");
            return `<option value="${status}" ${book.status === status ? "selected" : ""}>${label}</option>`;
          })
          .join("")}
      </select>
    </label>
    <button type="button" class="btn btn-ghost" data-edit>${t("Edit", "編輯")}</button>
    <button type="button" class="btn btn-ghost" data-delete>${t("Delete", "刪除")}</button>
  </div>
</article>`;

const paintHub = () => {
  const root = document.querySelector("[data-seller-main]");
  if (!root || wizardOn) return;
  paintNav();
  const rows = books();
  const active = rows.filter((book) => book.status === "active");
  const pending = rows.filter((book) => book.status === "pending");
  const sold = rows.filter((book) => book.status === "sold");
  const earned = sold.reduce((sum, book) => sum + Number(book.price || 0), 0);
  const meetups = seedMeetups();

  if (view === "dashboard") {
    root.innerHTML = `
      <header class="seller-head">
        <h2>${t("Dashboard", "總覽")}</h2>
        <button type="button" class="btn btn-primary" data-seller-new>${t("Create listing", "建立刊登")}</button>
      </header>
      <div class="seller-metrics">
        ${metric(t("Active listings", "刊登中"), String(active.length))}
        ${metric(t("Total earned", "已入帳"), money(earned))}
        ${metric(t("Pending meetups", "待面交"), String(meetups.length + pending.length))}
      </div>
      <section class="seller-card">
        <h3>${t("Next hand-off", "下一場面交")}</h3>
        ${meetups[0] ? `<p><strong>${esc(meetups[0].buyer)}</strong> · ${esc(meetups[0].title)}</p><p>${esc(meetups[0].place)} · ${esc(meetups[0].when)}</p>` : `<p>${t("No meetups yet.", "還沒有面交。")}</p>`}
      </section>`;
    return;
  }

  if (view === "listings") {
    const shown = rows.filter((book) => book.status !== "sold");
    root.innerHTML = `
      <header class="seller-head">
        <h2>${t("Active listings", "刊登中")}</h2>
        <button type="button" class="btn btn-primary" data-seller-new>${t("Create listing", "建立刊登")}</button>
      </header>
      <div class="seller-list">${shown.length ? shown.map(listingCard).join("") : `<p class="seller-empty">${t("No books on the shelf yet.", "書架上還沒有書。")}</p>`}</div>`;
    return;
  }

  if (view === "meetups") {
    root.innerHTML = `
      <header class="seller-head"><h2>${t("Meetups", "面交")}</h2></header>
      <div class="seller-list">
        ${meetups
          .map(
            (row) => `<article class="seller-card seller-meet">
              <div>
                <h3>${esc(row.buyer)}</h3>
                <p>${esc(row.title)}</p>
                <p>${esc(row.place)} · ${esc(row.when)}</p>
              </div>
              <a class="btn btn-primary" href="mailto:imMBA@mail.fju.edu.tw?subject=${encodeURIComponent(`Meetup: ${row.title}`)}">${t("Message", "傳訊息")}</a>
            </article>`
          )
          .join("")}
      </div>`;
    return;
  }

  root.innerHTML = `
    <header class="seller-head"><h2>${t("History", "紀錄")}</h2></header>
    <div class="seller-list">${sold.length ? sold.map(listingCard).join("") : `<p class="seller-empty">${t("Sold books will appear here.", "售出的書會出現在這裡。")}</p>`}</div>`;
};

const stepReady = () => {
  if (step === 1) return validIsbn(draft.isbn) && draft.title.trim() && draft.course.trim() && draft.professor.trim();
  if (step === 2) return draft.condition && draft.price !== "" && Number(draft.price) >= 0;
  return true;
};

const previewCard = () => `<article class="shop-card seller-preview">
  <div class="shop-cover">${draft.photos[0] ? `<img src="${esc(draft.photos[0])}" alt="">` : ""}</div>
  <p class="shop-card-kicker">${esc(draft.course || t("Course", "課程"))}</p>
  <h2>${esc(draft.title || t("Title", "書名"))}</h2>
  <p class="shop-price-row">${draft.price === "" ? "NT$" : money(draft.price)}${draft.firm ? "" : ` · ${t("Negotiable", "可議價")}`}</p>
</article>`;

const paintWizard = () => {
  const root = document.querySelector("[data-list-wizard]");
  if (!root) return;
  const labels = [t("Book details", "書籍資料"), t("Condition and price", "狀況與價格"), t("Photos and review", "照片與預覽")];
  root.innerHTML = `
    <div class="wizard-top">
      <p class="shop-kicker">${t("Create listing", "建立刊登")}</p>
      <ol class="wizard-progress">
        ${labels
          .map(
            (label, index) =>
              `<li class="${index + 1 === step ? "is-current" : ""} ${index + 1 < step ? "is-done" : ""}"><span>${index + 1}</span>${label}</li>`
          )
          .join("")}
      </ol>
    </div>
    <div class="wizard-body">
      <section class="wizard-step ${step === 1 ? "is-on" : ""}">
        <label>${t("ISBN", "ISBN")}
          <input data-field="isbn" value="${esc(draft.isbn)}" inputmode="numeric" autocomplete="off" placeholder="9780134891262">
        </label>
        <p class="wizard-note" data-isbn-note>${looking ? t("Looking up that ISBN…", "正在查詢 ISBN…") : t("A valid ISBN fills the title, author, and edition.", "有效的 ISBN 會帶入書名、作者與版次。")}</p>
        <label>${t("Title", "書名")}<input data-field="title" value="${esc(draft.title)}"></label>
        <div class="wizard-split">
          <label>${t("Author", "作者")}<input data-field="author" value="${esc(draft.author)}"></label>
          <label>${t("Edition", "版次")}<input data-field="edition" value="${esc(draft.edition)}"></label>
        </div>
        <div class="wizard-split">
          <label>${t("Course code", "課程代碼")}<input data-field="course" value="${esc(draft.course)}" placeholder="IBM 501"></label>
          <label>${t("Professor", "授課教師")}<input data-field="professor" value="${esc(draft.professor)}"></label>
        </div>
      </section>
      <section class="wizard-step ${step === 2 ? "is-on" : ""}">
        <label>${t("Condition", "書況")}
          <select data-field="condition">
            <option value="">${t("Choose", "請選擇")}</option>
            ${[
              ["New", "全新"],
              ["Like New", "近全新"],
              ["Good", "良好"],
              ["Fair", "普通"],
              ["Worn", "有使用痕跡"],
            ]
              .map(([en, tw]) => `<option value="${en}" ${draft.condition === en ? "selected" : ""}>${t(en, tw)}</option>`)
              .join("")}
          </select>
        </label>
        <label>${t("Price (NT$)", "價格（新台幣）")}
          <input data-field="price" type="number" min="0" step="1" value="${esc(draft.price)}">
        </label>
        <div class="firm-toggle" role="group" aria-label="${t("Price flexibility", "價格是否可議")}">
          <button type="button" data-firm="1" aria-pressed="${draft.firm ? "true" : "false"}">${t("Firm", "不二價")}</button>
          <button type="button" data-firm="0" aria-pressed="${draft.firm ? "false" : "true"}">${t("Negotiable", "可議價")}</button>
        </div>
      </section>
      <section class="wizard-step ${step === 3 ? "is-on" : ""}">
        <div class="dropzone" data-drop>
          <p>${t("Drop up to 4 photos, or choose files.", "拖入最多 4 張照片，或選擇檔案。")}</p>
          <input data-photos type="file" accept="image/*" multiple>
        </div>
        <div class="wizard-photos">
          ${draft.photos.map((src, index) => `<figure><img src="${esc(src)}" alt=""><button type="button" data-remove-photo="${index}">${t("Remove", "移除")}</button></figure>`).join("")}
        </div>
        <h3>${t("Buyer preview", "買家看到的樣子")}</h3>
        ${previewCard()}
      </section>
    </div>
    <p class="wizard-status" data-wizard-status></p>
    <div class="wizard-actions">
      <button type="button" class="btn btn-ghost" data-wizard-cancel>${t("Cancel", "取消")}</button>
      <button type="button" class="btn btn-ghost" data-wizard-back ${step === 1 ? "disabled" : ""}>${t("Back", "上一步")}</button>
      ${
        step < 3
          ? `<button type="button" class="btn btn-primary" data-wizard-next ${stepReady() ? "" : "disabled"}>${t("Next", "下一步")}</button>`
          : `<button type="button" class="btn btn-primary" data-wizard-publish>${t("Publish", "刊登")}</button>`
      }
    </div>`;
};

const showWizard = (book) => {
  draft = book ? { ...emptyDraft(), ...book, photos: [...(book.photos || [])] } : emptyDraft();
  step = 1;
  wizardOn = true;
  document.querySelector("[data-seller-hub]")?.setAttribute("hidden", "");
  const wizard = document.querySelector("[data-list-wizard]");
  if (wizard) wizard.hidden = false;
  paintWizard();
};

const showHub = (next = view) => {
  view = next;
  wizardOn = false;
  document.querySelector("[data-seller-hub]")?.removeAttribute("hidden");
  const wizard = document.querySelector("[data-list-wizard]");
  if (wizard) wizard.hidden = true;
  paintHub();
};

const readFields = () => {
  document.querySelectorAll("[data-list-wizard] [data-field]").forEach((field) => {
    draft[field.getAttribute("data-field")] = field.value;
  });
};

const addPhotos = async (files) => {
  const room = 4 - draft.photos.length;
  const next = [...files].slice(0, room);
  for (const file of next) {
    if (!file.type.startsWith("image/") || file.size > 2 * 1024 * 1024) continue;
    const url = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.readAsDataURL(file);
    });
    if (url) draft.photos.push(url);
  }
  paintWizard();
};

const publish = async () => {
  const status = document.querySelector("[data-wizard-status]");
  const id = draft.id || crypto.randomUUID();
  const row = { ...draft, id, photos: draft.photos.slice(0, 4), price: Number(draft.price) || 0 };
  const rows = books().filter((book) => book.id !== id);
  rows.unshift(row);
  saveBooks(rows);
  try {
    let file;
    if (row.photos[0]) {
      const response = await fetch(row.photos[0]);
      const blob = await response.blob();
      file = new File([blob], "cover.jpg", { type: blob.type || "image/jpeg" });
    }
    await createListing({
      title: row.title,
      title_zh: row.title,
      blurb: `${row.author} · ${row.edition}. ${row.course}, ${row.professor}. ${row.condition}. ${row.firm ? "Firm price." : "Negotiable."}`,
      blurb_zh: `${row.author} · ${row.edition}。${row.course}，${row.professor}。${row.condition}。`,
      price: row.price,
      kind: "book",
      tag: "elective",
      format: `${row.condition} · campus pickup`,
      file,
    });
    if (status) status.textContent = t("Published to the marketplace.", "已刊登到市集。");
  } catch (error) {
    if (status) {
      status.textContent = t(
        "Saved on this desk. The public shelf will show it after the seller session can upload.",
        "已存在這個書桌。賣方登入可以上傳後，才會出現在市集。"
      );
    }
    console.warn(error);
  }
  window.setTimeout(() => showHub("listings"), 700);
};

const onHubClick = (event) => {
  const viewButton = event.target.closest("[data-seller-view]");
  if (viewButton && !wizardOn) {
    showHub(viewButton.getAttribute("data-seller-view"));
    return;
  }
  if (event.target.closest("[data-seller-new]")) {
    showWizard();
    return;
  }
  const row = event.target.closest("[data-book]");
  if (!row) return;
  const id = row.getAttribute("data-book");
  if (event.target.closest("[data-edit]")) {
    showWizard(books().find((book) => book.id === id));
    return;
  }
  if (event.target.closest("[data-delete]")) {
    saveBooks(books().filter((book) => book.id !== id));
    paintHub();
  }
};

const onHubChange = (event) => {
  const select = event.target.closest("[data-status]");
  const row = event.target.closest("[data-book]");
  if (!select || !row) return;
  const id = row.getAttribute("data-book");
  saveBooks(books().map((book) => (book.id === id ? { ...book, status: select.value } : book)));
  paintHub();
};

const onWizard = async (event) => {
  if (event.target.closest("[data-wizard-cancel]")) {
    showHub("listings");
    return;
  }
  if (event.target.closest("[data-wizard-back]")) {
    readFields();
    step = Math.max(1, step - 1);
    paintWizard();
    return;
  }
  if (event.target.closest("[data-wizard-next]")) {
    readFields();
    if (!stepReady()) return;
    step = Math.min(3, step + 1);
    paintWizard();
    return;
  }
  if (event.target.closest("[data-wizard-publish]")) {
    readFields();
    if (!validIsbn(draft.isbn) || !draft.title.trim() || !draft.course.trim() || !draft.professor.trim() || !draft.condition) return;
    await publish();
    return;
  }
  const firm = event.target.closest("[data-firm]");
  if (firm) {
    readFields();
    draft.firm = firm.getAttribute("data-firm") === "1";
    paintWizard();
    return;
  }
  const remove = event.target.closest("[data-remove-photo]");
  if (remove) {
    draft.photos.splice(Number(remove.getAttribute("data-remove-photo")), 1);
    paintWizard();
  }
};

const onWizardInput = async (event) => {
  const field = event.target.closest("[data-field]");
  if (!field) return;
  readFields();
  const next = document.querySelector("[data-wizard-next]");
  if (next) next.disabled = !stepReady();
  if (field.getAttribute("data-field") !== "isbn" || looking || !validIsbn(draft.isbn)) return;
  looking = true;
  const note = document.querySelector("[data-isbn-note]");
  if (note) note.textContent = t("Looking up that ISBN…", "正在查詢 ISBN…");
  const code = isbnDigits(draft.isbn);
  await new Promise((resolve) => window.setTimeout(resolve, 650));
  const found = lookupBook(code);
  draft.title = found.title;
  draft.author = found.author;
  draft.edition = found.edition;
  looking = false;
  paintWizard();
};

const onDrop = async (event) => {
  if (event.target.closest("[data-field]")) {
    readFields();
    const next = document.querySelector("[data-wizard-next]");
    if (next) next.disabled = !stepReady();
  }
  const zone = event.target.closest("[data-drop]");
  if (!zone) return;
  if (event.type === "dragover") {
    event.preventDefault();
    zone.classList.add("is-over");
    return;
  }
  if (event.type === "dragleave") {
    zone.classList.remove("is-over");
    return;
  }
  if (event.type === "drop") {
    event.preventDefault();
    zone.classList.remove("is-over");
    await addPhotos(event.dataTransfer?.files || []);
    return;
  }
  if (event.target.matches("[data-photos]") && event.type === "change") {
    await addPhotos(event.target.files || []);
  }
};

let bound = false;

export const initSellerHub = () => {
  if (!document.querySelector("[data-seller-hub]")) return;
  seedMeetups();
  if (!bound) {
    bound = true;
    document.addEventListener("click", (event) => {
      if (event.target.closest("[data-seller-hub], [data-list-wizard]")) void onWizard(event);
      if (event.target.closest("[data-seller-hub]")) onHubClick(event);
    });
    document.addEventListener("change", (event) => {
      if (event.target.closest("[data-seller-hub]")) onHubChange(event);
      if (event.target.closest("[data-list-wizard]")) void onDrop(event);
    });
    document.addEventListener("input", (event) => {
      if (event.target.closest("[data-list-wizard]")) void onWizardInput(event);
    });
    document.addEventListener("dragover", (event) => {
      if (event.target.closest("[data-drop]")) void onDrop(event);
    });
    document.addEventListener("dragleave", (event) => {
      if (event.target.closest("[data-drop]")) void onDrop(event);
    });
    document.addEventListener("drop", (event) => {
      if (event.target.closest("[data-drop]")) void onDrop(event);
    });
    window.addEventListener("immba:lang", () => {
      if (wizardOn) paintWizard();
      else paintHub();
    });
  }
  showHub(view);
};
