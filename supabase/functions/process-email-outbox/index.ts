import { json, adminClient } from "../_shared/auth.ts";

Deno.serve(async () => {
  const key = Deno.env.get("RESEND_API_KEY") || "";
  const from = Deno.env.get("RESEND_FROM") || "imMBA <imMBA@mail.fju.edu.tw>";
  const supabase = await adminClient();
  const { data: rows, error } = await supabase
    .from("email_outbox")
    .select("id,to_email,template,payload,attempts")
    .eq("status", "pending")
    .lt("attempts", 5)
    .limit(20);
  if (error) return json({ error: error.message }, 500);
  let sent = 0;
  for (const row of rows || []) {
    if (!key) {
      await supabase.from("email_outbox").update({ attempts: row.attempts + 1, last_error: "Resend is not configured" }).eq("id", row.id);
      continue;
    }
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: row.to_email,
        subject: `imMBA ${row.template.replaceAll("_", " ")}`,
        text: `Status update for ${row.template}. Open the imMBA site for details. No documents are attached.`,
      }),
    });
    if (response.ok) {
      sent += 1;
      await supabase.from("email_outbox").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", row.id);
    } else {
      await supabase.from("email_outbox").update({ status: "failed", attempts: row.attempts + 1, last_error: await response.text() }).eq("id", row.id);
    }
  }
  return json({ sent, pending: (rows || []).length });
});
