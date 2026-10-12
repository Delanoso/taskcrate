export const PERMIT_HAZARDS = [
  { key: "heights", label: "Working at heights / ladder use" },
  { key: "electrical", label: "Live electrical circuits" },
  { key: "mechanical", label: "Moving mechanical components" },
  { key: "chemicals", label: "Hazardous substances / chemical exposure" },
  { key: "hotWork", label: "Hot work or fire hazards" },
] as const;

export const PERMIT_PPE = [
  { key: "respirator", label: "Respirator" },
  { key: "goggles", label: "Safety goggles" },
  { key: "faceShield", label: "Face shield" },
  { key: "hardHat", label: "Hard hat" },
  { key: "gloves", label: "Cut / chemical gloves" },
  { key: "harness", label: "Fall-arrest harness" },
  { key: "hearing", label: "Hearing protection" },
] as const;

export const PERMIT_MAX_DURATION_MS = 24 * 60 * 60 * 1000;
export const PERMIT_DEFAULT_DURATION_MS = 8 * 60 * 60 * 1000;

const HAZARD_KEYS = new Set<string>(PERMIT_HAZARDS.map((h) => h.key));
const PPE_KEYS = new Set<string>(PERMIT_PPE.map((p) => p.key));

export function isHazardKey(k: string) {
  return HAZARD_KEYS.has(k);
}

export function isPpeKey(k: string) {
  return PPE_KEYS.has(k);
}

export function parseJsonKeys(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function labelKeys(
  keys: string[],
  catalog: readonly { key: string; label: string }[],
): string[] {
  return keys.map((k) => catalog.find((c) => c.key === k)?.label ?? k);
}

/** Value for an `<input type="datetime-local">` in the browser's local time. */
export function toDatetimeLocalValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
