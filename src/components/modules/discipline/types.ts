import type { SerializedCase } from "@/lib/modules/discipline-server";

export type Case = SerializedCase;

export type Person = {
  employeeName: string;
  employeeNumber: string | null;
  employeePhone: string | null;
  jobTitle: string | null;
  department: string | null;
};

export type DisciplineSettingsValue = { verbalMonths: number; writtenMonths: number; finalMonths: number; defaultIssuer: string | null };

export type DisciplineData = {
  company: string;
  me: string;
  canManage: boolean;
  settings: DisciplineSettingsValue;
  cases: Case[];
  directory: Person[];
};

export const selectClass = "h-9 w-full rounded-md border bg-background px-2 text-sm";
export const textareaClass = "min-h-20 w-full rounded-md border bg-background p-2 text-sm";

export const fmtDate = (iso: string | null | undefined, time = false) =>
  iso
    ? new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleString("en-ZA", {
        day: "numeric", month: "short", year: "numeric", ...(time ? { hour: "2-digit", minute: "2-digit" } : {}),
      })
    : "-";

export const todayKey = () => new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Johannesburg" });

/** Value for a datetime-local input, in SA time. */
export function localDateTime(iso?: string | null) {
  const d = iso ? new Date(iso) : new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Johannesburg", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour") === "24" ? "00" : get("hour")}:${get("minute")}`;
}

export const STATUS_TONE: Record<string, string> = {
  open: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  hearing: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
  issued: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  finalised: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  withdrawn: "bg-muted text-muted-foreground",
};

export const SANCTION_TONE: Record<string, string> = {
  counselling: "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300",
  verbal: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300",
  written: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
  final: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  dismissal: "bg-red-600 text-white",
  not_guilty: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
};
