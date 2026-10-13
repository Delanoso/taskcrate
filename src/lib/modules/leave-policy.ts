/** Leave types, South African public holidays, working-day counts and balance maths. Pure — safe on client and server. */

export const LEAVE_TYPES = [
  { key: "annual", label: "Annual leave", tracked: true },
  { key: "sick", label: "Sick leave", tracked: true },
  { key: "family", label: "Family responsibility", tracked: true },
  { key: "unpaid", label: "Unpaid leave", tracked: false },
  { key: "maternity", label: "Maternity leave", tracked: false },
  { key: "parental", label: "Parental leave", tracked: false },
  { key: "study", label: "Study leave", tracked: false },
  { key: "other", label: "Other", tracked: false },
] as const;

export type LeaveTypeKey = (typeof LEAVE_TYPES)[number]["key"];
export type TrackedType = "annual" | "sick" | "family";
export const LEAVE_TYPE_KEYS = LEAVE_TYPES.map((t) => t.key) as [LeaveTypeKey, ...LeaveTypeKey[]];
export const TRACKED_TYPES: TrackedType[] = ["annual", "sick", "family"];
export const leaveTypeLabel = (key: string) => LEAVE_TYPES.find((t) => t.key === key)?.label ?? key;
export const isTracked = (key: string): key is TrackedType => (TRACKED_TYPES as string[]).includes(key);

/** Statuses that take days off the balance. */
export const BOOKED_STATUSES = ["approved", "auto_approved"];
export const isBooked = (status: string) => BOOKED_STATUSES.includes(status);

export const SICK_CYCLE_MONTHS = 36;
export const FAMILY_CYCLE_MONTHS = 12;
export const FAMILY_DAYS = 3;

// ——— Dates (all leave dates are calendar days stored as UTC midnight) ———

export const toDateKey = (d: Date) => d.toISOString().slice(0, 10);
export const fromDateKey = (key: string) => new Date(`${key}T00:00:00.000Z`);
export const isDateKey = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(fromDateKey(s).getTime());
export const todayKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

export function addMonths(d: Date, n: number) {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
  const lastDay = new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth() + 1, 0)).getUTCDate();
  x.setUTCDate(Math.min(d.getUTCDate(), lastDay));
  return x;
}

