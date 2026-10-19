import type { AodRow, Reason } from "@/lib/modules/aod-server";

export { Pill, fmtDate, selectClass, textareaClass } from "@/components/modules/contract/types";
export type { AodRow, Reason };

export type AodPerson = { name: string; employeeNumber: string | null; phone: string | null; idNumber: string | null; salary: number | null };
export type CustomReason = { id: string; key: string; label: string; kind: string; archived: boolean };
export type AodData = {
  company: string;
  me: string;
  canManage: boolean;
  period: string;
  payrollLinked: boolean;
  reasons: Reason[];
  customReasons: CustomReason[];
  records: AodRow[];
  people: AodPerson[];
};

export const STATUS_TONE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  active: "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200",
  settled: "bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-200",
  declined: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
  cancelled: "bg-muted text-muted-foreground line-through",
};
export const ARREARS_TONE = "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200";

/** "R 1 234,50" or "1234.5" → 1234.5 */
export function parseRand(raw: string): number | null {
  const s = raw.replace(/[R\s]/gi, "").replace(/,(\d{1,2})$/, ".$1").replace(/,/g, "");
  const n = Number(s);
  return s && Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}

/** All selectable reasons: built-in first, then the company's own (not archived), "Other" last. */
export function reasonOptions(data: AodData) {
  const builtins = data.reasons.filter((r) => r.key !== "other");
  const custom = data.customReasons.filter((c) => !c.archived).map((c) => ({ key: c.key, label: c.label, kind: c.kind, custom: true }));
  const other = data.reasons.find((r) => r.key === "other");
  return [...builtins, ...custom, ...(other ? [other] : [])];
}
