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

/** Raster-free portrait of the chosen face, stored as the seller photo. */
export const faceDataUrl = (value: AvatarValue) =>
  new Promise<string>((resolve) => {
    const holder = document.createElement("div");
    const root = createRoot(holder);
    root.render(<FaceArt face={createFace(avatarSeed(value.displayName, value.variant))} />);
    requestAnimationFrame(() => {
      const svg = holder.querySelector("svg");
      svg?.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      const xml = svg ? new XMLSerializer().serializeToString(svg) : "";
      root.unmount();
      resolve(xml ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}` : "");
    });
  });
