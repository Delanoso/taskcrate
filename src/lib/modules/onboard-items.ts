export const ONBOARD_ITEMS = [
  { key: "id_document", label: "ID document or passport", hint: "Green ID book, both sides of the smart ID card, or passport photo page", default: true },
  { key: "proof_address", label: "Proof of address", hint: "Utility bill, bank statement or lease not older than 3 months", default: true },
  { key: "bank_letter", label: "Bank confirmation letter", hint: "Letter or stamped statement showing your name and account number", default: true },
  { key: "qualifications", label: "Qualifications / certificates", hint: "Matric, diplomas, degrees, trade certificates", default: false },
  { key: "cv", label: "CV", hint: "", default: false },
  { key: "drivers_licence", label: "Driver's licence", hint: "Photo of the front and back of the card", default: false },
  { key: "prdp", label: "Professional Driving Permit (PrDP)", hint: "", default: false },
  { key: "medical", label: "Medical fitness certificate", hint: "", default: false },
  { key: "police_clearance", label: "Police clearance certificate", hint: "", default: false },
  { key: "work_permit", label: "Work permit / visa", hint: "Non-South African citizens only", default: false },
  { key: "trade_test", label: "Trade test certificate", hint: "", default: false },
  { key: "tax_certificate", label: "SARS tax number proof", hint: "Letter or eFiling screenshot showing your tax number", default: false },
] as const;

export const DEFAULT_ITEMS = ONBOARD_ITEMS.filter((i) => i.default).map((i) => i.key);

export function itemLabel(key: string) {
  if (key.startsWith("custom:")) return key.slice(7);
  return ONBOARD_ITEMS.find((i) => i.key === key)?.label ?? key;
}
export const itemHint = (key: string) => ONBOARD_ITEMS.find((i) => i.key === key)?.hint ?? "";
export const isKnownItem = (key: string) => key.startsWith("custom:") ? key.length > 8 && key.length <= 87 : ONBOARD_ITEMS.some((i) => i.key === key);

/** South African banks with their universal branch codes. */
export const BANKS = [
  { name: "Absa", code: "632005" },
  { name: "African Bank", code: "430000" },
  { name: "Capitec", code: "470010" },
  { name: "Discovery Bank", code: "679000" },
  { name: "FNB", code: "250655" },
  { name: "Investec", code: "580105" },
  { name: "Nedbank", code: "198765" },
  { name: "Standard Bank", code: "051001" },
  { name: "TymeBank", code: "678910" },
] as const;

export const ACCOUNT_TYPES = ["Cheque / current", "Savings", "Transmission"] as const;

export type Personal = {
  firstNames: string;
  surname: string;
  preferredName?: string | null;
  idType: "sa_id" | "passport";
  idNumber: string;
  passportCountry?: string | null;
  dateOfBirth: string;
  gender?: string | null;
  nationality?: string | null;
  cellphone: string;
  email?: string | null;
  homeAddress: string;
  postalCode?: string | null;
  taxNumber?: string | null;
  emergencyName: string;
  emergencyRelationship: string;
  emergencyPhone: string;
};

export type Bank = { bankName: string; accountHolder: string; accountNumber: string; accountType: string; branchCode: string };

/** Checks a 13-digit South African ID number (date + Luhn) and reads date of birth, gender and citizenship. */
export function parseSaId(raw: string, today = new Date()) {
  const id = raw.replace(/\s/g, "");
  if (!/^\d{13}$/.test(id)) return { valid: false as const, reason: "An SA ID number has 13 digits" };
  let sum = 0;
  for (let i = 0; i < 13; i++) {
    let d = Number(id[12 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  if (sum % 10 !== 0) return { valid: false as const, reason: "This ID number is not valid — please check the digits" };
  const yy = Number(id.slice(0, 2));
  const mm = Number(id.slice(2, 4));
  const dd = Number(id.slice(4, 6));
  const century = yy > today.getFullYear() % 100 ? 1900 : 2000;
  const dob = new Date(Date.UTC(century + yy, mm - 1, dd));
  if (dob.getUTCMonth() !== mm - 1 || dob.getUTCDate() !== dd) return { valid: false as const, reason: "The date of birth in this ID number is not valid" };
  return {
    valid: true as const,
    dateOfBirth: dob.toISOString().slice(0, 10),
    gender: Number(id.slice(6, 10)) >= 5000 ? "Male" : "Female",
    citizen: id[10] === "0" ? "South African citizen" : "Permanent resident",
  };
}

export const maskAccount = (n: string) => (n.length > 3 ? `${"•".repeat(Math.min(6, n.length - 3))}${n.slice(-3)}` : n);
