import { createRoot, type Root } from "react-dom/client";
import DynamicText, {
  type Greeting,
} from "@/components/kokonutui/dynamic-text";
import "./kokonut.css?v=dynamic1";

const WORDS: Record<string, Greeting[]> = {
  en: [
    { text: "Global managers", lang: "en" },
    { text: "English-taught", lang: "en" },
    { text: "Taipei campus", lang: "en" },
  ],
  zh: [
    { text: "全球經理人", lang: "zh-Hant" },
    { text: "全英語授課", lang: "zh-Hant" },
    { text: "台北校園", lang: "zh-Hant" },
  ],
};

const host = document.querySelector("[data-hero-dynamic]");
if (host) {
  const root: Root = createRoot(host);
  const paint = () => {
    const lang = document.body?.dataset.lang === "zh" ? "zh" : "en";
    root.render(
      <DynamicText
        className="hero-dynamic"
        interval={2400}
        mode="morph"
        words={WORDS[lang]}
      />
    );
  };
  paint();
  window.addEventListener("immba:lang", paint);
}
