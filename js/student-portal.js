import { rpc } from "./supabase.js?v=secure1";

const form = document.querySelector("[data-application]");
const status = document.querySelector("[data-application-status]");
const params = new URLSearchParams(location.search);
if (params.get("workflow") && form.elements.workflow) form.elements.workflow.value = params.get("workflow");

const payload = () => ({
  full_name: form.elements.full_name.value.trim(),
  email: form.elements.email.value.trim(),
  statement: form.elements.statement.value.trim(),
});

form.querySelector("[data-save]").addEventListener("click", async () => {
  try {
    await rpc("workflow_save_draft", {
      p_workflow: form.elements.workflow.value,
      p_payload: payload(),
      p_deadline: null,
    });
    status.textContent = "Draft saved.";
  } catch (error) {
    status.textContent = error.message;
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await rpc("workflow_save_draft", {
      p_workflow: form.elements.workflow.value,
      p_payload: payload(),
      p_deadline: null,
    });
    await rpc("workflow_submit", { p_workflow: form.elements.workflow.value });
    status.textContent = "Submitted. You will get a status email without attachments.";
  } catch (error) {
    status.textContent = error.message;
  }
});
