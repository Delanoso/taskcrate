/** Contractor safety file catalogue (OHS Act 85 of 1993, Construction Regulations 2014, GSR). */

export type SafetyFileItem = {
  key: string;
  label: string;
  /** Documents for this item carry an expiry date, and the item lapses when all have expired. */
  expires: boolean;
  hint?: string;
};

export type SafetyFileGroup = { id: string; label: string; items: SafetyFileItem[] };

export const SAFETY_FILE_GROUPS: SafetyFileGroup[] = [
  {
    id: "company",
    label: "Company & legal",
    items: [
      { key: "coida", label: "COIDA Letter of Good Standing", expires: true },
      { key: "liability", label: "Public liability insurance", expires: true },
      { key: "company-reg", label: "Company registration (CIPC)", expires: false },
      { key: "tax-pin", label: "SARS tax compliance status / PIN", expires: true },
      { key: "bbbee", label: "B-BBEE certificate / affidavit", expires: true },
      { key: "section-37-2", label: "Section 37(2) mandatary agreement", expires: false, hint: "Signed agreement between client and contractor" },
      { key: "appointment-letter", label: "Letter of appointment / contract / order", expires: false },
      { key: "bank-letter", label: "Bank confirmation letter", expires: false },
    ],
  },
  {
    id: "management",
    label: "Health & safety management",
    items: [
      { key: "hs-policy", label: "Health & safety policy (signed by CEO)", expires: false },
      { key: "hs-plan", label: "Health & safety plan", expires: false },
      { key: "organogram", label: "Health & safety organogram", expires: false },
      { key: "baseline-ra", label: "Baseline risk assessment", expires: false },
      { key: "task-ra", label: "Task / activity risk assessments", expires: false },
      { key: "swp", label: "Safe work procedures / method statements", expires: false },
      { key: "fall-protection-plan", label: "Fall protection plan", expires: false },
      { key: "emergency-plan", label: "Emergency preparedness & response plan", expires: false },
      { key: "incident-procedure", label: "Incident reporting & investigation procedure", expires: false },
      { key: "environmental-plan", label: "Environmental / waste management plan", expires: false },
    ],
  },
  {
    id: "appointments",
    label: "Legal appointments",
    items: [
      { key: "16-2", label: "Section 16(2) appointment (CEO assignee)", expires: false },
      { key: "cr-8-1", label: "Construction manager appointment — CR 8(1)", expires: false },
      { key: "cr-8-7", label: "Construction supervisor appointment — CR 8(7)", expires: false },
      { key: "safety-officer", label: "Safety officer appointment + SACPCMP registration", expires: true },
      { key: "hs-rep", label: "Health & safety representative — Section 17", expires: false },
      { key: "first-aider", label: "First aider appointment + certificate", expires: true },
      { key: "fire-fighter", label: "Fire fighter appointment + training", expires: true },
      { key: "competent-persons", label: "Competent person appointments", expires: false, hint: "Scaffolding, excavations, fall protection, ladders, etc." },
      { key: "equipment-inspector", label: "Equipment / power tool inspector appointment", expires: false },
    ],
  },
  {
    id: "workers",
    label: "Workers & training",
    items: [
      { key: "employee-list", label: "Employee list with ID copies", expires: false },
      { key: "medical", label: "Medical certificates of fitness", expires: true },
      { key: "induction", label: "Site induction records", expires: false },
      { key: "training", label: "Training certificates / competencies", expires: true },
      { key: "work-at-height", label: "Working at heights training", expires: true },
      { key: "operator-licences", label: "Operator licences (forklift, crane, TLB, etc.)", expires: true },
      { key: "ppe-register", label: "PPE issue register", expires: false },
      { key: "toolbox-records", label: "Toolbox talk records", expires: false },
    ],
  },
  {
    id: "equipment",
    label: "Plant, equipment & substances",
    items: [
      { key: "equipment-register", label: "Plant & equipment register + inspections", expires: false },
      { key: "lifting-certs", label: "Lifting equipment load test certificates", expires: true },
      { key: "vehicle-docs", label: "Vehicle licences & driver PrDPs", expires: true },
      { key: "electrical-coc", label: "Electrical certificate of compliance (COC)", expires: false },
      { key: "hazardous-substances", label: "Hazardous substance register + SDS sheets", expires: false },
      { key: "fire-equipment", label: "Fire equipment service certificates", expires: true },
      { key: "scaffold-register", label: "Scaffold inspection register", expires: false },
    ],
  },
];

