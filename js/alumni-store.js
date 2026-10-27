import { getAuthSession, rest } from "./supabase.js?v=news2";

export const DEGREES = ["Bachelor", "Master", "Doctoral", "Other"];

export const FIELDS = [
  { key: "full_name", label: "Name", required: true },
  { key: "student_id", label: "Student ID", required: true },
  { key: "department", label: "Department" },
  { key: "degree_program", label: "Degree program" },
  { key: "admission_year", label: "Admission year" },
  { key: "graduation_year", label: "Graduation year" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "company", label: "Company" },
  { key: "job_title", label: "Job title" },
  { key: "notes", label: "Notes" },
];

export const TEMPLATE_HEADERS = FIELDS.map((field) => field.key);

const HEADER_ALIASES = {
  name: "full_name",
  full_name: "full_name",
  "full name": "full_name",
  "student id": "student_id",
  student_id: "student_id",
  studentid: "student_id",
  department: "department",
  "degree program": "degree_program",
  degree_program: "degree_program",
  degree: "degree_program",
  "admission year": "admission_year",
  admission_year: "admission_year",
  "graduation year": "graduation_year",
  graduation_year: "graduation_year",
  email: "email",
  phone: "phone",
  company: "company",
  "current company": "company",
  "job title": "job_title",
  job_title: "job_title",
  notes: "notes",
  "additional information": "notes",
};

const DEGREE_ALIASES = {
  bachelor: "Bachelor",
  "bachelor's program": "Bachelor",
  bachelors: "Bachelor",
  master: "Master",
  "master's program": "Master",
  masters: "Master",
  mba: "Master",
  "m.b.a.": "Master",
  "m.b.a": "Master",
  doctoral: "Doctoral",
  "doctoral program": "Doctoral",
  phd: "Doctoral",
  "ph.d": "Doctoral",
  "ph.d.": "Doctoral",
  other: "Other",
};

const cloud = (path, options = {}) => rest(path, { ...options, anon: true });

export const actorEmail = () => getAuthSession()?.email || (localStorage.getItem("immba-admin-session") === "1" || sessionStorage.getItem("immba-admin-session") === "1" ? "local-admin" : "office");

export const normalizeDegree = (value) => {
  const key = String(value || "").trim().toLowerCase();
  if (!key) return "Other";
  return DEGREE_ALIASES[key] || (DEGREES.includes(value) ? value : "");
};

export const emptyAlumni = () => ({
  id: "",
  full_name: "",
  student_id: "",
  department: "",
  degree_program: "Master",
  admission_year: "",
  graduation_year: "",
  email: "",
  phone: "",
  company: "",
  job_title: "",
  notes: "",
});

export const normalizeAlumni = (row = {}) => ({
  ...emptyAlumni(),
  ...row,
  full_name: String(row.full_name || "").trim(),
  student_id: String(row.student_id || "").trim(),
  department: String(row.department || "").trim(),
  degree_program: normalizeDegree(row.degree_program) || "Other",
  admission_year: String(row.admission_year || "").trim(),
  graduation_year: String(row.graduation_year || "").trim(),
  email: String(row.email || "").trim(),
  phone: String(row.phone || "").trim(),
  company: String(row.company || "").trim(),
  job_title: String(row.job_title || "").trim(),
  notes: String(row.notes || "").trim(),
});

const payload = (row) => {
  const next = normalizeAlumni(row);
  return {
    full_name: next.full_name,
    student_id: next.student_id,
    department: next.department,
    degree_program: next.degree_program,
    admission_year: next.admission_year,
    graduation_year: next.graduation_year,
    email: next.email,
    phone: next.phone,
    company: next.company,
    job_title: next.job_title,
    notes: next.notes,
    updated_at: new Date().toISOString(),
  };
};

export const listAlumni = async () => {
  const rows = await cloud("alumni?select=*&order=full_name.asc");
  return Array.isArray(rows) ? rows.map(normalizeAlumni) : [];
};

export const listAudit = async () => {
  const rows = await cloud("alumni_audit?select=*&order=created_at.desc&limit=80");
  return Array.isArray(rows) ? rows : [];
};

const writeAudit = async ({ action, record, before, after, summary }) => {
  await cloud("alumni_audit", {
    method: "POST",
    body: {
      actor_email: actorEmail(),
      action,
      record_id: record?.id || record?.student_id || "",
      record_label: record?.full_name || record?.student_id || "",
      summary,
      before: before || null,
      after: after || null,
    },
  });
};

const diffSummary = (before, after) => {
  const changed = FIELDS.filter((field) => String(before?.[field.key] || "") !== String(after?.[field.key] || "")).map(
    (field) => `${field.label}: ${before?.[field.key] || "—"} → ${after?.[field.key] || "—"}`
  );
  return changed.join("; ") || "Record updated";
};

