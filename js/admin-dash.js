import { summarizeAnalytics, clearAnalytics, shortVisitor } from "./analytics.js";
import { worldMapSvg } from "./world-map.js";

const COLORS = ["#163300", "#8c6a3a", "#5c5346", "#c4a574", "#3d4a36"];

const esc = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const currentLang = () => (document.body?.dataset.lang === "zh" ? "zh" : "en");

const copy = () =>
  currentLang() === "zh"
    ? {
        empty: "尚無資料。請先到前台瀏覽或點擊連結，再回到這裡。",
        none: "這個期間沒有紀錄。",
        justNow: "剛剛",
        view: "瀏覽",
        click: "點擊",
        beat: "在線",
        ago: (n) => `${n} 分鐘前`,
        Direct: "直接",
        Internal: "站內",
        Referral: "外部",
        Search: "搜尋",
        Campaign: "廣告活動",
        Other: "其他",
        Unknown: "未知",
      }
    : {
        empty: "No data yet. Browse the public site, then return here.",
        none: "Nothing in this range.",
        justNow: "Just now",
        view: "View",
        click: "Click",
        beat: "Live",
        ago: (n) => `${n} min ago`,
        Direct: "Direct",
        Internal: "Internal",
        Referral: "Referral",
        Search: "Search",
        Campaign: "Campaign",
        Other: "Other",
        Unknown: "Unknown",
      };

const when = (ts) => {
  const mins = Math.max(0, Math.round((Date.now() - ts) / 60000));
  if (mins < 1) return copy().justNow;
  if (mins < 60) return copy().ago(mins);
  return new Date(ts).toLocaleString();
};

const labelOf = (name) => copy()[name] || name;

const fmt = (value) => Math.round(Number(value || 0)).toLocaleString();

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const easeOut = (t) => 1 - (1 - t) ** 3;

