import { createRoot, type Root } from "react-dom/client";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
import "./kokonut.css?v=apply1";
import "./apply-hover.css";

const TEXT = { en: "Apply Now", zh: "立即申請" };

type Mount = {
  root: Root;
  href: string;
  target?: string;
  rel?: string;
  className: string;
};

const mounts: Mount[] = [];

const label = () =>
  document.body?.dataset.lang === "zh" || localStorage.getItem("immba-lang") === "zh"
    ? TEXT.zh
    : TEXT.en;

const paint = () => {
  const text = label();
  for (const mount of mounts) {
    mount.root.render(
      <InteractiveHoverButton
        className={mount.className}
        href={mount.href}
        rel={mount.rel}
        target={mount.target}
      >
        {text}
      </InteractiveHoverButton>
    );
  }
};

document.querySelectorAll('a.btn[data-i18n="cta.apply"]').forEach((node) => {
  if (!(node instanceof HTMLAnchorElement)) return;
  const host = document.createElement("span");
  host.className = "apply-hover-host";
  const className = [...node.classList]
    .filter((name) => name !== "btn-primary" && name !== "btn-secondary")
    .join(" ");
  const href = node.getAttribute("href") || node.href;
  const target = node.getAttribute("target") || undefined;
  const rel = node.getAttribute("rel") || undefined;
  node.replaceWith(host);
  mounts.push({ root: createRoot(host), href, target, rel, className });
});

if (mounts.length) {
  paint();
  window.addEventListener("immba:lang", paint);
}
