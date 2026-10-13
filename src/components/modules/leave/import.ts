import { todayKey } from "@/lib/modules/leave-policy";

export const IMPORT_COLUMNS = [
  { key: "fullName", label: "Name", example: "Sipho Ndlovu" },
  { key: "employeeNumber", label: "Employee number", example: "E001" },
  { key: "phone", label: "Cellphone", example: "082 123 4567" },
  { key: "level", label: "Level", example: "Staff" },
  { key: "startDate", label: "Start date", example: "2022-03-01" },
  { key: "monthlyAccrual", label: "Days added per month", example: "1.25" },
  { key: "openingAnnual", label: "Annual leave balance", example: "8.5" },
  { key: "openingSick", label: "Sick leave balance", example: "22" },
  { key: "openingFamily", label: "Family leave balance", example: "3" },
] as const;

export const DEFAULT_MONTHLY_ACCRUAL = 1.25;

type Key = (typeof IMPORT_COLUMNS)[number]["key"] | "annualDays" | "balanceDate";

/** Header text → field. Order matters: more specific patterns first. */
const HEADER_RULES: [RegExp, Key][] = [
  [/balance date|as at|as of/, "balanceDate"],
  [/(emp|staff).*(no|num|code|#)|^(no|number|code|id)$/, "employeeNumber"],
  [/phone|cell|mobile|whats/, "phone"],
  [/per month|p\/m|monthly|accru|added/, "monthlyAccrual"],
  [/per year|p\/a|entitle|days\/y|annual days/, "annualDays"],
  [/sick/, "openingSick"],
  [/family|frl/, "openingFamily"],
  [/annual|balance|leave days|days due|days owed/, "openingAnnual"],
  [/start|engage|hire|employment|joined|commence/, "startDate"],
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

/** Pasted cells or CSV text → rows. */
export function textToRows(text: string): string[][] {
  const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim());
  if (!lines.length) return [];
  const sep = lines[0].includes("\t") ? "\t" : lines[0].includes(";") && !lines[0].includes(",") ? ";" : ",";
  return lines.map((l) => splitLine(l, sep));
}

/** Accepts 2023-03-01, 2023/03/01, 01/03/2023 (day first, as in South Africa), "1 Mar 2023" and Excel date numbers. */
export function parseDate(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  if (/^\d{5}(\.\d+)?$/.test(s)) {
    const serial = Number(s);
    if (serial > 20000 && serial < 80000) return new Date(Math.round((serial - 25569) * 86400000)).toISOString().slice(0, 10);
  }
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  const t = Date.parse(s);
  if (Number.isNaN(t)) return null;
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Excel drops the leading 0 from cellphone numbers typed as numbers (821234567 → 0821234567). */
function cleanPhone(raw: string) {
  const s = raw.trim();
  return /^[6-8]\d{8}$/.test(s) ? `0${s}` : s || null;
}

const num = (raw: string) => {
  const s = raw.trim().replace(/\s/g, "").replace(",", ".");
  return s === "" ? null : Number(s);
};

export type ImportRow = {
  fullName: string;
  employeeNumber: string | null;
  phone: string | null;
  level: string;
  startDate: string | null;
  annualDays: number;
  monthlyAccrual: number;
  openingAnnual: number;
  openingSick: number | null;
  openingFamily: number | null;
  balanceDate: string;
};
export type ImportResult = { rows: ImportRow[]; errors: string[] };

export function parseEmployeeRows(input: string[][], balanceDate = todayKey()): ImportResult {
  if (!input.length) return { rows: [], errors: ["The sheet is empty."] };
  const header = input[0].map((h) => (h ?? "").toLowerCase().trim());
  const mapped = header.map((h) => (h ? HEADER_RULES.find(([re]) => re.test(h))?.[1] ?? null : null));
  const hasHeader = mapped.includes("fullName") && mapped.filter(Boolean).length >= 2;
  const columns: (Key | null)[] = hasHeader ? mapped : IMPORT_COLUMNS.map((c) => c.key);
  const body = hasHeader ? input.slice(1) : input;

  const rows: ImportRow[] = [];
  const errors: string[] = [];
  body.forEach((cells, i) => {
    const get = (k: Key) => {
      const idx = columns.indexOf(k);
      return idx >= 0 ? String(cells[idx] ?? "").trim() : "";
    };
    const rowNo = i + (hasHeader ? 2 : 1);
    const name = get("fullName");
    if (!name) return;
    const startDate = parseDate(get("startDate"));
    if (!startDate) errors.push(`Row ${rowNo} (${name}): start date "${get("startDate")}" not recognised`);

    const numbers = {
      monthlyAccrual: num(get("monthlyAccrual")),
      annualDays: num(get("annualDays")),
      openingAnnual: num(get("openingAnnual")),
      openingSick: num(get("openingSick")),
      openingFamily: num(get("openingFamily")),
    };
    for (const [k, v] of Object.entries(numbers)) {
      if (v !== null && Number.isNaN(v)) errors.push(`Row ${rowNo} (${name}): "${get(k as Key)}" is not a number`);
    }
    const monthly = numbers.monthlyAccrual ?? (numbers.annualDays !== null ? numbers.annualDays / 12 : DEFAULT_MONTHLY_ACCRUAL);
    if (monthly < 0 || monthly > 5) errors.push(`Row ${rowNo} (${name}): ${monthly} days per month is not realistic (0–5)`);

    rows.push({
      fullName: name,
      employeeNumber: get("employeeNumber") || null,
      phone: cleanPhone(get("phone")),
      level: get("level") || "Staff",
      startDate,
      monthlyAccrual: Math.round(monthly * 10000) / 10000,
      annualDays: Math.round(monthly * 12 * 10000) / 10000,
      openingAnnual: numbers.openingAnnual ?? 0,
      openingSick: numbers.openingSick,
      openingFamily: numbers.openingFamily,
      balanceDate: parseDate(get("balanceDate")) ?? balanceDate,
    });
  });
  if (!rows.length && !errors.length) errors.push("No employees found — make sure there is a Name column.");
  return { rows, errors };
}

export const parseEmployeeSheet = (text: string, balanceDate?: string) => parseEmployeeRows(textToRows(text), balanceDate);
