"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button, Card, CardContent } from "@/components/modules/ui-bits";
import { LEAVE_TYPES, holidayName, isBooked, isoWeekday, leaveTypeLabel, toDateKey, todayKey } from "@/lib/modules/leave-policy";
import type { LeaveData, LeaveRequest } from "@/components/modules/leave/types";

export const TYPE_COLOR: Record<string, string> = {
  annual: "bg-blue-500",
  sick: "bg-rose-500",
  family: "bg-violet-500",
  unpaid: "bg-zinc-500",
  maternity: "bg-pink-500",
  parental: "bg-pink-400",
  study: "bg-amber-500",
  other: "bg-teal-500",
};

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function LeavePlanner({ data }: { data: LeaveData }) {
  const today = todayKey();
  const [cursor, setCursor] = useState(() => ({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) - 1 }));
  const [level, setLevel] = useState("all");

  const days = useMemo(() => {
    const n = new Date(Date.UTC(cursor.y, cursor.m + 1, 0)).getUTCDate();
    return Array.from({ length: n }, (_, i) => {
      const date = new Date(Date.UTC(cursor.y, cursor.m, i + 1));
      const key = toDateKey(date);
      return { key, day: i + 1, off: !data.settings.workDays.includes(String(isoWeekday(date))), holiday: holidayName(key) };
    });
  }, [cursor, data.settings.workDays]);

  const levels = [...new Set(data.employees.map((e) => e.level))].sort();
  const employees = data.employees.filter((e) => e.active && (level === "all" || e.level === level));
  const monthStart = days[0].key;
  const monthEnd = days[days.length - 1].key;

  const byEmployee = useMemo(() => {
    const map = new Map<string, LeaveRequest[]>();
    for (const r of data.requests) {
      if (!r.employeeId || !(isBooked(r.status) || r.status === "pending")) continue;
      if (r.endDate.slice(0, 10) < monthStart || r.startDate.slice(0, 10) > monthEnd) continue;
      map.set(r.employeeId, [...(map.get(r.employeeId) ?? []), r]);
    }
    return map;
  }, [data.requests, monthStart, monthEnd]);

  const offToday = data.employees.filter((e) =>
    (byEmployee.get(e.id) ?? []).some((r) => isBooked(r.status) && r.startDate.slice(0, 10) <= today && r.endDate.slice(0, 10) >= today),
  );
  const holidays = days.filter((d) => d.holiday);
  const move = (delta: number) => setCursor(({ y, m }) => ({ y: y + Math.floor((m + delta) / 12), m: (((m + delta) % 12) + 12) % 12 }));

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => move(-1)} aria-label="Previous month"><ChevronLeft className="size-4" /></Button>
            <h2 className="w-40 text-center font-semibold">{MONTHS[cursor.m]} {cursor.y}</h2>
            <Button size="sm" variant="outline" onClick={() => move(1)} aria-label="Next month"><ChevronRight className="size-4" /></Button>
            <Button size="sm" variant="ghost" onClick={() => setCursor({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) - 1 })}>Today</Button>
          </div>
          {levels.length > 1 && (
            <select className="h-8 rounded-md border bg-background px-2 text-sm" value={level} onChange={(e) => setLevel(e.target.value)}>
              <option value="all">All levels</option>
              {levels.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          )}
        </div>

        <p className="text-sm">
          <span className="font-medium">Off today:</span>{" "}
          {offToday.length ? offToday.map((e) => e.fullName).join(", ") : <span className="text-muted-foreground">nobody</span>}
        </p>

        {employees.length === 0 ? (
          <p className="text-sm text-muted-foreground">Add employees on the Employees tab to see the planner.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 min-w-36 border-b bg-background px-2 py-1 text-left font-medium">Employee</th>
                  {days.map((d) => (
                    <th
                      key={d.key}
                      title={d.holiday ?? undefined}
                      className={`min-w-7 border-b border-l px-0 py-1 text-center font-medium ${d.off || d.holiday ? "bg-muted text-muted-foreground" : ""} ${d.key === today ? "text-primary underline" : ""}`}
                    >
                      {d.day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.map((e) => {
                  const reqs = byEmployee.get(e.id) ?? [];
                  return (
                    <tr key={e.id}>
                      <td className="sticky left-0 z-10 truncate border-b bg-background px-2 py-1" title={`${e.fullName} · ${e.level}`}>
                        {e.fullName}
                        <span className="ml-1 text-muted-foreground">{e.balances.annual.available}d</span>
                      </td>
                      {days.map((d) => {
                        const r = reqs.find((x) => x.startDate.slice(0, 10) <= d.key && x.endDate.slice(0, 10) >= d.key);
                        const pending = r?.status === "pending";
                        return (
                          <td key={d.key} className={`h-7 border-b border-l p-0.5 ${d.off || d.holiday ? "bg-muted" : ""}`}>
                            {r && !d.off && !d.holiday && (
                              <div
                                title={`${e.fullName}: ${leaveTypeLabel(r.leaveType)}${pending ? " (pending)" : ""}`}
                                className={`h-full w-full rounded-sm ${TYPE_COLOR[r.leaveType] ?? "bg-teal-500"} ${pending ? "opacity-40" : ""}`}
                              />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {LEAVE_TYPES.map((t) => (
            <span key={t.key} className="flex items-center gap-1">
              <span className={`size-3 rounded-sm ${TYPE_COLOR[t.key]}`} />{t.label}
            </span>
          ))}
          <span className="flex items-center gap-1"><span className="size-3 rounded-sm bg-blue-500 opacity-40" />Pending</span>
          <span className="flex items-center gap-1"><span className="size-3 rounded-sm border bg-muted" />Weekend / public holiday</span>
        </div>
        {holidays.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Public holidays: {holidays.map((d) => `${d.day} ${MONTHS[cursor.m].slice(0, 3)} – ${d.holiday}`).join(" · ")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