/** Whole months completed between two dates. */
export function fullMonthsBetween(from: Date, to: Date) {
  if (to <= from) return 0;
  let months = (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + (to.getUTCMonth() - from.getUTCMonth());
  if (addMonths(from, months) > to) months -= 1;
  return Math.max(0, months);
}

function easterSunday(year: number) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

const holidayCache = new Map<number, Map<string, string>>();

/** South African public holidays for a year (Public Holidays Act — a Sunday holiday moves to Monday). */
export function publicHolidays(year: number): Map<string, string> {
  const cached = holidayCache.get(year);
  if (cached) return cached;
  const fixed: [number, number, string][] = [
    [1, 1, "New Year's Day"],
    [3, 21, "Human Rights Day"],
    [4, 27, "Freedom Day"],
    [5, 1, "Workers' Day"],
    [6, 16, "Youth Day"],
    [8, 9, "National Women's Day"],
    [9, 24, "Heritage Day"],
    [12, 16, "Day of Reconciliation"],
    [12, 25, "Christmas Day"],
    [12, 26, "Day of Goodwill"],
  ];
  const map = new Map<string, string>();
  for (const [m, d, name] of fixed) {
    const date = new Date(Date.UTC(year, m - 1, d));
    map.set(toDateKey(date), name);
    if (date.getUTCDay() === 0) map.set(toDateKey(addDays(date, 1)), `${name} (observed)`);
  }
  const easter = easterSunday(year);
  map.set(toDateKey(addDays(easter, -2)), "Good Friday");
  map.set(toDateKey(addDays(easter, 1)), "Family Day");
  holidayCache.set(year, map);
  return map;
}

export const holidayName = (key: string) => publicHolidays(Number(key.slice(0, 4))).get(key) ?? null;

/** ISO weekday: 1 = Monday … 7 = Sunday. */
export const isoWeekday = (d: Date) => d.getUTCDay() || 7;

export function isWorkingDay(key: string, workDays: string) {
  return workDays.includes(String(isoWeekday(fromDateKey(key)))) && !holidayName(key);
}

/** Working days in an inclusive date range, skipping non-work weekdays and public holidays. */
export function countLeaveDays(startKey: string, endKey: string, workDays: string) {
  let n = 0;
  for (let d = fromDateKey(startKey); d <= fromDateKey(endKey); d = addDays(d, 1)) {
    if (isWorkingDay(toDateKey(d), workDays)) n++;
  }
  return n;
}

// ——— Balances ———

export type BalanceEmployee = {
  startDate: Date | string;
  balanceDate: Date | string;
  annualDays: number;
  openingAnnual: number;
  openingSick: number | null;
  openingFamily: number | null;
};
export type BalanceRequest = { leaveType: string; status: string; startDate: Date | string; days: number | null };
export type BalanceAdjustment = { leaveType: string; days: number; createdAt: Date | string };

export type TypeBalance = {
  /** Days available now, after all approved leave (including future bookings). */
  available: number;
  taken: number;
  pending: number;
  adjustments: number;
  /** Annual: opening + accrued so far. Sick/family: entitlement for the current cycle. */
  entitlement: number;
  cycleStart: string;
  cycleEnd: string | null;
  /** Annual only: days accrued per month. */
  monthlyAccrual?: number;
};

const round = (n: number) => Math.round(n * 100) / 100;
const asDate = (d: Date | string) => (typeof d === "string" ? new Date(d) : d);

function currentCycle(start: Date, months: number, today: Date) {
  const k = Math.max(0, Math.floor(fullMonthsBetween(start, today) / months));
  return { from: addMonths(start, k * months), to: addMonths(start, (k + 1) * months) };
}

export function computeBalances(
  emp: BalanceEmployee,
  requests: BalanceRequest[],
  adjustments: BalanceAdjustment[],
  workDays: string,
  today: Date = fromDateKey(todayKey()),
): Record<TrackedType, TypeBalance> {
  const balanceDate = asDate(emp.balanceDate);
  const sumDays = (type: string, from: Date, to: Date | null, booked: boolean) =>
    requests
      .filter((r) => r.leaveType === type && (booked ? isBooked(r.status) : r.status === "pending"))
      .filter((r) => asDate(r.startDate) >= from && (!to || asDate(r.startDate) < to))
      .reduce((s, r) => s + (r.days ?? 0), 0);
  const sumAdj = (type: string, from: Date, to: Date | null) =>
    adjustments
      .filter((a) => a.leaveType === type && asDate(a.createdAt) >= from && (!to || asDate(a.createdAt) < to))
      .reduce((s, a) => s + a.days, 0);

  const monthlyAccrual = emp.annualDays / 12;
  const accrued = monthlyAccrual * fullMonthsBetween(balanceDate, today);
  const annualEntitlement = emp.openingAnnual + accrued;
  const annualTaken = sumDays("annual", balanceDate, null, true);
  const annualAdj = sumAdj("annual", new Date(0), null);
  const annual: TypeBalance = {
    available: round(annualEntitlement + annualAdj - annualTaken),
    taken: round(annualTaken),
    pending: round(sumDays("annual", balanceDate, null, false)),
    adjustments: round(annualAdj),
    entitlement: round(annualEntitlement),
    cycleStart: toDateKey(balanceDate),
    cycleEnd: null,
    monthlyAccrual: round(monthlyAccrual),
  };

  const cycleBalance = (type: TrackedType, months: number, full: number, opening: number | null): TypeBalance => {
    const { from, to } = currentCycle(asDate(emp.startDate), months, today);
    const openingApplies = opening !== null && balanceDate >= from && balanceDate < to;
    const countFrom = openingApplies ? balanceDate : from;
    const entitlement = openingApplies ? opening! : full;
    const taken = sumDays(type, countFrom, to, true);
    const adj = sumAdj(type, from, to);
    return {
      available: round(entitlement + adj - taken),
      taken: round(taken),
      pending: round(sumDays(type, countFrom, to, false)),
      adjustments: round(adj),
      entitlement: round(entitlement),
      cycleStart: toDateKey(from),
      cycleEnd: toDateKey(addDays(to, -1)),
    };
  };

  return {
    annual,
    sick: cycleBalance("sick", SICK_CYCLE_MONTHS, workDays.length * 6, emp.openingSick),
    family: cycleBalance("family", FAMILY_CYCLE_MONTHS, FAMILY_DAYS, emp.openingFamily),
  };
}

// ——— Phones & WhatsApp ———

/** Digits in international format for wa.me — South African local numbers (0XX…) become 27XX…. */
export function waPhone(phone: string | null | undefined) {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("0")) return `27${digits.slice(1)}`;
  if (digits.length === 9 && /^[6-8]/.test(digits)) return `27${digits}`;
  return digits;
}

export const phoneKey = (phone: string | null | undefined) => (phone ?? "").replace(/\D/g, "").slice(-9);

export const fmtDays = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(2).replace(/0$/, "")} day${n === 1 ? "" : "s"}`;

export function fmtLeaveRange(start: Date | string, end: Date | string) {
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" };
  const s = asDate(start).toLocaleDateString("en-ZA", opts);
  const e = asDate(end).toLocaleDateString("en-ZA", opts);
  return s === e ? s : `${s} – ${e}`;
}
