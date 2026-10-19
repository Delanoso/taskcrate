type SaParts = { year: number; month: number; day: number; hour: number };

export function johannesburgParts(now = new Date()): SaParts {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Johannesburg",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const hour = read("hour");
  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: hour === 24 ? 0 : hour,
  };
}

/** Whole Johannesburg calendar days from today until the trial end date. */
export function calendarDaysUntil(end: Date, now = new Date()) {
  const today = johannesburgParts(now);
  const last = johannesburgParts(end);
  const from = Date.UTC(today.year, today.month - 1, today.day);
  const to = Date.UTC(last.year, last.month - 1, last.day);
  return Math.round((to - from) / 86_400_000);
}

/**
 * 2 on the morning two calendar days before the trial ends.
 * 1 the next morning if that reminder was missed.
 * Quiet before 08:00 Johannesburg time.
 */
export function trialReminderDay(end: Date, now = new Date()) {
  if (johannesburgParts(now).hour < 8) return null;
  const days = calendarDaysUntil(end, now);
  if (days === 2 || days === 1) return days;
  return null;
}
