import { getAuthSession } from "./supabase.js?v=secure1";
import { buyerOrders, money, syncC2c, when } from "./trade.js?v=lab2";
import { statusRail } from "./order-status.js?v=lab2";
import { odo } from "./odometer.js?v=odo3";

const root = document.querySelector("[data-orders]");
const zh = () => document.body?.dataset.lang === "zh";

const esc = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const paint = () => {
  if (!root) return;
  const email = getAuthSession()?.email || "";
  if (!email) {
    root.innerHTML = `<p class="bag-empty">${zh() ? "登入後才能查看自己的訂單。" : "Sign in to see your orders."} <a href="market-account.html">${zh() ? "登入" : "Sign in"}</a></p>`;
    return;
  }
  const rows = buyerOrders(email);
  const placed = new URLSearchParams(location.search).get("placed");
  const banner = placed
    ? `<p class="bag-note">${zh() ? `訂單 ${esc(placed)} 已成立。賣方看得到這筆訂單，狀態會從確認付款、面交到完成。` : `Order ${esc(placed)} is saved. The seller can see it. The status moves from payment, to hand-off, to completed.`}</p>`
    : "";
  root.innerHTML = banner + (rows.length
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
                   ${statusRail(order, zh())}`
            }
          </article>`;
        })
        .join("")
    : `<p class="bag-empty">${zh() ? "還沒有訂單。完成的訂單會留在這裡。" : "No orders yet. Completed orders stay here."}</p>`);
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
void syncC2c();
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