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

/** `requiredFor`: hazard keys that make this precaution mandatory. */
export const PERMIT_PRECAUTIONS: readonly {
  key: string;
  label: string;
  requiredFor: readonly string[];
}[] = [
  {
    key: "loto",
    label: "Energy isolation: power, valves or locks engaged (LOTO)",
    requiredFor: ["electrical", "mechanical", "pressure"],
  },
  { key: "zeroEnergy", label: "Zero-energy state tested after isolation", requiredFor: ["electrical", "pressure"] },
  {
    key: "barricades",
    label: "Area barricaded and warning signs in place",
    requiredFor: ["heights", "fallingObjects", "excavation", "lifting"],
  },
  { key: "extinguisher", label: "Fire extinguisher on standby", requiredFor: ["hotWork", "flammables"] },
  { key: "fireWatch", label: "Fire watch person assigned", requiredFor: ["hotWork"] },
  { key: "combustibles", label: "Combustibles removed or covered (10 m radius)", requiredFor: ["hotWork"] },
  { key: "gasTest", label: "Gas / atmosphere test done and safe", requiredFor: ["confinedSpace", "flammables"] },
  { key: "ventilation", label: "Ventilation or fume extraction in place", requiredFor: ["confinedSpace", "dust"] },
  { key: "standby", label: "Standby / rescue person present", requiredFor: ["confinedSpace"] },
  { key: "fallProtection", label: "Fall protection and anchor points inspected", requiredFor: ["heights"] },
  { key: "ladders", label: "Ladders / scaffolding inspected and tagged", requiredFor: [] },
  { key: "liftingGear", label: "Lifting gear inspected and certified", requiredFor: ["lifting"] },
  { key: "services", label: "Underground services located; excavation shored", requiredFor: ["excavation"] },
  { key: "traffic", label: "Traffic control / banksman in place", requiredFor: ["vehicles"] },
  { key: "sds", label: "Safety data sheets (SDS) available", requiredFor: ["chemicals"] },
  { key: "spillKit", label: "Spill kit available", requiredFor: [] },
  { key: "toolsInspected", label: "Tools and equipment inspected before use", requiredFor: [] },
  { key: "firstAid", label: "First aid kit and first aider available", requiredFor: [] },
  { key: "emergency", label: "Emergency procedure and escape route known", requiredFor: [] },
  { key: "briefing", label: "Workers briefed on hazards and controls", requiredFor: [] },
];

export function requiredPrecautions(hazardKeys: readonly string[]) {
  return PERMIT_PRECAUTIONS.filter((p) => p.requiredFor.some((h) => hazardKeys.includes(h)));
}

export function isPrecautionKey(k: string) {
  return PERMIT_PRECAUTIONS.some((p) => p.key === k);
}

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
