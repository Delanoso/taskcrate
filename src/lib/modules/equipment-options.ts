export const CATEGORIES = [
  { key: "it", label: "Laptop / IT" },
  { key: "phone", label: "Phone / radio" },
  { key: "power_tool", label: "Power tool" },
  { key: "hand_tool", label: "Hand tool" },
  { key: "ppe", label: "PPE" },
  { key: "keys", label: "Keys / access card" },
  { key: "vehicle", label: "Vehicle / fuel card" },
  { key: "measuring", label: "Measuring instrument" },
  { key: "other", label: "Other" },
] as const;

export const CONDITIONS = [
  { key: "new", label: "New" },
  { key: "good", label: "Good" },
  { key: "fair", label: "Fair (worn)" },
  { key: "poor", label: "Poor" },
  { key: "damaged", label: "Damaged" },
] as const;

export const ITEM_STATUS = {
  available: "In store",
  issued: "Issued",
  repair: "In repair",
  lost: "Lost / stolen",
  retired: "Written off",
} as const;

export const ISSUE_STATUS = {
  awaiting_signature: "Awaiting signature",
  active: "Signed out",
  returned: "Returned",
  lost: "Lost / not returned",
  cancelled: "Cancelled",
} as const;

export const OUTCOMES = [
  { key: "stock", label: "Back into store", itemStatus: "available" },
  { key: "repair", label: "Send for repair", itemStatus: "repair" },
  { key: "retired", label: "Write off (beyond repair)", itemStatus: "retired" },
  { key: "lost", label: "Not returned / lost", itemStatus: "lost" },
] as const;

export const CHECKLIST = [
  { key: "complete", label: "Returned complete (all parts, chargers, cases)" },
  { key: "working", label: "Powers on / works correctly" },
  { key: "clean", label: "Clean and serviceable" },
  { key: "noNewDamage", label: "No new damage since issue" },
] as const;

export type ChecklistKey = (typeof CHECKLIST)[number]["key"];
export type Checklist = Partial<Record<ChecklistKey, boolean>>;

/** Shown to the employee before signing, printed on the custody PDF. */
export const CUSTODY_TERMS = [
  "The equipment listed remains the property of the company at all times.",
  "I received it in the condition described above and will take reasonable care of it.",
  "I will use it for work purposes only, unless the company has allowed otherwise in writing.",
  "I will report any loss, theft or damage to my supervisor immediately. For theft I will open a SAPS case and supply the case number within 24 hours.",
  "I will return it on request, by the due date (if any), and when my employment ends.",
  "Fair wear and tear excepted, I may be held liable for loss or damage caused by my negligence or misuse, after a fair process. No amount will be deducted from my pay without my separate written consent, as required by section 34 of the Basic Conditions of Employment Act.",
];

export const label = <T extends readonly { key: string; label: string }[]>(list: T, key: string | null | undefined) =>
  list.find((x) => x.key === key)?.label ?? key ?? "-";

export const money = (n: number | null | undefined) =>
  n == null ? "-" : `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
