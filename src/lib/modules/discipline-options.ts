export type Severity = "minor" | "serious" | "dismissible";

/** Common South African disciplinary code. Severity guides the suggested sanction; the employer decides. */
export const OFFENCES: { key: string; label: string; severity: Severity; charge: string }[] = [
  { key: "late", label: "Late coming / poor timekeeping", severity: "minor", charge: "Late coming: you reported for duty late without a valid reason or prior permission." },
  { key: "early_leave", label: "Leaving work early without permission", severity: "minor", charge: "You left your workplace before the end of your shift without permission." },
  { key: "absent_station", label: "Absent from work station", severity: "minor", charge: "You were absent from your work station during working hours without permission." },
  { key: "cellphone", label: "Unauthorised cellphone use", severity: "minor", charge: "You used your cellphone during working time contrary to company rules." },
  { key: "smoking", label: "Smoking in a prohibited area", severity: "minor", charge: "You smoked in an area where smoking is prohibited." },
  { key: "housekeeping", label: "Poor housekeeping", severity: "minor", charge: "You failed to keep your work area clean, tidy and safe as required." },
  { key: "procedure", label: "Failure to follow procedure", severity: "minor", charge: "You failed to follow a reasonable and known work procedure." },
  { key: "awol_short", label: "Absent without leave (1-3 days)", severity: "serious", charge: "You were absent from work without leave or a valid reason and failed to notify your supervisor." },
  { key: "insubordination", label: "Insubordination / refusing an instruction", severity: "serious", charge: "You refused to carry out a reasonable and lawful instruction given by your supervisor." },
  { key: "negligence", label: "Negligence", severity: "serious", charge: "You performed your duties negligently, which caused or could have caused loss or damage." },
  { key: "ppe", label: "Failure to wear PPE / safety rule breach", severity: "serious", charge: "You failed to wear the prescribed personal protective equipment / breached a safety rule." },
  { key: "abusive", label: "Abusive or offensive language", severity: "serious", charge: "You used abusive, offensive or threatening language towards a colleague, client or supervisor." },
  { key: "damage_negligent", label: "Damage to company property (negligent)", severity: "serious", charge: "Through negligence you caused damage to company property." },
  { key: "sleeping", label: "Sleeping on duty", severity: "serious", charge: "You were found sleeping while on duty." },
  { key: "unauth_use", label: "Unauthorised use of company property / vehicle", severity: "serious", charge: "You used company property or a company vehicle without authorisation." },
  { key: "intoxicated", label: "Under the influence of alcohol or drugs", severity: "serious", charge: "You reported for duty / were on duty under the influence of alcohol or drugs." },
  { key: "theft", label: "Theft", severity: "dismissible", charge: "You stole, or attempted to steal, property belonging to the company, a colleague or a client." },
  { key: "fraud", label: "Fraud / dishonesty", severity: "dismissible", charge: "You acted dishonestly / committed fraud to the prejudice of the company." },
  { key: "falsification", label: "Falsifying records", severity: "dismissible", charge: "You falsified company records (e.g. time sheets, job cards, claims or registers)." },
  { key: "assault", label: "Assault / fighting", severity: "dismissible", charge: "You assaulted, or were involved in a physical fight with, another person on company premises or while on duty." },
  { key: "gross_insubordination", label: "Gross insubordination", severity: "dismissible", charge: "You wilfully and seriously challenged the authority of the employer / a supervisor." },
  { key: "gross_negligence", label: "Gross negligence", severity: "dismissible", charge: "You were grossly negligent in performing your duties, causing serious loss, damage or risk." },
  { key: "wilful_damage", label: "Wilful damage to property", severity: "dismissible", charge: "You wilfully damaged company property." },
  { key: "abscondment", label: "Absconding (absent more than 3 days)", severity: "dismissible", charge: "You were absent from work for more than three consecutive days without permission or notification." },
  { key: "harassment", label: "Sexual harassment", severity: "dismissible", charge: "You sexually harassed a colleague, client or other person in the workplace." },
  { key: "racism", label: "Racist or hate speech", severity: "dismissible", charge: "You used racist, discriminatory or hateful language or conduct." },
  { key: "intimidation", label: "Intimidation / threats", severity: "dismissible", charge: "You intimidated or threatened a colleague, supervisor or other person." },
  { key: "safety_life", label: "Serious safety breach endangering life", severity: "dismissible", charge: "You committed a serious breach of safety rules which endangered your life or the lives of others." },
  { key: "drugs_possession", label: "Possession of alcohol / drugs on site", severity: "dismissible", charge: "You were in possession of alcohol or illegal drugs on company premises." },
  { key: "other", label: "Other (describe)", severity: "serious", charge: "" },
];

