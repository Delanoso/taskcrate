export const REPORT_TYPES = [
  { key: "near_miss", label: "Near miss", hint: "Something almost caused an injury or damage" },
  { key: "unsafe_condition", label: "Unsafe condition", hint: "A hazard in the workplace (spill, broken guard, exposed wire)" },
  { key: "unsafe_act", label: "Unsafe act", hint: "Someone working in an unsafe way" },
  { key: "incident", label: "Incident (no injury)", hint: "Damage or loss happened, but nobody was hurt" },
  { key: "environmental", label: "Environmental", hint: "Leak, spill, emission or waste problem" },
  { key: "suggestion", label: "Safety suggestion", hint: "An idea to make work safer" },
] as const;

export const CATEGORIES = [
  "Slips, trips & falls",
  "Working at height",
  "Vehicles & mobile plant",
  "Machinery & guarding",
  "Electrical",
  "Lifting & rigging",
  "Manual handling",
  "Hand & power tools",
  "Fire & explosion",
  "Hazardous chemicals",
  "Housekeeping",
  "PPE",
  "Confined space",
  "Hot work",
  "Excavation",
  "Security & violence",
  "Ergonomics & fatigue",
  "Other",
] as const;

export const SEVERITIES = [
  { key: "low", label: "Low", hint: "First aid at most", tone: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" },
  { key: "medium", label: "Medium", hint: "Medical treatment or lost time", tone: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
  { key: "high", label: "High", hint: "Serious injury or major damage", tone: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300" },
  { key: "critical", label: "Critical", hint: "Could have killed someone", tone: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300" },
] as const;

export const STATUSES = [
  { key: "open", label: "New" },
  { key: "triaged", label: "Action in progress" },
  { key: "closed", label: "Closed" },
] as const;

export type ReportTypeKey = (typeof REPORT_TYPES)[number]["key"];
export type SeverityKey = (typeof SEVERITIES)[number]["key"];

export const REPORT_TYPE_KEYS = REPORT_TYPES.map((t) => t.key) as [ReportTypeKey, ...ReportTypeKey[]];
export const SEVERITY_KEYS = SEVERITIES.map((s) => s.key) as [SeverityKey, ...SeverityKey[]];
export const MAX_REPORT_PHOTOS = 4;

export const typeLabel = (k: string | null | undefined) => REPORT_TYPES.find((t) => t.key === k)?.label ?? "Near miss";
export const severityLabel = (k: string | null | undefined) => SEVERITIES.find((s) => s.key === k)?.label ?? "-";
export const severityTone = (k: string | null | undefined) => SEVERITIES.find((s) => s.key === k)?.tone ?? "bg-muted text-muted-foreground";
export const statusLabel = (k: string) => STATUSES.find((s) => s.key === k)?.label ?? k;

export function parseList(json: string | null | undefined): string[] {
  try {
    const v = JSON.parse(json ?? "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}
