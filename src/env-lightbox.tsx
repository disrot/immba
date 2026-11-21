import { createRoot, type Root } from "react-dom/client";
import LightboxGrid, {
  type LightboxImage,
} from "@/components/kokonutui/lightbox-grid";
import "./kokonut.css?v=kit2";

const host = document.querySelector<HTMLElement>("[data-lightbox-host]");

const readImages = (): LightboxImage[] =>
  [...document.querySelectorAll<HTMLElement>("[data-lightbox-sources] figure")].map((figure) => {
    const image = figure.querySelector("img");
    const caption = figure.querySelector("figcaption")?.textContent?.trim() || "";
    return {
      src: image?.getAttribute("src") || "",
      alt: caption || image?.alt || "Learning environment",
      width: Number(image?.getAttribute("width")) || 1200,
      height: Number(image?.getAttribute("height")) || 800,
      caption,
    };
  }).filter((image) => image.src);

if (host && document.querySelector("[data-lightbox-sources]")) {
  let root: Root | null = null;
  const paint = () => {
    root?.unmount();
    root = createRoot(host);
    root.render(<LightboxGrid className="max-w-none" images={readImages()} />);
  };
  paint();
  window.addEventListener("immba:lang", paint);
}
