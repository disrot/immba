import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { useEffect, useState } from "react";
import { Dock, DockIcon } from "@/components/ui/dock";
import { allowedOfficePages, isSuperAdmin } from "../js/auth.js?v=login1";
import "./kokonut.css?v=dock1";
import "./office-dock.css";

const LABELS: Record<string, [string, string]> = {
  "office.analytics": ["Analytics", "分析"],
  "office.people": ["People", "訪客"],
  "access.kicker": ["Access", "權限"],
  "office.tabListings": ["Listings", "刊登"],
  "office.tabAlumni": ["Alumni", "校友"],
  "office.tabFaculty": ["Faculty", "師資"],
  "office.tabAudit": ["Audit", "稽核"],
  "office.tabNews": ["News", "公告"],
  "office.tabCompose": ["Compose", "撰寫"],
  "office.tabOrders": ["Orders", "訂單"],
  "office.tabWorkflows": ["Workflows", "申請"],
};

type TabItem = { id: string; i18n: string; svg: string };

const langOf = () => (document.body?.dataset.lang === "zh" ? "zh" : "en");
const currentOf = () => location.hash.replace("#", "") || "analytics";
const verticalOf = () => window.matchMedia("(min-width: 901px)").matches;

function OfficeDock({ items }: { items: TabItem[] }) {
  const [lang, setLang] = useState(langOf);
  const [allowed, setAllowed] = useState(() => allowedOfficePages());
  const [superAdmin, setSuperAdmin] = useState(() => isSuperAdmin());
  const [vertical, setVertical] = useState(verticalOf);
  const [current, setCurrent] = useState(currentOf);
  const [reduced, setReduced] = useState(() =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  useEffect(() => {
    const onLang = () => setLang(langOf());
    const onAccess = () => {
      setAllowed(allowedOfficePages());
      setSuperAdmin(isSuperAdmin());
    };
    const onGo = (event: Event) => {
      const id = (event as CustomEvent<string>).detail;
      if (id) setCurrent(id);
    };
    const wide = window.matchMedia("(min-width: 901px)");
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onWide = () => setVertical(wide.matches);
    const onMotion = () => setReduced(motion.matches);
    const select = document.querySelector("[data-office-switch]");
    const onSelect = () => {
      if (select instanceof HTMLSelectElement) setCurrent(select.value);
    };
    const onHash = () => setCurrent(currentOf());
    window.addEventListener("immba:lang", onLang);
    window.addEventListener("immba:access", onAccess);
    window.addEventListener("immba:office-go", onGo);
    window.addEventListener("hashchange", onHash);
    wide.addEventListener("change", onWide);
    motion.addEventListener("change", onMotion);
    select?.addEventListener("change", onSelect);
    return () => {
      window.removeEventListener("immba:lang", onLang);
      window.removeEventListener("immba:access", onAccess);
      window.removeEventListener("immba:office-go", onGo);
      window.removeEventListener("hashchange", onHash);
      wide.removeEventListener("change", onWide);
      motion.removeEventListener("change", onMotion);
      select?.removeEventListener("change", onSelect);
    };
  }, []);

  return (
    <Dock
      className="office-dock"
      direction="middle"
      disableMagnification={reduced}
      iconDistance={110}
      iconMagnification={58}
      iconSize={44}
      layout="scale"
      orientation={vertical ? "vertical" : "horizontal"}
    >
      {items.map((item) => {
        const pair = LABELS[item.i18n] || ["", ""];
        const label = lang === "zh" ? pair[1] : pair[0];
        return (
          <DockIcon className="office-dock-icon" key={item.id}>
            <button
              aria-current={current === item.id ? "page" : undefined}
              className="office-tab"
              data-office-tab={item.id}
              hidden={
                (item.id === "access" && !superAdmin) ||
                (allowed.length > 0 && !allowed.includes(item.id))
              }
              onClick={() => setCurrent(item.id)}
              type="button"
            >
              <span dangerouslySetInnerHTML={{ __html: item.svg }} />
              <span data-i18n={item.i18n}>{label}</span>
            </button>
          </DockIcon>
        );
      })}
    </Dock>
  );
}

const nav = document.querySelector("[data-office-tabs]");
if (nav) {
  const items = [...nav.querySelectorAll<HTMLButtonElement>("[data-office-tab]")].map((button) => ({
    id: button.dataset.officeTab || "",
    i18n: button.querySelector("[data-i18n]")?.getAttribute("data-i18n") || "",
    svg: button.querySelector("svg")?.outerHTML || "",
  }));
  nav.querySelectorAll("[data-office-tab]").forEach((button) => button.remove());
  const host = document.createElement("div");
  host.className = "office-dock-host";
  nav.appendChild(host);
  const root = createRoot(host);
  flushSync(() => {
    root.render(<OfficeDock items={items.filter((item) => item.id)} />);
  });
}
