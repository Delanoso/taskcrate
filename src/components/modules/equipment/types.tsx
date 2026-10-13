import type { IssueRow, ItemRow, LogRow } from "@/lib/modules/equipment-server";
import type { Person } from "@/lib/modules/people";
import { CATEGORIES, CONDITIONS } from "@/lib/modules/equipment-options";

export { Pill, fmtDate, selectClass, textareaClass } from "@/components/modules/contract/types";
export type { IssueRow, ItemRow, LogRow, Person };

export type EquipData = {
  company: string;
  me: string;
  canManage: boolean;
  modules: { issuer: boolean; handback: boolean; ledger: boolean };
  items: ItemRow[];
  issues: IssueRow[];
  directory: Person[];
};

export type Go = { checkIn: (person: string) => void; issue: (person: string | null) => void };
export type TabProps = { data: EquipData; reload: () => Promise<EquipData | null>; go: Go };

const tone = {
  green: "bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-200",
  blue: "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200",
  amber: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  red: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
  muted: "bg-muted text-muted-foreground",
};
export const OVERDUE_TONE = tone.red;

export const ITEM_TONE: Record<string, string> = { available: tone.green, issued: tone.blue, repair: tone.amber, lost: tone.red, retired: tone.muted };
export const ISSUE_TONE: Record<string, string> = { awaiting_signature: tone.amber, active: tone.blue, returned: tone.green, lost: tone.red, cancelled: tone.muted };

export const isOpen = (x: IssueRow) => x.status === "active" || x.status === "awaiting_signature";

export function downloadCsv(name: string, head: string[], rows: (string | number | null | undefined)[][]) {
  const csv = [head, ...rows].map((l) => l.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv" }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

export type ImportItem = { name: string; assetTag: string | null; category: string; serialNumber: string | null; value: number | null; condition: string; location: string | null };

const HEADER_RULES: [RegExp, keyof ImportItem][] = [
  [/tag|asset (no|num|code)|barcode/, "assetTag"],
  [/serial|s\/n|imei/, "serialNumber"],
  [/categ|type|group|class/, "category"],
  [/value|cost|price|amount|rand/, "value"],
  [/condition|state/, "condition"],
  [/location|site|store|depot|branch/, "location"],
  [/name|item|description|equipment|asset/, "name"],
];

export function parseMoney(raw: string): number | null {
  const s = raw.replace(/[R\s]/gi, "").replace(/,(\d{1,2})$/, ".$1").replace(/,/g, "");
  const n = Number(s);
  return s && Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
}

function matchKey(list: readonly { key: string; label: string }[], raw: string, fallback: string) {
  const v = raw.trim().toLowerCase();
  if (!v) return fallback;
  return list.find((c) => c.key === v || c.label.toLowerCase() === v)?.key
    ?? list.find((c) => c.label.toLowerCase().split(/[ /()]+/).some((w) => w.length > 2 && v.includes(w)))?.key
    ?? fallback;
}

/** Spreadsheet rows (first row = headers) to items; rows without a name are skipped. */
export function parseItemRows(rows: string[][]): { items: ImportItem[]; errors: string[] } {
  if (rows.length < 2) return { items: [], errors: ["Add a header row and at least one item."] };
  const map = new Map<number, keyof ImportItem>();
  rows[0].forEach((h, i) => {
    const t = h.trim().toLowerCase();
    const rule = HEADER_RULES.find(([re, key]) => re.test(t) && ![...map.values()].includes(key));
    if (rule) map.set(i, rule[1]);
  });
  if (![...map.values()].includes("name")) return { items: [], errors: ["No 'Item' or 'Name' column found."] };
  const items: ImportItem[] = [];
  const errors: string[] = [];
  rows.slice(1).forEach((r, n) => {
    const get = (k: keyof ImportItem) => {
      const i = [...map.entries()].find(([, v]) => v === k)?.[0];
      return i === undefined ? "" : (r[i] ?? "").trim();
    };
    const name = get("name");
    if (!name) return;
    if (name.length < 2) return errors.push(`Row ${n + 2}: name too short`);
    const rawValue = get("value");
    const value = rawValue ? parseMoney(rawValue) : null;
    if (rawValue && value === null) errors.push(`Row ${n + 2}: value "${rawValue}" is not a number, left blank`);
    items.push({
      name: name.slice(0, 120),
      assetTag: get("assetTag").slice(0, 40) || null,
      category: matchKey(CATEGORIES, get("category"), "other"),
      serialNumber: get("serialNumber").slice(0, 80) || null,
      value,
      condition: matchKey(CONDITIONS, get("condition"), "good"),
      location: get("location").slice(0, 80) || null,
    });
  });
  return { items, errors };
}