export const SANCTIONS = [
  { key: "counselling", label: "Counselling", doc: "Record of counselling", warning: false },
  { key: "verbal", label: "Verbal warning", doc: "Record of verbal warning", warning: true },
  { key: "written", label: "Written warning", doc: "Written warning", warning: true },
  { key: "final", label: "Final written warning", doc: "Final written warning", warning: true },
  { key: "dismissal", label: "Dismissal", doc: "Notice of dismissal", warning: false },
  { key: "not_guilty", label: "Not guilty / no sanction", doc: "Disciplinary outcome", warning: false },
] as const;
export type SanctionKey = (typeof SANCTIONS)[number]["key"];
export const SANCTION_KEYS = SANCTIONS.map((s) => s.key) as [SanctionKey, ...SanctionKey[]];

export const STATUSES = [
  { key: "open", label: "Investigating" },
  { key: "hearing", label: "Hearing scheduled" },
  { key: "issued", label: "Awaiting signature" },
  { key: "finalised", label: "Finalised" },
  { key: "withdrawn", label: "Withdrawn" },
] as const;

export const SEVERITY_LABEL: Record<Severity, string> = {
  minor: "Minor",
  serious: "Serious",
  dismissible: "Dismissible on first offence",
};

export const offenceByKey = (k: string | null | undefined) => OFFENCES.find((o) => o.key === k);
export const sanctionLabel = (k: string | null | undefined) => SANCTIONS.find((s) => s.key === k)?.label ?? (k === "pending" ? "Not decided" : k ?? "-");
export const sanctionDoc = (k: string | null | undefined) => SANCTIONS.find((s) => s.key === k)?.doc ?? "Disciplinary outcome";
export const isWarning = (k: string | null | undefined) => !!SANCTIONS.find((s) => s.key === k)?.warning;
export const statusLabel = (k: string) => STATUSES.find((s) => s.key === k)?.label ?? k;

const RANK: Record<string, number> = { counselling: 0, verbal: 1, written: 2, final: 3 };

/**
 * Progressive discipline suggestion from the employee's active (unexpired) warnings and the offence severity.
 * Schedule 8 of the LRA: dismissal for a first offence only when the misconduct is serious enough
 * to make continued employment intolerable; otherwise warnings escalate.
 */
export function suggestSanction(severity: Severity, activeWarnings: string[]): { sanction: SanctionKey; hearing: boolean; why: string } {
  const top = Math.max(-1, ...activeWarnings.map((w) => RANK[w] ?? -1));
  if (severity === "dismissible") {
    return { sanction: "dismissal", hearing: true, why: "Offence is serious enough for dismissal on a first offence. Hold a disciplinary hearing first." };
  }
  if (top >= 3) {
    return { sanction: "dismissal", hearing: true, why: "Employee already has an active final written warning. A hearing is required before dismissal." };
  }
  if (severity === "serious") {
    return top >= 2
      ? { sanction: "final", hearing: false, why: "Serious offence with an active written warning." }
      : { sanction: "written", hearing: false, why: "Serious offence; starts at a written warning." };
  }
  const next = (["verbal", "written", "final"] as const)[Math.min(2, top + 1)] ?? "verbal";
  return { sanction: next, hearing: false, why: top < 0 ? "No active warnings; minor offence." : "Escalates from the employee's current active warning." };
}

export const RIGHTS = [
  "You have the right to be represented at the hearing by a fellow employee or a shop steward of a recognised trade union.",
  "You have the right to an interpreter in the language of your choice.",
  "You may call witnesses and present evidence in your defence, and question the company's witnesses.",
  "You may state your case and give mitigating circumstances before any sanction is decided.",
  "If you fail to attend without a valid reason, the hearing may continue in your absence.",
];