export const upsertAlumni = async (input) => {
  const next = payload(input);
  if (!next.full_name || !next.student_id) throw new Error("Name and student ID are required.");
  if (!DEGREES.includes(next.degree_program)) throw new Error("Degree program must be Bachelor, Master, Doctoral, or Other.");
  const id = String(input.id || "").trim();
  if (id) {
    const existing = (await cloud(`alumni?id=eq.${encodeURIComponent(id)}&select=*`)) || [];
    const before = existing[0] ? normalizeAlumni(existing[0]) : null;
    const saved = await cloud(`alumni?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", body: next });
    const after = normalizeAlumni((saved && saved[0]) || { ...before, ...next, id });
    await writeAudit({
      action: "UPDATE",
      record: after,
      before,
      after,
      summary: before ? diffSummary(before, after) : "Record updated",
    });
    return after;
  }
  const saved = await cloud("alumni", { method: "POST", body: next });
  const after = normalizeAlumni((saved && saved[0]) || next);
  await writeAudit({ action: "CREATE", record: after, after, summary: `New record ${after.full_name} (${after.student_id})` });
  return after;
};

export const deleteAlumni = async (id) => {
  const existing = (await cloud(`alumni?id=eq.${encodeURIComponent(id)}&select=*`)) || [];
  const before = existing[0] ? normalizeAlumni(existing[0]) : { id };
  await cloud(`alumni?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
  await writeAudit({
    action: "DELETE",
    record: before,
    before,
    summary: `Deleted ${before.full_name || before.student_id}`,
  });
};

export const parseCsv = (text) => {
  const src = String(text || "").replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < src.length; i += 1) {
    const char = src[i];
    if (quoted) {
      if (char === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else quoted = false;
      } else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && src[i + 1] === "\n") i += 1;
      row.push(cell);
      cell = "";
      if (row.some((item) => String(item).trim())) rows.push(row);
      row = [];
    } else cell += char;
  }
  if (cell.length || row.length) {
    row.push(cell);
    if (row.some((item) => String(item).trim())) rows.push(row);
  }
  return rows;
};

const headerKey = (value) => HEADER_ALIASES[String(value || "").trim().toLowerCase()] || "";

export const validateImport = (text, existing = []) => {
  const table = parseCsv(text);
  const errors = [];
  if (text.includes("\uFFFD")) errors.push("File encoding looks wrong. Save the CSV as UTF-8 and try again.");
  if (table.length < 2) {
    return { errors: errors.concat(["The file has no data rows."]), rows: [], skipped: 0 };
  }
  const mapped = table[0].map(headerKey);
  if (!mapped.includes("full_name") || !mapped.includes("student_id")) {
    errors.push("Column names must include name and student ID. Download the CSV template.");
    return { errors, rows: [], skipped: 0 };
  }
  const known = table[0].filter((_, index) => mapped[index]);
  const unknown = table[0].filter((name, index) => name.trim() && !mapped[index]);
  if (!known.length) errors.push("Incorrect column names. Download the CSV template.");
  if (unknown.length) errors.push(`Ignored unknown columns: ${unknown.join(", ")}`);
  const seen = new Set();
  const taken = new Set(existing.map((row) => row.student_id));
  const rows = [];
  let skipped = 0;
  table.slice(1).forEach((cells, index) => {
    if (!cells.some((cell) => String(cell).trim())) {
      skipped += 1;
      return;
    }
    const row = emptyAlumni();
    mapped.forEach((key, col) => {
      if (key) row[key] = String(cells[col] || "").trim();
    });
    row.degree_program = normalizeDegree(row.degree_program);
    const line = index + 2;
    if (!row.full_name || !row.student_id) {
      errors.push(`Row ${line}: name and student ID are required.`);
      return;
    }
    if (!row.degree_program) {
      errors.push(`Row ${line}: degree program must be Bachelor, Master, Doctoral, or Other.`);
      return;
    }
    if (seen.has(row.student_id) || taken.has(row.student_id)) {
      errors.push(`Row ${line}: duplicate student ID ${row.student_id}.`);
      return;
    }
    seen.add(row.student_id);
    rows.push(normalizeAlumni(row));
  });
  return { errors, rows, skipped };
};

export const importAlumni = async (rows) => {
  let saved = 0;
  for (const row of rows) {
    await upsertAlumni(row);
    saved += 1;
  }
  await writeAudit({
    action: "IMPORT",
    record: { id: "batch", full_name: "CSV import", student_id: "" },
    summary: `Imported ${saved} alumni record${saved === 1 ? "" : "s"}.`,
    after: { count: saved },
  });
  return saved;
};

const csvCell = (value) => {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const toCsv = (rows, keys = TEMPLATE_HEADERS) => {
  const header = keys.join(",");
  const body = rows.map((row) => keys.map((key) => csvCell(row[key])).join(",")).join("\n");
  return `${header}\n${body}\n`;
};

export const templateCsv = () =>
  `${TEMPLATE_HEADERS.join(",")}\nAlex Wang,11010001,International Business and Trade,Master,114,116,alex.wang@example.com,0912-345-678,"Formosa Global Co., Ltd.",Project Manager,\n`;

export const filterAlumni = (rows, { q = "", degree = "", year = "", department = "", company = "" }) => {
  const query = q.trim().toLowerCase();
  return rows.filter((row) => {
    if (degree && row.degree_program !== degree) return false;
    if (year && row.graduation_year !== year) return false;
    if (department && row.department !== department) return false;
    if (company && row.company !== company) return false;
    if (!query) return true;
    const hay = FIELDS.map((field) => row[field.key]).join(" ").toLowerCase();
    return hay.includes(query);
  });
};
