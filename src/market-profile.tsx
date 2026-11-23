import { createRoot, type Root } from "react-dom/client";
import { BookOpen, ClipboardList, ShoppingBag } from "lucide-react";
import ProfileDropdown from "@/components/kokonutui/profile-dropdown";
import { currentProfile, isSellerAuthed, logoutAdmin } from "../js/auth.js?v=notice4";
import { marketMode } from "../js/trade.js?v=hold4";
import "./kokonut.css?v=profile1";
import "./market-profile.css";

const sellerFace = (email: string) => {
  try {
    const all = JSON.parse(localStorage.getItem("immba-seller-profile") || "{}") as Record<
      string,
      { name?: string; photo?: string }
    >;
    const row = all[email] || {};
    return {
      name: String(row.name || "").trim(),
      photo: String(row.photo || ""),
    };
  } catch {
    return { name: "", photo: "" };
  }
};

const host = document.querySelector("[data-market-profile]");

if (host) {
  let root: Root | null = null;
  let last = "";

  const paint = () => {
    const session = currentProfile();
    const signed = Boolean(isSellerAuthed() && session?.email);
    document.querySelectorAll("[data-shop-account], .shop-login").forEach((node) => {
      if (node instanceof HTMLElement) node.hidden = signed;
    });
    if (!signed) {
      last = "";
      root?.render(null);
      return;
    }
    const zh = document.body?.dataset.lang === "zh";
    const email = String(session.email);
    const saved = sellerFace(email);
    const name = saved.name || String(session.display_name || "").trim() || email.split("@")[0];
    const seller = marketMode() === "seller";
    const key = [name, email, saved.photo, zh ? "zh" : "en", seller ? "seller" : "buyer"].join("|");
    if (key === last) return;
    last = key;
    root ??= createRoot(host);
    root.render(
      <ProfileDropdown
        accounts={[
          {
            id: email,
            name,
            email,
            image: saved.photo || undefined,
            plan: seller ? (zh ? "賣方" : "Seller") : zh ? "買家" : "Buyer",
          },
        ]}
        className="market-profile"
        compact
        confirmHint={zh ? "，按住以確認" : ", press and hold to confirm"}
        holdHint={zh ? "按住" : "Hold"}
        keepHoldingHint={zh ? "繼續按住" : "Keep holding"}
        items={[
          {
            label: zh ? "賣方書桌" : "Seller desk",
            href: "market-account.html",
            icon: <BookOpen className="size-4" />,
          },
          {
            label: zh ? "訂單" : "Orders",
            href: "orders.html",
            icon: <ClipboardList className="size-4" />,
          },
          {
            label: zh ? "書包" : "Bag",
            href: "cart.html",
            icon: <ShoppingBag className="size-4" />,
          },
        ]}
        onSignOut={() => {
          logoutAdmin();
          location.href = "marketplace.html";
        }}
        showStatus={false}
        showTheme={false}
        signOutLabel={zh ? "登出" : "Sign out"}
      />
    );
  };

  paint();
  window.addEventListener("immba:lang", paint);
  window.addEventListener("immba:mode", paint);
  window.addEventListener("immba:seller-profile", paint);
}
