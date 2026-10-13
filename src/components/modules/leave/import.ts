import { todayKey } from "@/lib/modules/leave-policy";

export const IMPORT_COLUMNS = [
  { key: "fullName", label: "Name", example: "Sipho Ndlovu" },
  { key: "employeeNumber", label: "Employee number", example: "E001" },
  { key: "phone", label: "Cellphone", example: "082 123 4567" },
  { key: "level", label: "Level", example: "Staff" },
  { key: "startDate", label: "Start date", example: "2022-03-01" },
  { key: "annualDays", label: "Annual days per year", example: "15" },
  { key: "openingAnnual", label: "Annual leave balance", example: "8.5" },
  { key: "openingSick", label: "Sick leave balance", example: "22" },
  { key: "openingFamily", label: "Family leave balance", example: "3" },
] as const;

type Key = (typeof IMPORT_COLUMNS)[number]["key"] | "balanceDate";

/** Header text → field. Order matters: more specific patterns first. */
const HEADER_RULES: [RegExp, Key][] = [
  [/balance date|as at|as of/, "balanceDate"],
  [/(emp|staff).*(no|num|code|#)|^(no|number|code|id)$/, "employeeNumber"],
  [/phone|cell|mobile|whats/, "phone"],
  [/per year|entitle|days p|accrual|days\/y/, "annualDays"],
  [/sick/, "openingSick"],
  [/family|frl/, "openingFamily"],
  [/annual|balance|leave days/, "openingAnnual"],
  [/start|engage|hire|employ/, "startDate"],
  [/level|grade|band|position|role/, "level"],
  [/name|employee/, "fullName"],
];

function splitLine(line: string, sep: string) {
  if (sep === "\t") return line.split("\t").map((c) => c.trim());
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') { cur += '"'; i++; } else quoted = !quoted;
    } else if (ch === sep && !quoted) { out.push(cur.trim()); cur = ""; }
    else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

/** Accepts 2023-03-01, 2023/03/01, 01/03/2023 (day first, as in South Africa) and "1 Mar 2023". */
export function parseDate(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  const t = Date.parse(s);
  if (Number.isNaN(t)) return null;
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const num = (raw: string) => {
  const s = raw.trim().replace(/\s/g, "").replace(",", ".");
  return s === "" ? null : Number(s);
};

export type ImportRow = Record<string, string | number | null>;
export type ImportResult = { rows: ImportRow[]; errors: string[]; columns: Key[] };

export function parseEmployeeSheet(text: string, balanceDate = todayKey()): ImportResult {
  const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim());
  if (!lines.length) return { rows: [], errors: ["Paste your employee list first."], columns: [] };
  const sep = lines[0].includes("\t") ? "\t" : lines[0].includes(";") && !lines[0].includes(",") ? ";" : ",";

  const header = splitLine(lines[0], sep).map((h) => h.toLowerCase());
  const mapped = header.map((h) => HEADER_RULES.find(([re]) => re.test(h))?.[1] ?? null);
  const hasHeader = mapped.includes("fullName") && mapped.filter(Boolean).length >= 2;
  const columns: (Key | null)[] = hasHeader ? mapped : IMPORT_COLUMNS.map((c) => c.key);
  const body = hasHeader ? lines.slice(1) : lines;

  const rows: ImportRow[] = [];
  const errors: string[] = [];
  body.forEach((line, i) => {
    const cells = splitLine(line, sep);
    const get = (k: Key) => {
      const idx = columns.indexOf(k);
      return idx >= 0 ? (cells[idx] ?? "") : "";
    };
    const rowNo = i + (hasHeader ? 2 : 1);
    const name = get("fullName");
    if (!name) return;
    const startDate = parseDate(get("startDate"));
    if (!startDate) errors.push(`Line ${rowNo} (${name}): start date "${get("startDate")}" not recognised`);
    const numbers = { annualDays: num(get("annualDays")), openingAnnual: num(get("openingAnnual")), openingSick: num(get("openingSick")), openingFamily: num(get("openingFamily")) };
    for (const [k, v] of Object.entries(numbers)) {
      if (v !== null && Number.isNaN(v)) errors.push(`Line ${rowNo} (${name}): "${get(k as Key)}" is not a number`);
    }
    rows.push({
      fullName: name,
      employeeNumber: get("employeeNumber") || null,
      phone: get("phone") || null,
      level: get("level") || "Staff",
      startDate,
      annualDays: numbers.annualDays ?? 15,
      openingAnnual: numbers.openingAnnual ?? 0,
      openingSick: numbers.openingSick,
      openingFamily: numbers.openingFamily,
      balanceDate: parseDate(get("balanceDate")) ?? balanceDate,
    });
  });
  if (!rows.length && !errors.length) errors.push("No employees found — make sure the first column is the name.");
  return { rows, errors, columns: columns.filter((c): c is Key => !!c) };
}

export function templateCsv() {
  return [IMPORT_COLUMNS.map((c) => c.label).join(","), IMPORT_COLUMNS.map((c) => c.example).join(",")].join("\n");
}
