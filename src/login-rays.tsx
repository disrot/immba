import { createRoot } from "react-dom/client";
import { LightRays } from "@/components/ui/light-rays";
import "./kokonut.css?v=rays1";
import "./login-rays.css";

const host = document.querySelector("[data-login-rays]");
if (host && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  createRoot(host).render(
    <LightRays
      blur={18}
      color="#7bc94a"
      count={6}
      length="88vh"
      speed={16}
    />
  );
}
