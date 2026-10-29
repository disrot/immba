import { rpc } from "./supabase.js?v=secure1";

const esc = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const zh = () => document.body?.dataset.lang === "zh";
const t = (en, tw) => (zh() ? tw : en);

const money = (amount) =>
  `NT$ ${Number(amount || 0).toLocaleString(zh() ? "zh-TW" : "en-US")}`;

const when = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(zh() ? "zh-TW" : "en-US", { dateStyle: "medium", timeStyle: "short" });
};

const label = (value, map) => map[value] || value || "";

const orderStatus = (value) =>
  label(value, {
    pending: t("Pending", "待付款"),
    paid: t("Paid", "已付款"),
    fulfilled: t("Fulfilled", "已完成"),
    cancelled: t("Cancelled", "已取消"),
    refunded: t("Refunded", "已退款"),
  });

const workflowName = (value) =>
  label(value, {
    admissions: t("Admissions", "招生"),
    exchange: t("Exchange", "交換"),
    graduation: t("Graduation", "畢業"),
  });

const workflowStatus = (value) =>
  label(value, {
    submitted: t("Submitted", "已送出"),
    under_review: t("In review", "審查中"),
    needs_changes: t("Needs changes", "待修改"),
    approved: t("Approved", "已核准"),
    rejected: t("Rejected", "未通過"),
    withdrawn: t("Withdrawn", "已撤回"),
    completed: t("Completed", "已結案"),
  });

const receiptMark = `<span class="office-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 4.5h10v15.2l-1.7-1.1L13.5 20l-1.8-1.4L9.8 20 8.2 18.6 7 19.7z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9.4 9h5.2M9.4 12.4h5.2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></span>`;
const formMark = `<span class="office-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="6" y="4.2" width="12" height="15.6" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M9 4.2h6v2.3H9z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M9 12.4l2 2 4.2-4.2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`;

const emptyRow = (cols, text) => `<tr><td class="office-blank" colspan="${cols}">${esc(text)}</td></tr>`;

const paintOrders = async () => {
  const status = document.querySelector("[data-orders-status]");
  const list = document.querySelector("[data-orders-list]");
  if (!list) return;
  try {
    const orders = await rpc("office_list_orders");
    const rows = Array.isArray(orders) ? orders : [];
    if (status) {
      status.textContent = rows.length
        ? t(`${rows.length} orders.`, `${rows.length} 筆訂單。`)
        : "";
    }
    list.innerHTML = rows.length
      ? rows
          .map(
            (order) => `<tr>
              <td>${receiptMark}</td>
              <td><span class="office-status">${esc(orderStatus(order.status))}</span></td>
              <td>${esc(money(order.amount_total))}</td>
              <td>${esc(when(order.created_at))}</td>
              <td><code class="office-ref">${esc(String(order.id || "").slice(0, 8))}</code></td>
            </tr>`
          )
          .join("")
      : emptyRow(5, t(
          "No orders yet. Checkout stays off until Stripe live mode is approved.",
          "尚無訂單。Stripe 正式上線前，結帳會保持關閉。"
        ));
  } catch (error) {
    if (status) status.textContent = error.message || t("Orders are not available.", "目前無法載入訂單。");
    list.innerHTML = "";
  }
};

const paintWorkflows = async () => {
  const status = document.querySelector("[data-workflows-status]");
  const list = document.querySelector("[data-workflows-list]");
  if (!list) return;
  try {
    const rows = (await rpc("office_applications")) || [];
    if (status) {
      status.textContent = rows.length
        ? t(`${rows.length} submitted applications.`, `${rows.length} 件已送出的申請。`)
        : "";
    }
    list.innerHTML = rows.length
      ? rows
          .map((row) => {
            const name = row.payload?.full_name || "";
            const email = row.payload?.email || "";
            return `<tr data-app="${esc(row.id)}">
              <td>${formMark}</td>
              <td><strong>${esc(workflowName(row.workflow))}</strong></td>
              <td>${esc(name)}<small>${esc(email)}</small></td>
              <td><span class="office-status">${esc(workflowStatus(row.status))}</span></td>
              <td class="admin-row-actions">
                <div class="office-review">
                  <label>
                    <span class="sr-only">${esc(t("Note to the applicant", "給申請人的備註"))}</span>
                    <input data-note type="text" placeholder="${esc(t("Note to the applicant", "給申請人的備註"))}" />
                  </label>
                  <div class="admin-actions">
                    <button type="button" class="btn btn-ghost" data-status="needs_changes">${esc(t("Ask for changes", "請修改"))}</button>
                    <button type="button" class="btn btn-primary" data-status="approved">${esc(t("Approve", "核准"))}</button>
                    <button type="button" class="btn btn-ghost" data-status="rejected">${esc(t("Reject", "退回"))}</button>
                  </div>
                </div>
              </td>
            </tr>`;
          })
          .join("")
      : emptyRow(5, t("No submitted applications.", "尚無已送出的申請。"));
  } catch (error) {
    if (status) status.textContent = error.message || t("Workflows are not available.", "目前無法載入申請。");
    list.innerHTML = "";
  }
};

document.querySelector("[data-workflows-list]")?.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-status]");
  if (!button) return;
  const card = button.closest("[data-app]");
  const note = card?.querySelector("[data-note]")?.value || "";
  const status = document.querySelector("[data-workflows-status]");
  button.disabled = true;
  try {
    await rpc("workflow_transition", {
      p_id: card.getAttribute("data-app"),
      p_status: button.getAttribute("data-status"),
      p_note: note,
    });
    if (note) {
      await rpc("workflow_comment", { p_id: card.getAttribute("data-app"), p_body: note, p_visibility: "applicant" });
    }
    await paintWorkflows();
  } catch (error) {
    if (status) status.textContent = error.message || t("Could not update this application.", "無法更新這件申請。");
    button.disabled = false;
  }
});

const paintOpen = () => {
  if (location.hash === "#orders") void paintOrders();
  if (location.hash === "#workflows") void paintWorkflows();
};

window.addEventListener("hashchange", paintOpen);
window.addEventListener("immba:lang", paintOpen);
paintOpen();
