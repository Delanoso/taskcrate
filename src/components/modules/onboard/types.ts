export const STATUS: Record<string, { label: string; tone: string }> = {
  sent: { label: "Link sent", tone: "bg-muted text-muted-foreground" },
  in_progress: { label: "Filling in", tone: "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200" },
  submitted: { label: "To review", tone: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200" },
  changes_requested: { label: "Changes requested", tone: "bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200" },
  approved: { label: "Approved", tone: "bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-200" },
};

export const fmtDate = (s: string | null) =>
  s ? new Date(s.length === 10 ? `${s}T12:00:00` : s).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" }) : "-";

export const fmtDateTime = (s: string | null) =>
  s ? new Date(s).toLocaleString("en-ZA", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-";
