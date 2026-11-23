import { createRoot } from "react-dom/client";
import { useEffect, useState } from "react";
import {
  BarChart3,
  ClipboardList,
  Newspaper,
  Receipt,
  Search,
  ShoppingBag,
  Store,
  Tag,
  Users,
} from "lucide-react";
import { FluidMenu, type FluidMenuItem } from "@/components/ui/fluid-menu";
import { allowedOfficePages } from "../js/auth.js?v=login1";
import { setMarketMode } from "../js/trade.js?v=hold4";
import "./kokonut.css?v=fluid2";

const pageName = () => location.pathname.split("/").pop() || "";
const langOf = () => (document.body?.dataset.lang === "zh" ? "zh" : "en");

const shopItems = (lang: "en" | "zh"): FluidMenuItem[] => {
  const zh = lang === "zh";
  const here = pageName();
  return [
    {
      id: "search",
      label: zh ? "搜尋" : "Search",
      icon: <Search size={22} strokeWidth={1.6} />,
      onSelect: () => document.querySelector<HTMLButtonElement>(".shop-search-trigger")?.click(),
    },
    {
      id: "bag",
      label: zh ? "袋子" : "Bag",
      icon: <ShoppingBag size={22} strokeWidth={1.6} />,
      current: here === "cart.html",
      onSelect: () => window.dispatchEvent(new CustomEvent("immba:bag-open")),
    },
    {
      id: "sell",
      label: zh ? "賣書" : "Sell",
      icon: <Tag size={22} strokeWidth={1.6} />,
      current: here === "list.html",
      onSelect: () => {
        location.href = "list.html";
      },
    },
    {
      id: "orders",
      label: zh ? "訂單" : "Orders",
      icon: <Receipt size={22} strokeWidth={1.6} />,
      current: here === "orders.html",
      onSelect: () => {
        location.href = "orders.html";
      },
    },
    {
      id: "desk",
      label: zh ? "書桌" : "Desk",
      icon: <Store size={22} strokeWidth={1.6} />,
      current: here === "market-account.html",
      onSelect: () => {
        setMarketMode("seller");
        if (here !== "market-account.html") location.href = "market-account.html";
      },
    },
  ];
};

const OFFICE = [
  { id: "analytics", en: "Analytics", zh: "分析", icon: <BarChart3 size={22} strokeWidth={1.6} /> },
  { id: "people", en: "People", zh: "訪客", icon: <Users size={22} strokeWidth={1.6} /> },
  { id: "listings", en: "Listings", zh: "刊登", icon: <Tag size={22} strokeWidth={1.6} /> },
  { id: "orders", en: "Orders", zh: "訂單", icon: <Receipt size={22} strokeWidth={1.6} /> },
  { id: "news", en: "News", zh: "公告", icon: <Newspaper size={22} strokeWidth={1.6} /> },
  { id: "workflows", en: "Workflows", zh: "申請", icon: <ClipboardList size={22} strokeWidth={1.6} /> },
];

const officeItems = (lang: "en" | "zh"): FluidMenuItem[] => {
  const allowed = allowedOfficePages();
  const current = location.hash.replace("#", "") || "analytics";
  return OFFICE.filter((item) => allowed.length === 0 || allowed.includes(item.id)).map((item) => ({
    id: item.id,
    label: lang === "zh" ? item.zh : item.en,
    icon: item.icon,
    current: current === item.id,
    onSelect: () => {
      window.dispatchEvent(new CustomEvent("immba:office-go", { detail: item.id }));
    },
  }));
};

function FluidMenuApp({ kind }: { kind: "shop" | "office" }) {
  const [lang, setLang] = useState(langOf);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const refresh = () => {
      setLang(langOf());
      setTick((value) => value + 1);
    };
    window.addEventListener("immba:lang", refresh);
    window.addEventListener("immba:access", refresh);
    window.addEventListener("hashchange", refresh);
    window.addEventListener("immba:office-go", refresh);
    return () => {
      window.removeEventListener("immba:lang", refresh);
      window.removeEventListener("immba:access", refresh);
      window.removeEventListener("hashchange", refresh);
      window.removeEventListener("immba:office-go", refresh);
    };
  }, []);

  const items = kind === "office" ? officeItems(lang) : shopItems(lang);
  return (
    <FluidMenu
      key={tick}
      items={items}
      openLabel={lang === "zh" ? "選單" : "Menu"}
      closeLabel={lang === "zh" ? "關閉" : "Close"}
    />
  );
}

export const initFluidMenu = () => {
  if (document.querySelector("[data-fluid-menu]")) return;
  const office = document.querySelector("[data-office]");
  const shop = document.querySelector(".shop-atelier");
  if (!office && !shop) return;
  const host = document.createElement("div");
  host.setAttribute("data-fluid-menu", "");
  document.body.append(host);
  createRoot(host).render(<FluidMenuApp kind={office ? "office" : "shop"} />);
};
