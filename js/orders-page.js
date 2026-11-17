import { getAuthSession } from "./supabase.js?v=secure1";
import { buyerOrders, money, statusText, when } from "./trade.js?v=trade1";

const root = document.querySelector("[data-orders]");
const zh = () => document.body?.dataset.lang === "zh";

const esc = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const timeline = (order) =>
  ["placed", "waiting_payment", "payment_confirmed", "ready_to_ship", "shipped", "completed"]
    .map((status) => {
      const hit = (order.history || []).some((row) => row.status === status) || order.status === status;
      return `<li class="${hit ? "is-done" : ""}">${esc(statusText(status, zh()))}</li>`;
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
                <span class="trade-money">×${esc(item.qty)}</span>
              </li>`
            )
            .join("");
          return `<article class="trade-card${order.id === placed ? " is-new" : ""}">
            <header>
              <p class="trade-id">${esc(order.id)}</p>
              <strong>${esc(statusText(order.status, zh()))}</strong>
            </header>
            <p>${esc(when(order.createdAt, zh()))} · ${esc(order.sellerName)}</p>
            <ul class="trade-items">${items}</ul>
            <p class="trade-money">${esc(money(order.total, zh()))}</p>
            <ol class="trade-life">${timeline(order)}</ol>
          </article>`;
        })
        .join("")
    : `<p class="bag-empty">${zh() ? "還沒有訂單。完成的訂單會留在這裡。" : "No orders yet. Completed orders stay here."}</p>`;
};

paint();
window.addEventListener("immba:trade", paint);
window.addEventListener("immba:lang", paint);
