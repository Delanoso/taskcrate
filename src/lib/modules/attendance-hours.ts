import { db } from "@/lib/db";
import { personKey } from "@/lib/modules/attendance";

export type ClockBucket = {
  fullName: string;
  employeeNumber: string | null;
  hours: number;
  openShifts: number;
};

const MAX_SHIFT_MS = 16 * 60 * 60 * 1000;

function monthBounds(period: string) {
  const [year, month] = period.split("-").map(Number);
  const start = new Date(`${period}-01T00:00:00+02:00`);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const end = new Date(`${nextYear}-${String(nextMonth).padStart(2, "0")}-01T00:00:00+02:00`);
  return { start, end };
}

/** Paired clock-in and clock-out hours for one payroll month, per person. */
export async function attendanceHoursForPeriod(organizationId: string, period: string) {
  const { start, end } = monthBounds(period);
  const punches = await db.attendancePunch.findMany({
    where: { site: { organizationId }, createdAt: { gte: start, lt: end } },
    orderBy: { createdAt: "asc" },
  });
  const groups = new Map<string, typeof punches>();
  for (const punch of punches) {
    const key = personKey(punch.fullName, punch.employeeNumber);
    const list = groups.get(key) ?? [];
    list.push(punch);
    groups.set(key, list);
  }
  const buckets: ClockBucket[] = [];
  for (const list of groups.values()) {
    let hours = 0;
    let openShifts = 0;
    let openAt: Date | null = null;
    for (const punch of list) {
      if (punch.direction === "IN") {
        if (openAt) openShifts++;
        openAt = punch.createdAt;
        continue;
      }
      if (!openAt) continue;
      const span = punch.createdAt.getTime() - openAt.getTime();
      if (span > 0 && span <= MAX_SHIFT_MS) hours += span / 3_600_000;
      else openShifts++;
      openAt = null;
    }
    if (openAt) openShifts++;
    const sample = list[0];
    buckets.push({
      fullName: sample.fullName,
      employeeNumber: sample.employeeNumber,
      hours: Math.round(hours * 100) / 100,
      openShifts,
    });
  }
  return { any: punches.length > 0, buckets };
}
