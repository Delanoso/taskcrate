export const TICKET_TYPES = [
  "Forklift licence",
  "First aid",
  "Professional driving permit",
  "Medical certificate",
  "Fire fighting",
  "Working at heights",
  "Other",
] as const;

export function todayIso() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Johannesburg" });
}

export function addDays(iso: string, days: number) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function ticketState(expiresOn: string, today = todayIso()) {
  if (expiresOn < today) return "expired" as const;
  if (expiresOn <= addDays(today, 30)) return "due" as const;
  return "valid" as const;
}
