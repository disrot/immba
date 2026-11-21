import { getAuthSession } from "./supabase.js?v=secure1";
import { buyerOrders, money, statusText, when } from "./trade.js?v=hold4";
import { odo } from "./odometer.js?v=odo3";

const root = document.querySelector("[data-orders]");
const zh = () => document.body?.dataset.lang === "zh";

const esc = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const stepIcon = {
  placed: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4.5h5.2L17 8.2V19.5H8z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M13.2 4.6V8.2H17" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>`,
  waiting_payment: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.8" y="6" width="16.4" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M3.8 10h16.4" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>`,
  payment_confirmed: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7.2" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M8.4 12.2 11 14.7l4.8-5.2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  ready_to_ship: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.6 8.4 12 4.8l7.4 3.6v7.2L12 19.2 4.6 15.6z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M4.6 8.4 12 12l7.4-3.6M12 12v7.2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>`,
  shipped: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 15.2V8.8h8.2v6.4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M11.7 11.2h3.4l2.4 2.6v1.4H11.7" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><circle cx="7" cy="16.6" r="1.35" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="15.4" cy="16.6" r="1.35" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>`,
  completed: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M7 5.4h9.2L14 8.6l2.2 3.2H7" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>`,
};

const timeline = (order) =>
  ["placed", "waiting_payment", "payment_confirmed", "ready_to_ship", "shipped", "completed"]
    .map((status) => {
      const hit = (order.history || []).some((row) => row.status === status) || order.status === status;
      const label = statusText(status, zh());
      return `<li class="${hit ? "is-done" : ""}${order.status === status ? " is-now" : ""}">
        <button type="button" class="trade-step" aria-label="${esc(label)}">
          ${stepIcon[status]}
          <span class="trade-step-tip">${esc(label)}</span>
        </button>
      </li>`;
    })
    .join("");

const paint = () => {
  if (!root) return;
  const email = getAuthSession()?.email || "";
  if (!email) {
    root.innerHTML = `<p class="bag-empty">${zh() ? "登入後才能查看自己的訂單。" : "Sign in to see your orders."} <a href="market-account.html">${zh() ? "登入" : "Sign in"}</a></p>`;
    return;
  }
  const rows = buyerOrders(email);
  const placed = new URLSearchParams(location.search).get("placed");
  root.innerHTML = rows.length
    ? rows
        .map((order) => {
          const items = (order.items || [])
            .map(
              (item) => `<li>
                ${item.image ? `<img src="${esc(item.image)}" alt="">` : `<span class="bag-fallback"></span>`}
                <span>${esc(item.title)}</span>
                <span class="trade-money">×${odo(`${order.id}-${item.id || item.title}-qty`, String(item.qty))}</span>
              </li>`
            )
            .join("");
          return `<article class="trade-card${order.id === placed ? " is-new" : ""}">
            <header>
              <p class="trade-id">${esc(order.id)}</p>
            </header>
            <p>${esc(when(order.createdAt, zh()))} · ${esc(order.sellerName)}</p>
            <ul class="trade-items">${items}</ul>
            ${
              order.buyerFee == null
                ? `<p class="trade-money">${odo(`${order.id}-total`, money(order.total, zh()))}</p>`
                : `<div class="bag-fees">
                    <p><span>${zh() ? "書籍" : "Books"}</span><span class="trade-money">${odo(`${order.id}-goods`, money(order.goods, zh()))}</span></p>
                    <p><span>${zh() ? "服務費" : "Service fee"}</span><span class="trade-money">${odo(`${order.id}-fee`, money(order.buyerFee, zh()))}</span></p>
                    <p><span>${zh() ? "外送" : "Delivery"}</span><span class="trade-money">${odo(`${order.id}-delivery`, money(order.deliveryFee, zh()))}</span></p>
                    <p class="trade-total"><span>${zh() ? "合計" : "Total"}</span><span class="trade-money">${odo(`${order.id}-total`, money(order.total, zh()))}</span></p>
                  </div>`
            }
            ${
              order.status === "expired"
                ? `<p>${zh() ? "超過 10 分鐘未完成付款，教材已回到市集。" : "Payment was not finished in 10 minutes, so the book is back on the marketplace."}</p>`
                : `${
                    order.sellerId === "shelf" && order.status !== "waiting_payment"
                      ? `<p>${zh() ? "這筆書架教材已接受訂單並確認付款。" : "This shelf listing accepted the order and confirmed payment."}</p>`
                      : `<p class="bag-hold" data-pay-by="${esc(order.payBy || "")}" ${order.status === "waiting_payment" && order.payBy ? "" : "hidden"}></p>`
                  }
                   <ol class="trade-life">${timeline(order)}</ol>`
            }
          </article>`;
        })
        .join("")
    : `<p class="bag-empty">${zh() ? "還沒有訂單。完成的訂單會留在這裡。" : "No orders yet. Completed orders stay here."}</p>`;
};

const paintPay = () => {
  document.querySelectorAll("[data-pay-by]").forEach((node) => {
    const until = Date.parse(node.getAttribute("data-pay-by") || "");
    if (!until || node.hidden) return;
    const remain = Math.max(0, until - Date.now());
    const clock = `${Math.floor(remain / 60000)}:${String(Math.floor((remain % 60000) / 1000)).padStart(2, "0")}`;
    node.textContent = zh()
      ? `請在 ${clock} 內完成付款，否則教材回到市集。`
      : `Finish payment in ${clock} or the book returns to the marketplace.`;
  });
};

paint();
paintPay();
window.addEventListener("immba:trade", () => {
  paint();
  paintPay();
});
window.setInterval(() => {
  const due = [...document.querySelectorAll("[data-pay-by]")].some((node) => Date.parse(node.getAttribute("data-pay-by") || "") <= Date.now());
  if (due) paint();
  paintPay();
}, 1000);
window.addEventListener("immba:lang", () => {
  paint();
  paintPay();
});
root?.addEventListener("click", (event) => {
  const button = event.target.closest(".trade-step");
  root.querySelectorAll(".trade-step.is-open").forEach((item) => {
    if (item !== button) item.classList.remove("is-open");
  });
  button?.classList.toggle("is-open");
});
document.addEventListener("click", (event) => {
  if (!event.target.closest(".trade-step")) {
    root?.querySelectorAll(".trade-step.is-open").forEach((item) => item.classList.remove("is-open"));
  }
});
