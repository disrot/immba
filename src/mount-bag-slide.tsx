import { createRoot, type Root } from "react-dom/client";
import SlideToConfirm from "@/components/kokonutui/slide-to-confirm";
import "./kokonut.css?v=lab2";

export type BagSlideCopy = {
  label: string;
  confirmingLabel: string;
  doneLabel: string;
  disabled?: boolean;
};

export type BagSlideView = {
  update: (copy: BagSlideCopy) => void;
  unmount: () => void;
};

export const mountBagSlide = (
  host: HTMLElement,
  copy: BagSlideCopy,
  onConfirm: () => Promise<unknown> | unknown
): BagSlideView => {
  const root: Root = createRoot(host);
  const draw = (next: BagSlideCopy) => {
    root.render(
      <SlideToConfirm
        className="max-w-none"
        confirmingLabel={next.confirmingLabel}
        disabled={Boolean(next.disabled)}
        doneLabel={next.doneLabel}
        label={next.label}
        onConfirm={onConfirm}
        resetAfter={null}
      />
    );
  };
  draw(copy);
  return {
    update: draw,
    unmount: () => root.unmount(),
  };
};
