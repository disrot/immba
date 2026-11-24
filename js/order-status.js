import { statusText } from "./trade.js?v=lab4";

const esc = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const ICONS = {
  placed: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4.5h5.2L17 8.2V19.5H8z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M13.2 4.6V8.2H17" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>`,
  waiting_payment: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.8" y="6" width="16.4" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M3.8 10h16.4" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>`,
  payment_confirmed: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7.2" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M8.4 12.2 11 14.7l4.8-5.2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  ready_to_ship: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.6 8.4 12 4.8l7.4 3.6v7.2L12 19.2 4.6 15.6z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M4.6 8.4 12 12l7.4-3.6M12 12v7.2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>`,
  shipped: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 15.2V8.8h8.2v6.4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M11.7 11.2h3.4l2.4 2.6v1.4H11.7" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><circle cx="7" cy="16.6" r="1.35" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="15.4" cy="16.6" r="1.35" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>`,
  completed: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M7 5.4h9.2L14 8.6l2.2 3.2H7" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>`,
};

const STEPS = ["placed", "waiting_payment", "payment_confirmed", "ready_to_ship", "shipped", "completed"];

export const statusRail = (order, zh) => {
  if (!order || order.status === "expired") return "";
  const items = STEPS.map((status) => {
    const hit = (order.history || []).some((row) => row.status === status) || order.status === status;
    const label = statusText(status, !!zh);
    const current = order.status === status;
    return `<li class="${hit ? "is-done" : ""}${current ? " is-now" : ""}">
      <button type="button" class="trade-step" aria-label="${esc(label)}"${current ? ' aria-current="step"' : ""}>
        ${ICONS[status]}
        <span class="trade-step-label"><span>${esc(label)}</span></span>
      </button>
    </li>`;
  }).join("");
  return `<ol class="trade-life">${items}</ol>`;
};

document.addEventListener("click", (event) => {
  const button = event.target.closest?.(".trade-step");
  document.querySelectorAll(".trade-step.is-open").forEach((item) => {
    if (item !== button) item.classList.remove("is-open");
  });
  button?.classList.toggle("is-open");
});
