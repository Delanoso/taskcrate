import type { ContractDetail, ContractDoc, Template } from "@/lib/modules/contract-server";

export type { ContractDetail, ContractDoc, Template };
export type Person = { name: string; employeeNumber: string | null; phone: string | null; email: string | null; jobTitle: string | null };
export type ContractData = { company: string; me: string; canManage: boolean; templates: Template[]; documents: ContractDoc[]; directory: Person[] };

export const STATUS_TONE: Record<string, string> = {
  sent: "bg-muted text-muted-foreground",
  viewed: "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200",
  awaiting_countersign: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  completed: "bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-200",
  declined: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
  voided: "bg-muted text-muted-foreground line-through",
};

export const selectClass = "h-9 w-full rounded-md border bg-background px-2 text-sm";
export const textareaClass = "min-h-20 w-full rounded-md border bg-background p-2 text-sm";

export const fmtDate = (s: string | null, time = false) =>
  s
    ? new Date(s.length === 10 ? `${s}T12:00:00` : s).toLocaleString("en-ZA", {
        day: "numeric", month: "short", year: "numeric", ...(time ? { hour: "2-digit", minute: "2-digit" } : {}),
      })
    : "-";

export function Pill({ tone, children }: { tone: string; children: React.ReactNode }) {
  return <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>{children}</span>;
}
