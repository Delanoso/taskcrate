export const PERMIT_HAZARDS = [
  { key: "heights", label: "Working at heights / ladder use" },
  { key: "fallingObjects", label: "Overhead work / falling objects" },
  { key: "electrical", label: "Live electrical circuits" },
  { key: "mechanical", label: "Moving mechanical components" },
  { key: "pressure", label: "Pressurised systems (steam, gas, hydraulics, air)" },
  { key: "chemicals", label: "Hazardous substances / chemical exposure" },
  { key: "hotWork", label: "Hot work or fire hazards (welding, cutting, grinding)" },
  { key: "flammables", label: "Flammable gases, liquids or explosive atmosphere" },
  { key: "confinedSpace", label: "Confined space entry" },
  { key: "excavation", label: "Excavation / trenching" },
  { key: "lifting", label: "Lifting operations (cranes, hoists, slings)" },
  { key: "vehicles", label: "Vehicle / forklift traffic" },
  { key: "manualHandling", label: "Manual handling / heavy loads" },
  { key: "sharpEdges", label: "Sharp edges / cutting tools" },
  { key: "noise", label: "High noise levels" },
  { key: "dust", label: "Dust, fumes or poor air quality" },
  { key: "slipsTrips", label: "Slips, trips and uneven surfaces" },
  { key: "extremeTemp", label: "Extreme heat or cold" },
] as const;

export const PERMIT_PPE = [
  { key: "safetyShoes", label: "Safety shoes / boots" },
  { key: "hardHat", label: "Hard hat" },
  { key: "goggles", label: "Safety goggles / glasses" },
  { key: "faceShield", label: "Face shield" },
  { key: "weldingHelmet", label: "Welding helmet" },
  { key: "gloves", label: "Safety gloves" },
  { key: "chemGloves", label: "Chemical-resistant gloves" },
  { key: "cutGloves", label: "Cut-resistant gloves" },
  { key: "hearing", label: "Hearing protection" },
  { key: "dustMask", label: "Dust mask (FFP2 / FFP3)" },
  { key: "respirator", label: "Respirator" },
  { key: "hiVis", label: "High-visibility vest" },
  { key: "overalls", label: "Overalls / coveralls" },
  { key: "flameRetardant", label: "Flame-retardant clothing" },
  { key: "apron", label: "Welding / chemical apron" },
  { key: "harness", label: "Fall-arrest harness" },
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