const tweenTo = (el, next, render) => {
  if (!el) return;
  const target = Number(next) || 0;
  const from = Number(el.dataset.n ?? 0);
  el.dataset.n = String(target);
  if (reducedMotion() || from === target) {
    el.textContent = render(target);
    return;
  }
  const started = performance.now();
  const duration = 900;
  const step = (now) => {
    if (el.dataset.n !== String(target)) return;
    const t = Math.min(1, (now - started) / duration);
    el.textContent = render(from + (target - from) * easeOut(t));
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
};

const writeHtml = (node, html) => {
  if (!node || node.innerHTML === html) return;
  node.innerHTML = html;
  if (reducedMotion()) return;
  node.classList.remove("is-chart-in");
  void node.offsetWidth;
  node.classList.add("is-chart-in");
};

const kickPanel = (panel) => {
  if (!panel || reducedMotion()) return;
  panel.classList.remove("is-panel-in");
  void panel.offsetWidth;
  panel.classList.add("is-panel-in");
};

const clock = (ms) => {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = String(Math.floor(total / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${m}:${s}`;
};

const points = (values, width, height, pad) => {
  const max = Math.max(1, ...values);
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  return values.map((value, index) => {
    const x = pad + (values.length < 2 ? innerW / 2 : (index / (values.length - 1)) * innerW);
    const y = pad + innerH - (value / max) * innerH;
    return `${x},${y}`;
  });
};

const barChart = (days, key, color = "#0071e3") => {
  const width = 640;
  const height = 150;
  const pad = 18;
  const values = days.map((d) => Number(d[key] || 0));
  const max = Math.max(1, ...values);
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const gap = innerW / values.length;
  const bw = gap * 0.58;
  const bars = values
    .map((value, index) => {
      const h = value ? Math.max(4, (value / max) * innerH) : 0;
      const x = pad + index * gap + (gap - bw) / 2;
      const y = pad + innerH - h;
      return `<rect class="office-bar" style="--n:${index}" x="${x}" y="${y}" width="${bw}" height="${h}" rx="4" fill="${color}"></rect>`;
    })
    .join("");
  const ticks = days
    .map((d, index) => {
      const x = pad + index * gap + gap / 2;
      return `<text x="${x}" y="${height - 2}" text-anchor="middle">${esc(d.label)}</text>`;
    })
    .join("");
  return `<svg viewBox="0 0 ${width} ${height}" role="img">${bars}${ticks}</svg>`;
};

const spark = (days, key, color) => {
  const width = 640;
  const height = 90;
  const pad = 12;
  const values = days.map((d) => Number(d[key] || 0));
  const pts = points(values, width, height, pad);
  const close = `${width - pad},${height - pad} ${pad},${height - pad}`;
  return `<svg viewBox="0 0 ${width} ${height}" role="img">
    <polyline class="office-area" points="${pts.join(" ")} ${close}" fill="${color}" fill-opacity="0.16" stroke="none"></polyline>
    <polyline class="office-line" points="${pts.join(" ")}" fill="none" stroke="${color}" stroke-width="2.4"></polyline>
  </svg>`;
};

const areaChart = (days) => {
  const width = 640;
  const height = 168;
  const pad = 18;
  const views = days.map((d) => d.count);
  const visits = days.map((d) => d.visits || 0);
  const visitors = days.map((d) => d.visitors || 0);
  const viewPts = points(views, width, height, pad);
  const visitPts = points(visits, width, height, pad);
  const visitorPts = points(visitors, width, height, pad);
  const close = `${width - pad},${height - pad} ${pad},${height - pad}`;
  const ticks = days
    .map((d, index) => {
      const x = pad + (days.length < 2 ? 0 : (index / (days.length - 1)) * (width - pad * 2));
      return `<text x="${x}" y="${height - 2}" text-anchor="middle">${esc(d.label)}</text>`;
    })
    .join("");
  return `<svg viewBox="0 0 ${width} ${height}" role="img">
    <polyline class="office-area" points="${viewPts.join(" ")} ${close}" fill="rgba(159,232,112,.35)" stroke="none"></polyline>
    <polyline class="office-area" points="${visitPts.join(" ")} ${close}" fill="rgba(22,51,0,.12)" stroke="none"></polyline>
    <polyline class="office-line" points="${viewPts.join(" ")}" fill="none" stroke="#9fe870" stroke-width="2.4"></polyline>
    <polyline class="office-line" points="${visitPts.join(" ")}" fill="none" stroke="#75d646" stroke-width="2"></polyline>
    <polyline class="office-line" points="${visitorPts.join(" ")}" fill="none" stroke="#163300" stroke-width="1.6"></polyline>
    ${ticks}
  </svg>`;
};

const lineChart = (days) => {
  const width = 640;
  const height = 140;
  const pad = 16;
  const bounce = days.map((d) => d.bounce || 0);
  const exit = days.map((d) => d.exit || 0);
  const time = days.map((d) => d.time || 0);
  const ticks = days
    .map((d, index) => {
      const x = pad + (days.length < 2 ? 0 : (index / (days.length - 1)) * (width - pad * 2));
      return `<text x="${x}" y="${height - 2}" text-anchor="middle">${esc(d.label)}</text>`;
    })
    .join("");
  return `<svg viewBox="0 0 ${width} ${height}" role="img">
    <polyline class="office-line" points="${points(time, width, height, pad).join(" ")}" fill="none" stroke="#9fe870" stroke-width="2"></polyline>
    <polyline class="office-line" points="${points(bounce, width, height, pad).join(" ")}" fill="none" stroke="#75d646" stroke-width="2"></polyline>
    <polyline class="office-line" points="${points(exit, width, height, pad).join(" ")}" fill="none" stroke="#163300" stroke-width="1.8"></polyline>
    ${ticks}
  </svg>`;
};

const pieChart = (items) => {
  const total = items.reduce((sum, item) => sum + item.count, 0);
  if (!total) return "";
  const cx = 70;
  const cy = 70;
  const r = 58;
  let angle = -Math.PI / 2;
  return `<svg viewBox="0 0 140 140" role="img">${items
    .map((item, index) => {
      const slice = (item.count / total) * Math.PI * 2;
      const start = angle;
      const end = angle + slice;
      angle = end;
      const x1 = cx + r * Math.cos(start);
      const y1 = cy + r * Math.sin(start);
      const x2 = cx + r * Math.cos(end);
      const y2 = cy + r * Math.sin(end);
      const large = slice > Math.PI ? 1 : 0;
      const d =
        slice >= Math.PI * 2 - 0.001
          ? `M ${cx - r} ${cy} a ${r} ${r} 0 1 0 ${r * 2} 0 a ${r} ${r} 0 1 0 ${-r * 2} 0`
          : `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
      return `<path class="office-slice" style="--n:${index}" d="${d}" fill="${COLORS[index % COLORS.length]}"></path>`;
    })
    .join("")}</svg>`;
};

const countryMap = (items) => worldMapSvg(items);

const ranks = (items, empty) => {
  if (!items.length) return `<p class="office-empty">${esc(empty)}</p>`;
  const max = Math.max(1, ...items.map((item) => item.count));
  return items
    .map((item, index) => {
      const width = Math.max(6, Math.round((item.count / max) * 100));
      return `<div class="office-rank" style="--n:${index}">
        <span>${index + 1}. ${esc(labelOf(item.name))}</span>
        <b>${item.count}</b>
        <i style="width:${width}%; background:${COLORS[index % COLORS.length]}"></i>
      </div>`;
    })
    .join("");
};

const legend = (items, empty) => {
  if (!items.length) return `<li>${esc(empty)}</li>`;
  const total = items.reduce((sum, item) => sum + item.count, 0) || 1;
  return items
    .map((item, index) => {
      const pct = Math.round((item.count / total) * 100);
      return `<li><span style="background:${COLORS[index % COLORS.length]}"></span>${esc(labelOf(item.name))} (${pct}%)</li>`;
    })
    .join("");
};

const peopleRows = (items, empty) => {
  if (!items.length) return `<tr><td colspan="3">${esc(empty)}</td></tr>`;
  return items
    .map(
      (item) => `<tr>
        <th>${esc(shortVisitor(item.visitor))}</th>
        <td>${item.clicks}</td>
        <td>${esc(item.path)}<br><small>${esc(when(item.last))}</small></td>
      </tr>`
    )
    .join("");
};

const recentRows = (items, empty) => {
  if (!items.length) return `<li>${esc(empty)}</li>`;
  const t = copy();
  return items
    .map((item, index) => {
      const kind = item.type === "click" ? t.click : item.type === "beat" ? t.beat : t.view;
      const extra = item.type === "click" ? item.label : item.path;
      return `<li style="--n:${index}"><strong>${esc(kind)}</strong> ${esc(extra)} <small>${esc(shortVisitor(item.visitor))} · ${esc(when(item.t))}</small></li>`;
    })
    .join("");
};

const initOfficeTabs = (root) => {
  const tabs = [...root.querySelectorAll("[data-office-tab]")];
  const switcher = root.querySelector("[data-office-switch]");
  const panels = [...root.querySelectorAll("[data-office-panel]")];
  const limited = [...root.querySelectorAll("[data-office-only]")];
  const tabRail = root.querySelector("[data-office-tabs]");
  const bubble = root.querySelector("[data-office-bubble]");
  let bubbleTimer = 0;

  const placeBubble = (instant) => {
    if (!tabRail || !bubble) return;
    const active = tabs.find((tab) => tab.getAttribute("aria-current") === "page" && !tab.hidden);
    if (!active) {
      bubble.style.opacity = "0";
      return;
    }
    const rail = tabRail.getBoundingClientRect();
    const box = active.getBoundingClientRect();
    const x = box.left - rail.left + tabRail.scrollLeft;
    const y = box.top - rail.top + tabRail.scrollTop;
    const prevX = Number(bubble.dataset.x ?? x);
    const prevY = Number(bubble.dataset.y ?? y);
    const dx = x - prevX;
    const dy = y - prevY;
    const first = bubble.dataset.x == null;
    const dist = Math.hypot(dx, dy);
    const stretch = Math.min(1.42, 1 + dist / 240);
    const vertical = Math.abs(dy) >= Math.abs(dx);
    bubble.style.opacity = "1";
    bubble.style.setProperty("--x", `${x}px`);
    bubble.style.setProperty("--y", `${y}px`);
    bubble.style.setProperty("--w", `${box.width}px`);
    bubble.style.setProperty("--h", `${box.height}px`);
    bubble.style.setProperty("--sx", vertical ? String(1 / Math.sqrt(stretch)) : String(stretch));
    bubble.style.setProperty("--sy", vertical ? String(stretch) : String(1 / Math.sqrt(stretch)));
    bubble.dataset.x = String(x);
    bubble.dataset.y = String(y);
    if (instant || first || reducedMotion() || dist < 2) {
      bubble.classList.remove("is-morphing");
      bubble.style.setProperty("--sx", "1");
      bubble.style.setProperty("--sy", "1");
      return;
    }
    bubble.classList.add("is-morphing");
    window.clearTimeout(bubbleTimer);
    bubbleTimer = window.setTimeout(() => {
      bubble.style.setProperty("--sx", "1");
      bubble.style.setProperty("--sy", "1");
      bubble.classList.remove("is-morphing");
    }, 520);
  };

  const apply = (id) => {
    const next = panels.some((panel) => panel.dataset.officePanel === id) ? id : "analytics";
    panels.forEach((panel) => {
      panel.hidden = panel.dataset.officePanel !== next;
    });
    tabs.forEach((tab) => {
      if (tab.dataset.officeTab === next) tab.setAttribute("aria-current", "page");
      else tab.removeAttribute("aria-current");
    });
    if (switcher) switcher.value = next;
    limited.forEach((node) => {
      node.hidden = node.dataset.officeOnly !== next;
    });
    if (location.hash.replace("#", "") !== next) {
      history.replaceState(null, "", `#${next}`);
    }
    const titleKey =
      next === "news"
        ? "admin.title"
        : next === "people"
          ? "office.people"
          : next === "compose"
            ? "admin.new"
            : next === "faculty"
              ? "admin.faculty"
              : next === "alumni"
                ? "office.tabAlumni"
              : next === "access"
                ? "access.kicker"
                : next === "listings"
                  ? "office.tabListings"
                  : "dash.title";
    document.body.setAttribute("data-title-key", titleKey);
    const shown = panels.find((panel) => panel.dataset.officePanel === next);
    kickPanel(shown);
    requestAnimationFrame(() => placeBubble(false));
  };
  tabs.forEach((tab) =>
    tab.addEventListener("click", () => {
      apply(tab.dataset.officeTab);
      if (tab.dataset.officeTab === "compose") root.querySelector("[data-admin-new]")?.click();
    })
  );
  switcher?.addEventListener("change", () => {
    apply(switcher.value);
    if (switcher.value === "compose") root.querySelector("[data-admin-new]")?.click();
  });
  window.addEventListener("immba:office-go", (event) => apply(event.detail));
  window.addEventListener("hashchange", () => apply(location.hash.replace("#", "")));
  window.addEventListener("resize", () => placeBubble(true));
  window.addEventListener("immba:lang", () => requestAnimationFrame(() => placeBubble(true)));
  apply(location.hash.replace("#", "") || "analytics");
  requestAnimationFrame(() => placeBubble(true));
};

let booted = false;

export const initAdminDash = () => {
  const root = document.querySelector("[data-office], [data-admin-dash]");
  if (!root || booted) return;
  booted = true;
  root.querySelectorAll(".office-grid > .office-widget").forEach((card, index) => {
    card.style.setProperty("--i", String(index));
  });
  initOfficeTabs(root);
  const range = root.querySelector("[data-dash-range]");
  const live = root.querySelector("[data-dash-live]");
  const views = root.querySelector("[data-dash-views]");
  const visits = root.querySelector("[data-dash-visits]");
  const visitors = root.querySelector("[data-dash-visitors]");
  const chart = root.querySelector("[data-dash-chart]");
  const viewsChart = root.querySelector("[data-dash-views-chart]");
  const visitsChart = root.querySelector("[data-dash-visits-chart]");
  const visitorsChart = root.querySelector("[data-dash-visitors-chart]");
  const bounceChart = root.querySelector("[data-dash-bounce-chart]");
  const timeChart = root.querySelector("[data-dash-time-chart]");
  const exitChart = root.querySelector("[data-dash-exit-chart]");
  const map = root.querySelector("[data-dash-map]");
  const rangeLabels = [...root.querySelectorAll("[data-dash-range-label]")];
  const pages = root.querySelector("[data-dash-pages]");
  const targets = root.querySelector("[data-dash-targets]");
  const people = root.querySelector("[data-dash-people]");
  const recentNodes = [...root.querySelectorAll("[data-dash-recent]")];
  const note = root.querySelector("[data-dash-empty]");
  const sources = root.querySelector("[data-dash-sources]");
  const sourceLegend = root.querySelector("[data-dash-source-legend]");
  const os = root.querySelector("[data-dash-os]");
  const countries = root.querySelector("[data-dash-countries]");
  const engines = root.querySelector("[data-dash-engines]");
  const time = root.querySelector("[data-dash-time]");
  const bounce = root.querySelector("[data-dash-bounce]");
  const exit = root.querySelector("[data-dash-exit]");
  const content = root.querySelector("[data-dash-content]");
  const clicks = root.querySelector("[data-dash-clicks]");
  const clicksChart = root.querySelector("[data-dash-clicks-chart]");
  const devices = root.querySelector("[data-dash-devices]");
  const deviceLegend = root.querySelector("[data-dash-device-legend]");
  const langs = root.querySelector("[data-dash-langs]");
  const langLegend = root.querySelector("[data-dash-lang-legend]");
  const returning = root.querySelector("[data-dash-returning]");
  const returningChart = root.querySelector("[data-dash-returning-chart]");
  const eventsLogged = root.querySelector("[data-dash-events]");
  const referrers = root.querySelector("[data-dash-referrers]");

  const paint = async () => {
    try {
      const data = await summarizeAnalytics(range?.value || "7d");
      const empty = copy().empty;
      const none = copy().none;
      tweenTo(live, data.live, fmt);
      tweenTo(views, data.views, fmt);
      tweenTo(visits, data.visits, fmt);
      tweenTo(visitors, data.visitors, fmt);
      tweenTo(clicks, data.clicks, fmt);
      tweenTo(eventsLogged, data.events, fmt);
      tweenTo(returning, data.returning, fmt);
      tweenTo(time, Math.round(data.avgTime), (value) => clock(value));
      tweenTo(bounce, Math.round(data.bounceRate), (value) => `${Math.round(value)}%`);
      tweenTo(exit, Math.round(data.exitRate), (value) => `${Math.round(value)}%`);
      if (data.live > 0) live?.classList.add("is-live");
      else live?.classList.remove("is-live");
      const rangeText = range?.selectedOptions?.[0]?.textContent || "";
      rangeLabels.forEach((node) => {
        node.textContent = rangeText;
      });
      writeHtml(chart, areaChart(data.days));
      writeHtml(viewsChart, barChart(data.days, "count", "#0071e3"));
      writeHtml(visitsChart, barChart(data.days, "visits", "#ff3b30"));
      writeHtml(clicksChart, barChart(data.days, "clicks", "#ff3b30"));
      writeHtml(visitorsChart, spark(data.days, "visitors", "#163300"));
      writeHtml(bounceChart, spark(data.days, "bounce", "#ff3b30"));
      writeHtml(timeChart, spark(data.days, "time", "#0071e3"));
      writeHtml(exitChart, spark(data.days, "exit", "#75d646"));
      writeHtml(returningChart, spark(data.days, "visitors", "#9fe870"));
      writeHtml(content, lineChart(data.days));
      writeHtml(map, countryMap(data.countries));
      writeHtml(pages, ranks(data.pages, none));
      writeHtml(targets, ranks(data.targets, none));
      writeHtml(people, peopleRows(data.people, none));
      recentNodes.forEach((node) => writeHtml(node, recentRows(data.recent, none)));
      writeHtml(sources, pieChart(data.sources));
      writeHtml(sourceLegend, legend(data.sources, none));
      writeHtml(devices, pieChart(data.devices));
      writeHtml(deviceLegend, legend(data.devices, none));
      writeHtml(langs, pieChart(data.langs));
      writeHtml(langLegend, legend(data.langs, none));
      writeHtml(os, ranks(data.os, none));
      writeHtml(countries, ranks(data.countries, none));
      writeHtml(engines, ranks(data.engines, none));
      writeHtml(referrers, ranks(data.referrers, none));
      if (note) note.hidden = data.views + data.clicks + data.events > 0;
      if (note && data.views + data.clicks === 0) note.textContent = empty;
    } catch (error) {
      console.error("dashboard paint failed", error);
    }
  };

  range?.addEventListener("change", paint);
  root.querySelector("[data-dash-clear]")?.addEventListener("click", async () => {
    if (!window.confirm(currentLang() === "zh" ? "清除這個瀏覽器的流量紀錄？" : "Clear traffic recorded in this browser?")) {
      return;
    }
    await clearAnalytics();
    paint();
  });
  window.addEventListener("immba:lang", paint);
  paint();
  window.setInterval(paint, 8000);
};

initAdminDash();
