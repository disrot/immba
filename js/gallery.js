const galleryUrls =
  typeof import.meta.glob === "function"
    ? import.meta.glob("../images/gallery/*", {
        eager: true,
        query: "?url",
        import: "default",
      })
    : {};

const gallerySrc = (name) => {
  const match = Object.entries(galleryUrls).find(([key]) => {
    const file = key.split("/").pop()?.split("?")[0];
    return file === name;
  });
  return match?.[1] || `images/gallery/${name}`;
};

const GALLERY_SLIDES = [
  {
    src: gallerySrc("menu01779415441.jpg"),
    title: { en: "College of Management", zh: "管理學院" },
  },
  {
    src: gallerySrc("menu01779415376.jpg"),
    title: { en: "Campus life at Fu Jen", zh: "輔大校園生活" },
  },
  {
    src: gallerySrc("menu01779415351.jpg"),
    title: { en: "Learning together", zh: "一起學習" },
  },
  {
    src: gallerySrc("menu01779415325.jpg"),
    title: { en: "Classroom moments", zh: "課堂時光" },
  },
  {
    src: gallerySrc("menu01779415283.jpg"),
    title: { en: "International classroom", zh: "國際課堂" },
  },
  {
    src: gallerySrc("menu01779415236.jpg"),
    title: { en: "imMBA community", zh: "imMBA 社群" },
  },
  {
    src: gallerySrc("menu01495178958.jpg"),
    title: { en: "On campus", zh: "校園一景" },
  },
  {
    src: gallerySrc("menu01495180378.JPG"),
    title: { en: "College gathering", zh: "學院活動" },
  },
  {
    src: gallerySrc("menu01495180622.jpg"),
    title: { en: "Fu Jen halls", zh: "輔大廳堂" },
  },
  {
    src: gallerySrc("menu01495178992.jpg"),
    title: { en: "Study spaces", zh: "學習空間" },
  },
  {
    src: gallerySrc("menu01495179136.jpg"),
    title: { en: "Program highlights", zh: "學程亮點" },
  },
  {
    src: gallerySrc("menu01495180670.JPG"),
    title: { en: "Student life", zh: "學生生活" },
  },
  {
    src: gallerySrc("menu01495179352.jpg"),
    title: { en: "Management building", zh: "管理學院大樓" },
  },
  {
    src: gallerySrc("menu01495179186.jpg"),
    title: { en: "Between classes", zh: "課間時光" },
  },
  {
    src: gallerySrc("menu01495179016.jpg"),
    title: { en: "New Taipei campus", zh: "新北校園" },
  },
  {
    src: gallerySrc("menu01495179047.jpg"),
    title: { en: "Photo Gallery", zh: "相片集錦" },
  },
];

const DURATION_MS = 6500;
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

const wrapIndex = (index, length) => ((index % length) + length) % length;

const shortestOffset = (index, active, length) => {
  let offset = index - active;
  if (offset > length / 2) offset -= length;
  if (offset < -length / 2) offset += length;
  return offset;
};

