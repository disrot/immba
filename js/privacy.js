export const trackingAllowed = ({ optOut = false, dnt = "0", gpc = false } = {}) =>
  !optOut && dnt !== "1" && gpc !== true;

export const sanitizeEvent = (event = {}) => {
  const path = String(event.path || "index.html").split("?")[0].split("#")[0].replace(/^.*\//, "").slice(0, 120);
  return {
    path: path || "index.html",
    event_type: event.event_type === "beat" ? "beat" : "view",
    referrer_host: String(event.referrer_host || "").replace(/[^a-zA-Z0-9.-]/g, "").slice(0, 120),
    lang: event.lang === "zh" ? "zh" : "en",
    device: ["Mobile", "Tablet", "Desktop"].includes(event.device) ? event.device : "Desktop",
    os_family: String(event.os_family || "").replace(/[^A-Za-z]/g, "").slice(0, 20),
    country: String(event.country || "").replace(/[^A-Za-z ]/g, "").slice(0, 40),
    visitor_key: String(event.visitor_key || "").replace(/[^a-zA-Z0-9-]/g, "").slice(0, 80),
  };
};
