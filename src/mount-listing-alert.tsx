import { useEffect, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import InlineAlert, { type AlertCheck, type AlertWords } from "@/components/kokonutui/inline-alert";
import "./kokonut.css?v=lab2";

export type AlertView = { unmount: () => void };

const wordsFor = (zh: boolean): AlertWords => ({
  blocked: zh ? "刊登還缺一些資料" : "This listing still needs a few details",
  blockedDetail: (failed, total) =>
    zh ? `${total} 項裡有 ${failed} 項還沒通過` : `${failed} of ${total} checks still need a fix`,
  running: zh ? "再檢查一次" : "Checking again",
  runningDetail: (left) => (zh ? `還有 ${left} 項` : `${left} still to check`),
  ready: zh ? "可以刊登了" : "Ready to post",
  readyDetail: () => (zh ? "每一項都通過了" : "Every check passed"),
  retry: zh ? "再檢查一次" : "Check again",
  hide: zh ? "收合" : "Hide checks",
  show: zh ? "展開" : "Show checks",
  failed: zh ? "未通過" : "Failed",
  runningStatus: zh ? "檢查中" : "Running",
  passed: zh ? "通過" : "Passed",
});

export const mountListingAlert = (host: HTMLElement, getChecks: () => AlertCheck[]): AlertView => {
  const root: Root = createRoot(host);
  const View = () => {
    const [zh, setZh] = useState(document.body?.dataset.lang === "zh");
    const [checks, setChecks] = useState(getChecks);
    useEffect(() => {
      const sync = () => setChecks(getChecks());
      const lang = () => {
        setZh(document.body?.dataset.lang === "zh");
        setChecks(getChecks());
      };
      window.addEventListener("immba:listing-checks", sync);
      window.addEventListener("immba:lang", lang);
      return () => {
        window.removeEventListener("immba:listing-checks", sync);
        window.removeEventListener("immba:lang", lang);
      };
    }, []);
    return (
      <InlineAlert
        checks={checks}
        className="max-w-none"
        onRecheck={getChecks}
        passedAction={null}
        retryMs={420}
        target={zh ? "這則刊登" : "this listing"}
        words={wordsFor(zh)}
      />
    );
  };
  root.render(<View />);
  return { unmount: () => root.unmount() };
};
