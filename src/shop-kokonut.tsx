import { createRoot } from "react-dom/client";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { BookOpen, ShoppingBag, Tag } from "lucide-react";
import ActionSearchBar, {
  type CommandItem,
} from "@/components/kokonutui/action-search-bar";
import BackgroundPaths from "@/components/kokonutui/background-paths";
import CommandButton from "@/components/kokonutui/command-button";
import {
  Toaster,
  usePromiseToast,
  type PromiseToaster,
} from "@/components/kokonutui/promise-toast";
import {
  StatusIsland,
  type IslandTask,
} from "@/components/kokonutui/status-island";
import EmptyState from "@/components/kokonutui/empty-state";
import TypewriterTitle from "@/components/kokonutui/type-writer";
import { addBagLine, readBag, removeBagLine } from "../js/bag-store.js?v=lab4";
import { shelfSearch } from "../js/marketplace.js?v=bump1";
import { HOLD_MS } from "../js/trade.js?v=lab4";
import "./kokonut.css?v=lab2";

type ShelfHit = {
  id: string;
  title: string;
  course?: string;
  professor?: string;
  isbn?: string;
  price?: number;
};

type BagRow = {
  listing_id?: string;
  title?: string;
  quantity?: number;
  unit_amount?: number;
  image?: string;
  onHand?: number;
  sellerId?: string;
  sellerName?: string;
  generated?: boolean;
  deliveryOffered?: boolean;
  bumped?: boolean;
  holdUntil?: number;
};

type ToastDetail = {
  message?: string;
  title?: string;
  undoId?: string;
  previous?: BagRow | null;
  loading?: string;
  undoLoading?: string;
  undone?: string;
  error?: boolean;
};

const isZh = () => document.body?.dataset.lang === "zh";

const mount = (host: Element | null, node: ReactNode) => {
  if (!(host instanceof HTMLElement) || host.dataset.kokonut === "1") return;
  host.dataset.kokonut = "1";
  createRoot(host).render(node);
};

const ShelfPaths = () => (
  <BackgroundPaths
    angle={-6}
    className="h-full min-h-0 bg-transparent text-[#163300] dark:bg-transparent dark:text-[#163300]"
    count={28}
    passthrough
    speed={0.4}
    spread={0.55}
  >
    {null}
  </BackgroundPaths>
);

const LOOKING = {
  en: ["Onboarding Pack", "Workbooks", "Textbook", "Slide Decks"],
  zh: ["新生包", "練習冊", "教科書", "簡報"],
};

const HeroLede = () => {
  const [zh, setZh] = useState(isZh);
  useEffect(() => {
    const sync = () => setZh(isZh());
    window.addEventListener("immba:lang", sync);
    return () => window.removeEventListener("immba:lang", sync);
  }, []);
  const words = zh ? LOOKING.zh : LOOKING.en;
  return (
    <span className="shop-looking">
      <span>{zh ? "你在找" : "Are you looking for"}</span>
      <TypewriterTitle
        as="span"
        autoLoop
        className="shop-type"
        deleteSpeed={36}
        key={zh ? "zh" : "en"}
        loopDelay={500}
        pauseBeforeDelete={1400}
        seed={24}
        sequences={words.map((text) => ({ text, deleteAfter: true }))}
        textClassName="shop-type-words"
        typingSpeed={72}
      />
    </span>
  );
};

