import { createRoot } from "react-dom/client";
import { useLayoutEffect, useRef, useState } from "react";
import WidgetGrid, {
  type WidgetGridItem,
  type WidgetLayoutItem,
} from "@/components/kokonutui/bento-grid";
import "./kokonut.css";

const KEY = "bento";

const readLayout = (): WidgetLayoutItem[] | undefined => {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!Array.isArray(parsed)) return undefined;
    return parsed.filter(
      (item): item is WidgetLayoutItem =>
        Boolean(item) && typeof item.id === "string" && typeof item.span === "number"
    );
  } catch {
    return undefined;
  }
};

const Slot = ({ node }: { node: HTMLElement }) => {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const host = ref.current;
    if (!host) return;
    host.appendChild(node);
    return () => {
      if (node.parentElement === host) node.remove();
    };
  }, [node]);
  return <div className="office-bento-slot" ref={ref} />;
};

const grid = document.querySelector<HTMLElement>("[data-office-widgets]");
if (grid) {
  const cards = [...grid.querySelectorAll<HTMLElement>(":scope > .office-widget")];
  const titleOf = (card: HTMLElement, index: number) =>
    card.querySelector("h2")?.textContent?.trim() || `Widget ${index + 1}`;
  const mount = document.createElement("div");
  mount.className = "office-bento-root";
  grid.replaceWith(mount);

  const OfficeGrid = () => {
    const [titles, setTitles] = useState(() => cards.map(titleOf));
    useLayoutEffect(() => {
      const sync = () => setTitles(cards.map(titleOf));
      window.addEventListener("immba:lang", sync);
      return () => window.removeEventListener("immba:lang", sync);
    }, []);
    const items: WidgetGridItem[] = cards.map((card, index) => {
      const wide = card.classList.contains("office-c8") || card.classList.contains("office-span-2");
      return {
        id: card.querySelector("h2")?.getAttribute("data-i18n") || `card-${index}`,
        title: titles[index] || titleOf(card, index),
        defaultSpan: wide ? 4 : 2,
        render: () => <Slot node={card} />,
      };
    });
    return (
      <WidgetGrid
        className="max-w-none"
        defaultLayout={readLayout()}
        items={items}
        onLayoutChange={(layout) => localStorage.setItem(KEY, JSON.stringify(layout))}
        rowHeight={320}
      />
    );
  };

  createRoot(mount).render(<OfficeGrid />);
}
