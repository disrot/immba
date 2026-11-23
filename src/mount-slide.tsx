import { createRoot, type Root } from "react-dom/client";
import SlideToConfirm from "@/components/kokonutui/slide-to-confirm";
import "./kokonut.css?v=lab2";

export type SlideView = { unmount: () => void };

export const mountSlides = (root: ParentNode): SlideView => {
  const views: Root[] = [];
  root.querySelectorAll("[data-slide-host]").forEach((node) => {
    if (!(node instanceof HTMLElement) || node.dataset.kokonut === "1") return;
    node.dataset.kokonut = "1";
    const orderId = node.dataset.orderId || "";
    const view = createRoot(node);
    views.push(view);
    view.render(
      <SlideToConfirm
        className="max-w-[280px]"
        confirmingLabel={node.dataset.slideBusy || "Confirming"}
        doneLabel={node.dataset.slideDone || "Done"}
        label={node.dataset.slideLabel || "Slide to confirm"}
        onConfirm={() =>
          new Promise((resolve) => {
            window.setTimeout(() => {
              document.dispatchEvent(new CustomEvent("immba:slide-confirm", { detail: orderId }));
              resolve(true);
            }, 420);
          })
        }
        resetAfter={null}
      />
    );
  });
  return { unmount: () => views.forEach((view) => view.unmount()) };
};