const catalog = (zh: boolean): CommandItem[] => {
  const books = (shelfSearch("", 48) as ShelfHit[]).map((item) => ({
    id: `book-${item.id}`,
    label: item.course ? `${item.course} · ${item.title}` : item.title,
    group: zh ? "書架" : "Shelf",
    keywords: [item.professor, item.isbn, item.price ? `NT$${item.price}` : ""]
      .filter(Boolean)
      .map(String),
    href: `listing.html?id=${encodeURIComponent(item.id)}`,
    icon: <BookOpen className="size-4" />,
  }));
  const go: CommandItem[] = [
    {
      id: "desk",
      label: zh ? "賣方書桌" : "Seller desk",
      group: zh ? "前往" : "Go",
      href: "market-account.html",
      icon: <Tag className="size-4" />,
    },
    {
      id: "list",
      label: zh ? "刊登教材" : "List a textbook",
      group: zh ? "前往" : "Go",
      href: "list.html",
      icon: <BookOpen className="size-4" />,
    },
    {
      id: "bag",
      label: zh ? "查看袋子" : "View bag",
      group: zh ? "前往" : "Go",
      href: "cart.html",
      icon: <ShoppingBag className="size-4" />,
    },
  ];
  return [...go, ...books];
};

const ShopSearch = () => {
  const [open, setOpen] = useState(false);
  const [zh, setZh] = useState(isZh);
  useEffect(() => {
    const sync = () => setZh(isZh());
    window.addEventListener("immba:lang", sync);
    return () => window.removeEventListener("immba:lang", sync);
  }, []);
  const items = useMemo(() => catalog(Boolean(zh)), [zh, open]);
  return (
    <>
      <CommandButton
        className="shop-search-trigger w-full max-w-none min-w-0 justify-between border-[#e6e4dd] bg-white font-normal text-[#5c665b] shadow-none hover:bg-[#f8f7f4]"
        onClick={() => setOpen((value) => !value)}
        shortcut="mod+k"
        type="button"
      >
        <span className="shop-search-label truncate">
          {zh
            ? "搜尋書名、課程代碼、老師或 ISBN"
            : "Search title, course code, professor, or ISBN"}
        </span>
      </CommandButton>
      {open
        ? createPortal(
            <button
              aria-label={zh ? "關閉搜尋" : "Close search"}
              className="fixed inset-0 z-[70] cursor-default bg-[#141a14]/25"
              onClick={() => setOpen(false)}
              type="button"
            />,
            document.body
          )
        : null}
      {createPortal(
        <ActionSearchBar
          className={
            open
              ? "fixed top-28 left-1/2 z-[80] h-auto w-[min(40rem,calc(100%-2rem))] max-w-none -translate-x-1/2"
              : "hidden"
          }
          defaultRecent={[]}
          items={items}
          label={zh ? "搜尋書架" : "Search the shelf"}
          onOpenChange={setOpen}
          onSelect={(item) => {
            if (item.href) location.href = item.href;
          }}
          open={open}
          placeholder={zh ? "搜尋書名、課程或 ISBN" : "Search title, course, or ISBN"}
          shortcut={false}
        />,
        document.body
      )}
    </>
  );
};

const ShelfEmpty = () => {
  const [zh, setZh] = useState(isZh);
  useEffect(() => {
    const onLang = () => setZh(isZh());
    window.addEventListener("immba:lang", onLang);
    return () => window.removeEventListener("immba:lang", onLang);
  }, []);
  return (
    <EmptyState
      actionLabel={zh ? "清除篩選" : "Clear filters"}
      className="min-h-[260px] max-w-none border-[#e6e4dd] bg-white shadow-none"
      description={
        zh
          ? "放寬篩選或清掉搜尋，這一屆的書就會回來。"
          : "Widen the filters or clear the search, and this cohort’s books come back."
      }
      heading={zh ? "書架" : "Shelf"}
      onAction={() => window.dispatchEvent(new Event("immba:clear-shelf"))}
      title={zh ? "沒有符合的教材" : "No books match"}
    />
  );
};

