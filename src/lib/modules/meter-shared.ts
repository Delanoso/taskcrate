export const METER_TYPES = [
  { value: "water", label: "Water", unit: "kL" },
  { value: "electricity", label: "Electricity", unit: "kWh" },
] as const;

export type MeterType = (typeof METER_TYPES)[number]["value"];

export type ReadingView = {
  id: string;
  reading: number;
  occupancy: number;
  alerted: boolean;
  readerName: string;
  readerSignature: string | null;
  photoUrl: string | null;
  extraPhotoUrl: string | null;
  note: string | null;
  previousReading: number | null;
  usage: number | null;
  baseline: number | null;
  varianceNote: string | null;
  checkedByName: string | null;
  checkedSignature: string | null;
  checkedAt: string | null;
  checkNote: string | null;
  checkPhotoUrl: string | null;
  createdAt: string;
  legacy: boolean;
};

export type SiteSummary = {
  id: string;
  name: string;
  meterType: string;
  meterNumber: string | null;
  accountNumber: string | null;
  municipality: string | null;
  location: string | null;
  unit: string;
  alertThreshold: number;
  alertPhone: string | null;
  publicToken: string;
  lastReading: number | null;
  lastUsage: number | null;
  lastAt: string | null;
  alertOpen: boolean;
};

export type SiteDetail = SiteSummary & { readings: ReadingView[] };

export function meterTypeLabel(type: string) {
  return METER_TYPES.find((item) => item.value === type)?.label ?? "Meter";
}

export function unitForType(type: string) {
  return METER_TYPES.find((item) => item.value === type)?.unit ?? "units";
}

export function formatAmount(value: number | null, unit: string) {
  if (value == null || Number.isNaN(value)) return "—";
  const amount = value.toLocaleString("en-ZA", { maximumFractionDigits: 2 });
  return `${amount} ${unit}`;
}

export function formatWhen(iso: string | null) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("en-ZA", {
    timeZone: "Africa/Johannesburg",
    dateStyle: "medium",
    timeStyle: "short",
  });
}
