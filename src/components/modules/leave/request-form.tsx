"use client";

import { Button, Input, Label } from "@/components/modules/ui-bits";
import { LEAVE_TYPES, countLeaveDays, fmtDays, isDateKey, type LeaveTypeKey } from "@/lib/modules/leave-policy";

export type LeaveFormValue = {
  leaveType: LeaveTypeKey;
  startDate: string;
  endDate: string;
  halfDay: boolean;
  reason: string;
};

export const emptyLeaveForm = (): LeaveFormValue => ({ leaveType: "annual", startDate: "", endDate: "", halfDay: false, reason: "" });

export const selectClass = "h-9 w-full rounded-md border bg-background px-2 text-sm";

/** Leave type, dates, half-day and reason, with a live working-day count. */
export function LeaveFields({
  value,
  onChange,
  workDays,
}: {
  value: LeaveFormValue;
  onChange: (v: LeaveFormValue) => void;
  workDays: string;
}) {
  const valid = isDateKey(value.startDate) && isDateKey(value.endDate) && value.endDate >= value.startDate;
  const days = valid ? countLeaveDays(value.startDate, value.endDate, workDays) : 0;
  const single = valid && value.startDate === value.endDate && days === 1;

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="leaveType">Type of leave</Label>
        <select
          id="leaveType"
          className={selectClass}
          value={value.leaveType}
          onChange={(e) => onChange({ ...value, leaveType: e.target.value as LeaveTypeKey })}
        >
          {LEAVE_TYPES.map((t) => (
            <option key={t.key} value={t.key}>{t.label}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="startDate">First day</Label>
          <Input
            id="startDate"
            type="date"
            required
            value={value.startDate}
            onChange={(e) => {
              const startDate = e.target.value;
              onChange({ ...value, startDate, endDate: !value.endDate || value.endDate < startDate ? startDate : value.endDate });
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="endDate">Last day</Label>
          <Input id="endDate" type="date" required min={value.startDate} value={value.endDate} onChange={(e) => onChange({ ...value, endDate: e.target.value })} />
        </div>
      </div>
      {single && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={value.halfDay} onChange={(e) => onChange({ ...value, halfDay: e.target.checked })} />
          Half day only
        </label>
      )}
      {valid && (
        <p className="rounded-md bg-muted px-3 py-2 text-sm">
          {days === 0
            ? "Those dates are all weekends or public holidays — no leave needed."
            : <>This uses <strong>{fmtDays(single && value.halfDay ? 0.5 : days)}</strong> of leave (weekends and public holidays are not counted).</>}
        </p>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="reason">Reason (optional)</Label>
        <Input id="reason" value={value.reason} maxLength={500} onChange={(e) => onChange({ ...value, reason: e.target.value })} />
      </div>
    </div>
  );
}

export function SubmitButton({ busy, children }: { busy: boolean; children: React.ReactNode }) {
  return <Button type="submit" className="w-full" disabled={busy}>{busy ? "Sending…" : children}</Button>;
}

export function payload(v: LeaveFormValue) {
  return { ...v, halfDay: v.halfDay && v.startDate === v.endDate, reason: v.reason.trim() || undefined };
}

export const STATUS_LABEL: Record<string, string> = {
  pending: "Waiting for approval",
  approved: "Approved",
  auto_approved: "Approved",
  rejected: "Declined",
  blocked: "Blocked (blackout period)",
  cancelled: "Cancelled",
};

export const STATUS_TONE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  approved: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  auto_approved: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  blocked: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  cancelled: "bg-muted text-muted-foreground",
};

export function LeaveStatus({ status }: { status: string }) {
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[status] ?? "bg-muted"}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}
