/**
 * SARS employees' tax for the 2027 year of assessment (1 March 2026 – 28 February 2027),
 * published 25 February 2026. UIF ceiling R17,712 a month (from 1 June 2021).
 * Retirement contributions reduce tax up to 27.5% of remuneration, capped at R350,000 a year.
 */
export const TAX_YEAR_LABEL = "1 March 2026 to 28 February 2027";
export const UIF_CEILING_CENTS = 1_771_200;
export const UIF_RATE = 0.01;
export const SDL_RATE = 0.01;
const RETIREMENT_RATE = 0.275;
const RETIREMENT_CAP_CENTS = 35_000_000;
const PRIMARY_REBATE = 1_782_000;
const SECONDARY_REBATE = 976_500;
const TERTIARY_REBATE = 324_900;
const MEDICAL_FIRST = 37_600;
const MEDICAL_EXTRA = 25_400;

const BRACKETS: { upTo: number; rate: number; base: number; above: number }[] = [
  { upTo: 24_510_000, rate: 0.18, base: 0, above: 0 },
  { upTo: 38_310_000, rate: 0.26, base: 4_411_800, above: 24_510_000 },
  { upTo: 53_020_000, rate: 0.31, base: 7_999_800, above: 38_310_000 },
  { upTo: 69_580_000, rate: 0.36, base: 12_559_900, above: 53_020_000 },
  { upTo: 88_700_000, rate: 0.39, base: 18_521_500, above: 69_580_000 },
  { upTo: 187_860_000, rate: 0.41, base: 25_978_300, above: 88_700_000 },
  { upTo: Number.POSITIVE_INFINITY, rate: 0.45, base: 66_633_900, above: 187_860_000 },
];

export type PayInput = {
  period: string;
  basicCents: number;
  allowanceCents: number;
  onceOffCents: number;
  pensionCents: number;
  employerPensionCents: number;
  medicalMember: boolean;
  medicalDependants: number;
  medicalDeductionCents: number;
  paysUif: boolean;
  paySdl: boolean;
  dateOfBirth: string | null;
};

export type PayResult = {
  cashGrossCents: number;
  taxableMonthlyCents: number;
  payeCents: number;
  uifEmployeeCents: number;
  uifEmployerCents: number;
  sdlCents: number;
  medicalCreditCents: number;
  netCents: number;
  employerCostCents: number;
  ageAtYearEnd: number | null;
  rebateLabel: string;
  notes: string[];
};

export function taxYearEnd(period: string) {
  const [year, month] = period.split("-").map(Number);
  const endYear = month >= 3 ? year + 1 : year;
  return `${endYear}-02-28`;
}

export function ageOn(dob: string, on: string) {
  const [y1, m1, d1] = dob.split("-").map(Number);
  const [y2, m2, d2] = on.split("-").map(Number);
  let age = y2 - y1;
  if (m2 < m1 || (m2 === m1 && d2 < d1)) age -= 1;
  return age;
}

export function payDateFor(period: string, payDay: number) {
  const [year, month] = period.split("-").map(Number);
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const day = Math.min(Math.max(payDay, 1), last);
  return `${period}-${String(day).padStart(2, "0")}`;
}

function annualTax(taxableCents: number) {
  if (taxableCents <= 0) return 0;
  const bracket = BRACKETS.find((item) => taxableCents <= item.upTo) ?? BRACKETS[BRACKETS.length - 1];
  return Math.round(bracket.base + (taxableCents - bracket.above) * bracket.rate);
}

export function medicalCreditCents(member: boolean, dependants: number) {
  const people = Math.max(0, dependants);
  const memberCredit = member ? MEDICAL_FIRST : 0;
  const firstDependant = people > 0 ? MEDICAL_FIRST : 0;
  const extra = Math.max(0, people - 1) * MEDICAL_EXTRA;
  return memberCredit + firstDependant + extra;
}

export function calculatePayslip(input: PayInput): PayResult {
  const notes: string[] = [];
  const cashGross = input.basicCents + input.allowanceCents + input.onceOffCents;
  const employerPension = Math.max(0, input.employerPensionCents);
  const employeePension = Math.max(0, input.pensionCents);
  const remuneration = cashGross + employerPension;
  const annualRemuneration = remuneration * 12;
  const annualRetirement = Math.min(
    (employeePension + employerPension) * 12,
    Math.round(annualRemuneration * RETIREMENT_RATE),
    RETIREMENT_CAP_CENTS,
  );
  const taxableAnnual = Math.max(0, annualRemuneration - annualRetirement);
  const yearEnd = taxYearEnd(input.period);
  const age = input.dateOfBirth ? ageOn(input.dateOfBirth, yearEnd) : null;
  let rebates = PRIMARY_REBATE;
  let rebateLabel = "Under 65";
  if (age == null) {
    rebateLabel = "Date of birth not on file";
    notes.push("No date of birth, so only the under-65 rebate was used.");
  } else if (age >= 75) {
    rebates += SECONDARY_REBATE + TERTIARY_REBATE;
    rebateLabel = "75 and older";
  } else if (age >= 65) {
    rebates += SECONDARY_REBATE;
    rebateLabel = "65 and older";
  }
  const credit = medicalCreditCents(input.medicalMember, input.medicalDependants);
  const payeAnnual = Math.max(0, annualTax(taxableAnnual) - rebates - credit * 12);
  const paye = Math.round(payeAnnual / 12);
  const uifBase = Math.min(Math.max(cashGross, 0), UIF_CEILING_CENTS);
  const uif = input.paysUif ? Math.round(uifBase * UIF_RATE) : 0;
  const sdl = input.paySdl ? Math.round(Math.max(cashGross, 0) * SDL_RATE) : 0;
  const medicalDeduction = Math.max(0, input.medicalDeductionCents);
  const net = cashGross - paye - uif - employeePension - medicalDeduction;
  if (net < 0) notes.push("Deductions are higher than the gross pay.");
  if (!input.paysUif) notes.push("UIF is switched off for this person.");
  return {
    cashGrossCents: cashGross,
    taxableMonthlyCents: Math.round(taxableAnnual / 12),
    payeCents: paye,
    uifEmployeeCents: uif,
    uifEmployerCents: uif,
    sdlCents: sdl,
    medicalCreditCents: credit,
    netCents: net,
    employerCostCents: cashGross + uif + sdl + employerPension,
    ageAtYearEnd: age,
    rebateLabel,
    notes,
  };
}

export function formatRand(cents: number) {
  const negative = cents < 0;
  const abs = Math.abs(Math.round(cents));
  const whole = Math.floor(abs / 100).toLocaleString("en-ZA");
  const frac = String(abs % 100).padStart(2, "0");
  return `${negative ? "-" : ""}R ${whole}.${frac}`;
}

export function randsToCents(value: number) {
  return Math.round(value * 100);
}

/** First six digits of a South African ID number are the date of birth. */
export function dobFromSaId(idNumber: string | null | undefined) {
  const digits = (idNumber ?? "").replace(/\D/g, "");
  if (digits.length < 6) return null;
  const yy = Number(digits.slice(0, 2));
  const mm = digits.slice(2, 4);
  const dd = digits.slice(4, 6);
  if (Number(mm) < 1 || Number(mm) > 12 || Number(dd) < 1 || Number(dd) > 31) return null;
  const now = new Date();
  const year = yy <= now.getFullYear() % 100 ? 2000 + yy : 1900 + yy;
  return `${year}-${mm}-${dd}`;
}