export const SAFETY_FILE_ITEMS: SafetyFileItem[] = SAFETY_FILE_GROUPS.flatMap((g) => g.items);

const BY_KEY = new Map(SAFETY_FILE_ITEMS.map((i) => [i.key, i]));

/** Profiles created before requirements were selectable asked for exactly these. */
export const LEGACY_REQUIREMENTS = ["coida", "liability", "medical"];

export const SAFETY_FILE_PRESETS: { id: string; label: string; keys: string[] }[] = [
  {
    id: "basic",
    label: "Low-risk service",
    keys: ["coida", "liability", "company-reg", "tax-pin", "section-37-2", "hs-policy", "task-ra", "16-2", "employee-list", "induction"],
  },
  {
    id: "standard",
    label: "Standard contractor",
    keys: [
      "coida", "liability", "company-reg", "tax-pin", "section-37-2", "appointment-letter",
      "hs-policy", "hs-plan", "organogram", "baseline-ra", "task-ra", "swp", "emergency-plan", "incident-procedure",
      "16-2", "hs-rep", "first-aider", "fire-fighter",
      "employee-list", "medical", "induction", "training", "ppe-register",
      "equipment-register", "hazardous-substances",
    ],
  },
  {
    id: "construction",
    label: "Construction (full file)",
    keys: SAFETY_FILE_ITEMS.map((i) => i.key).filter((k) => !["bank-letter", "bbbee"].includes(k)),
  },
];

/** Custom requirements are stored as "custom:<label>". */
export function resolveItem(key: string): SafetyFileItem {
  if (key.startsWith("custom:")) return { key, label: key.slice(7), expires: false };
  return BY_KEY.get(key) ?? { key, label: key, expires: false };
}

export function parseRequirements(json: string | null | undefined): string[] {
  try {
    const keys = JSON.parse(json || "[]");
    if (Array.isArray(keys) && keys.length) return keys.filter((k): k is string => typeof k === "string");
  } catch {
    // fall through to legacy
  }
  return LEGACY_REQUIREMENTS;
}

export function isValidRequirementKey(key: string) {
  return BY_KEY.has(key) || (/^custom:.{2,80}$/.test(key) && !/[\r\n]/.test(key));
}

export type ItemState = "missing" | "ok" | "expiring" | "expired";

type DocLike = { docType: string; expiresAt: Date | string | null };

const DAY = 86_400_000;

export function evaluateSafetyFile(requirements: string[], docs: DocLike[], now = new Date()) {
  const items = requirements.map((key) => {
    const item = resolveItem(key);
    const mine = docs.filter((d) => d.docType === key);
    let state: ItemState = "missing";
    if (mine.length) {
      if (!item.expires) state = "ok";
      else {
        const latest = Math.max(...mine.map((d) => (d.expiresAt ? new Date(d.expiresAt).getTime() : Infinity)));
        state = latest < now.getTime() ? "expired" : latest - now.getTime() < 30 * DAY ? "expiring" : "ok";
      }
    }
    return { ...item, state, count: mine.length };
  });
  const done = items.filter((i) => i.state === "ok" || i.state === "expiring").length;
  const status = items.some((i) => i.state === "expired")
    ? "blocked"
    : done === items.length
      ? "active"
      : "pending";
  return { items, done, total: items.length, status };
}
