import type { ItemState } from "@/lib/modules/safety-file-items";

export type SafetyDoc = {
  id: string;
  docType: string;
  fileName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  expiresAt: string | null;
  uploadedAt: string;
};

export type SafetyItem = {
  key: string;
  label: string;
  expires: boolean;
  hint?: string;
  state: ItemState;
  count: number;
};

export const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-ZA", { timeZone: "Africa/Johannesburg", day: "numeric", month: "short", year: "numeric" });

export function fmtBytes(n: number | null) {
  if (!n) return "";
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

const STATE_STYLE: Record<ItemState, [string, string]> = {
  missing: ["Missing", "bg-muted text-muted-foreground"],
  ok: ["Received", "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"],
  expiring: ["Expires soon", "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"],
  expired: ["Expired", "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"],
};

export function ItemStateBadge({ state }: { state: ItemState }) {
  const [label, cls] = STATE_STYLE[state];
  return <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{label}</span>;
}

const FILE_STATUS: Record<string, [string, string]> = {
  active: ["Complete", "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"],
  pending: ["Incomplete", "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"],
  blocked: ["Blocked — expired docs", "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"],
};

export function FileStatusBadge({ status }: { status: string }) {
  const [label, cls] = FILE_STATUS[status] ?? [status, "bg-muted"];
  return <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{label}</span>;
}

export function Progress({ done, total }: { done: number; total: number }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="shrink-0 text-xs text-muted-foreground">{done}/{total}</span>
    </div>
  );
}
