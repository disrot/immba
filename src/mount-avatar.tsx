import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import AvatarPicker, {
  avatarSeed,
  createFace,
  FaceArt,
  type AvatarPickerProps,
  type AvatarValue,
} from "@/components/kokonutui/avatar-picker";
import "./kokonut.css?v=kit2";

export type AvatarView = { unmount: () => void };

export const mountAvatarPicker = (
  host: HTMLElement,
  props: AvatarPickerProps
): AvatarView => {
  const root: Root = createRoot(host);
  root.render(<AvatarPicker className="max-w-none" {...props} />);
  return { unmount: () => root.unmount() };
};

/** Portrait of the chosen face, stored as a small JPEG the shelf can show. */
export const faceDataUrl = (value: AvatarValue) =>
  new Promise<string>((resolve) => {
    const holder = document.createElement("div");
    holder.style.cssText = "position:fixed;left:0;top:0;width:160px;height:160px;opacity:0;pointer-events:none;";
    document.body.append(holder);
    const root = createRoot(holder);
    const finish = (url: string) => {
      root.unmount();
      holder.remove();
      resolve(url);
    };
    flushSync(() => {
      root.render(<FaceArt face={createFace(avatarSeed(value.displayName, value.variant))} />);
    });
    const svg = holder.querySelector("svg");
    if (!svg) {
      finish("");
      return;
    }
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svg.setAttribute("width", "160");
    svg.setAttribute("height", "160");
    const xml = new XMLSerializer().serializeToString(svg);
    const url = xml ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}` : "";
    if (!url) {
      finish("");
      return;
    }
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 160;
      canvas.height = 160;
      const ctx = canvas.getContext("2d");
      if (!ctx || !image.naturalWidth) {
        finish(url);
        return;
      }
      ctx.drawImage(image, 0, 0, 160, 160);
      finish(canvas.toDataURL("image/jpeg", 0.86));
    };
    image.onerror = () => finish(url);
    image.src = url;
  });