export const initGallery = () => {
  const root = document.querySelector("[data-gallery]");
  if (!root) return;

  const stage = root.querySelector("[data-gallery-stage]");
  const dotsWrap = root.querySelector("[data-gallery-dots]");
  const prev = root.querySelector("[data-gallery-prev]");
  const next = root.querySelector("[data-gallery-next]");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!stage || !GALLERY_SLIDES.length) return;

  const slides = GALLERY_SLIDES.map((item, index) => {
    const article = document.createElement("article");
    article.className = "tv-slide";
    article.dataset.index = String(index);
    article.innerHTML = `
      <img src="${item.src}" alt="" width="1280" height="720" draggable="false" />
      <div class="tv-slide-shade"></div>
      <h3 class="tv-slide-title"></h3>
    `;
    stage.append(article);
    return article;
  });

  const dots = GALLERY_SLIDES.map((_, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tv-dot";
    btn.setAttribute("aria-label", `Photo ${index + 1}`);
    btn.innerHTML = `<span class="tv-dot-fill"></span>`;
    btn.addEventListener("click", () => goTo(index, true));
    dotsWrap?.append(btn);
    return btn;
  });

  let active = 0;
  let timer = 0;
  let fillToken = 0;
  let dragging = false;
  let dragStartX = 0;
  let dragDelta = 0;
  let dragStamp = 0;

  const lang = () => (document.body.dataset.lang === "zh" ? "zh" : "en");

  const syncCaptions = () => {
    const current = lang();
    slides.forEach((slide, index) => {
      const title = slide.querySelector(".tv-slide-title");
      const copy = GALLERY_SLIDES[index].title;
      if (title) title.textContent = copy[current] || copy.en;
    });
  };

  const layout = (drag = 0) => {
    const count = slides.length;
    slides.forEach((slide, index) => {
      const offset = shortestOffset(index, active, count);
      const isActive = offset === 0;
      const abs = Math.abs(offset);
      slide.classList.toggle("is-active", isActive);
      slide.setAttribute("aria-hidden", isActive ? "false" : "true");
      const shift = offset * 58 + drag / 12;
      const scale = isActive ? 1 : abs === 1 ? 0.78 : 0.62;
      const opacity = isActive ? 1 : abs === 1 ? 0.48 : abs === 2 ? 0.22 : 0;
      const blur = isActive ? 0 : abs === 1 ? 10 : 16;
      slide.style.zIndex = String(20 - abs);
      slide.style.opacity = String(opacity);
      slide.style.filter = reduced ? "none" : `blur(${blur}px)`;
      slide.style.transform = `translate(-50%, -50%) translateX(${shift}%) scale(${scale})`;
      slide.style.pointerEvents = isActive ? "auto" : "none";
    });
  };

  const restartFill = () => {
    fillToken += 1;
    dots.forEach((dot, index) => {
      const fill = dot.querySelector(".tv-dot-fill");
      dot.classList.toggle("is-active", index === active);
      if (!fill) return;
      fill.style.animation = "none";
      void fill.offsetWidth;
      if (index === active && !reduced && !dragging) {
        fill.style.animation = `tvDotFill ${DURATION_MS}ms linear forwards`;
      } else {
        fill.style.width = index === active ? "100%" : "0%";
      }
    });
  };

  const goTo = (index, user) => {
    active = wrapIndex(index, slides.length);
    dragDelta = 0;
    layout(0);
    restartFill();
    if (user) restartTimer();
  };

  const move = (dir, user = false) => goTo(active + dir, user);

  const stopTimer = () => {
    window.clearTimeout(timer);
    timer = 0;
  };

  const restartTimer = () => {
    stopTimer();
    if (reduced) return;
    timer = window.setTimeout(() => move(1), DURATION_MS);
  };

  prev?.addEventListener("click", () => move(-1, true));
  next?.addEventListener("click", () => move(1, true));

  root.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      move(-1, true);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      move(1, true);
    }
  });

  const onPointerDown = (event) => {
    dragging = true;
    dragStartX = event.clientX;
    dragStamp = event.timeStamp;
    dragDelta = 0;
    root.classList.add("is-dragging");
    stage.setPointerCapture?.(event.pointerId);
    stopTimer();
  };

  const onPointerMove = (event) => {
    if (!dragging) return;
    dragDelta = event.clientX - dragStartX;
    layout(dragDelta);
  };

  const onPointerUp = (event) => {
    if (!dragging) return;
    dragging = false;
    root.classList.remove("is-dragging");
    const elapsed = Math.max(16, event.timeStamp - dragStamp);
    const velocity = (event.clientX - dragStartX) / elapsed;
    const threshold = Math.min(120, root.clientWidth * 0.08);
    if (dragDelta > threshold || velocity > 0.45) move(-1, true);
    else if (dragDelta < -threshold || velocity < -0.45) move(1, true);
    else goTo(active, true);
  };

  stage.addEventListener("pointerdown", onPointerDown);
  stage.addEventListener("pointermove", onPointerMove);
  stage.addEventListener("pointerup", onPointerUp);
  stage.addEventListener("pointercancel", onPointerUp);
  stage.addEventListener("lostpointercapture", onPointerUp);

  root.addEventListener("focusin", stopTimer);
  root.addEventListener("focusout", (event) => {
    if (!root.contains(event.relatedTarget) && !dragging) restartTimer();
  });

  window.addEventListener("resize", () => layout(0));

  syncCaptions();
  layout(0);
  restartFill();
  restartTimer();

  root.style.setProperty("--tv-ease", EASE);
  root._syncCaptions = syncCaptions;
};

export const refreshGalleryCaptions = () => {
  document.querySelector("[data-gallery]")?._syncCaptions?.();
};