const showToast = (show: PromiseToaster["show"], detail: ToastDetail) => {
  const message = detail.message || "";
  if (!message) return;
  if (detail.error) {
    show(
      async () => {
        throw new Error(message);
      },
      { loading: message, success: message, error: message }
    );
    return;
  }
  const previous = detail.previous;
  show(async () => detail.title || message, {
    loading: detail.loading || message,
    success: detail.title ? [message, detail.title] : message,
    error: message,
    undo: detail.undoId
      ? {
          run: async () => {
            const id = detail.undoId;
            if (!id) return;
            removeBagLine(id);
            if (!previous) return;
            addBagLine({
              id,
              title: previous.title,
              unit: previous.unit_amount,
              image: previous.image,
              onHand: previous.onHand,
              sellerId: previous.sellerId,
              sellerEmail: previous.sellerEmail,
              sellerUserId: previous.sellerUserId,
              posted: previous.generated === false,
              sellerName: previous.sellerName,
              generated: previous.generated,
              delivery: previous.deliveryOffered,
              bumped: previous.bumped,
              qty: previous.quantity,
            });
          },
          loading: detail.undoLoading || "Taking it out",
          success: detail.undone || "Removed from bag",
        }
      : undefined,
  });
};

const ShopFeedback = () => {
  const toaster = usePromiseToast();
  const show = toaster.show;
  const [tasks, setTasks] = useState<IslandTask[]>([]);

  useEffect(() => {
    const onToast = (event: Event) => {
      showToast(show, ((event as CustomEvent<ToastDetail>).detail || {}) as ToastDetail);
    };
    window.addEventListener("immba:toast", onToast);
    return () => window.removeEventListener("immba:toast", onToast);
  }, [show]);

  useEffect(() => {
    const paint = () => {
      const zh = isZh();
      const rows = (readBag() as BagRow[]).filter(
        (row) => !row.holdUntil || Number(row.holdUntil) > Date.now()
      );
      if (!rows.length) {
        setTasks([]);
        return;
      }
      const holds = rows
        .map((row) => Number(row.holdUntil) || 0)
        .filter((time) => time > Date.now());
      const soonest = holds.length ? Math.min(...holds) : 0;
      const remain = soonest ? soonest - Date.now() : 0;
      const secs = Math.max(0, Math.ceil(remain / 1000));
      const clock = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
      const count = rows.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0);
      setTasks([
        {
          id: "bag-hold",
          label: zh
            ? `保留 ${count} 件`
            : `Holding ${count} ${count === 1 ? "book" : "books"}`,
          detail: soonest ? clock : undefined,
          status: "running",
          progress: soonest
            ? Math.min(1, Math.max(0, 1 - remain / HOLD_MS))
            : undefined,
          action: {
            label: zh ? "查看袋子" : "View bag",
            onClick: () => window.dispatchEvent(new Event("immba:bag-open")),
          },
        },
      ]);
    };
    paint();
    const timer = window.setInterval(paint, 1000);
    window.addEventListener("immba:bag", paint);
    window.addEventListener("immba:lang", paint);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("immba:bag", paint);
      window.removeEventListener("immba:lang", paint);
    };
  }, []);

  return (
    <>
      <div className="pointer-events-none fixed bottom-6 left-4 z-[80] w-[min(22rem,calc(100vw-6rem))]">
        <Toaster
          className="pointer-events-auto h-0 overflow-visible"
          toaster={toaster}
        />
      </div>
      <div className="shop-hold">
        <StatusIsland tasks={tasks} />
      </div>
    </>
  );
};

export const initShopKokonut = () => {
  if (!document.querySelector(".shop-atelier")) return;
  mount(document.querySelector("[data-shop-paths]"), <ShelfPaths />);
  mount(document.querySelector("[data-shop-marker]"), <HeroLede />);
  mount(document.querySelector("[data-shop-search-host]"), <ShopSearch />);
  mount(document.querySelector("[data-shop-empty]"), <ShelfEmpty />);
  if (!document.querySelector("[data-shop-feedback]")) {
    const host = document.createElement("div");
    host.setAttribute("data-shop-feedback", "");
    document.body.append(host);
    createRoot(host).render(<ShopFeedback />);
  }
};
