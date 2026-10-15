import { RENT_ZAR } from "@/data/products";

export function rentLabelShort() {
  return `R${RENT_ZAR.toLocaleString("en-ZA")}/mo`;
}

export function rentLabelFull() {
  return rentLabelShort();
}

/** Stripe expects integer cents; ZAR uses cents too (100 cents = R1). */
export function rentAmountCentsZar() {
  return RENT_ZAR * 100;
}

export const TRIAL_DAYS = 7;

type SaDate = { year: number; month: number; day: number };

export function johannesburgDate(now = new Date()): SaDate {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Johannesburg",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { year: read("year"), month: read("month"), day: read("day") };
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

/** First charge covers today through the end of this month. The next debit is the 1st. */
export function monthQuote(now = new Date()) {
  const { year, month, day } = johannesburgDate(now);
  const length = daysInMonth(year, month);
  const daysLeft = length - day + 1;
  const amount = Math.round((RENT_ZAR * daysLeft * 100) / length) / 100;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const billingDate = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
  const periodEnd = new Date(Date.UTC(nextYear, nextMonth - 1, 1) - 2 * 60 * 60 * 1000);
  return { amount, daysLeft, daysInMonth: length, billingDate, periodEnd };
}

export function isAcceptedCharge(amountGross: string, now = new Date()) {
  const paid = Number(amountGross);
  if (!Number.isFinite(paid)) return false;
  if (Math.abs(paid - RENT_ZAR) <= 0.01) return true;
  const { year, month } = johannesburgDate(now);
  const months = [
    { year, month },
    month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 },
  ];
  for (const item of months) {
    const length = daysInMonth(item.year, item.month);
    for (let day = 1; day <= length; day++) {
      const expected = Math.round((RENT_ZAR * (length - day + 1) * 100) / length) / 100;
      if (Math.abs(paid - expected) <= 0.01) return true;
    }
  }
  return false;
}

export function trialEndsAt(from = new Date()) {
  return new Date(from.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
}

/** 082 and +27 82 become the same key. */
export function phoneKey(input: string) {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = `27${digits.slice(1)}`;
  if (digits.length < 11 || digits.length > 15) return null;
  return digits;
}

export function companyKey(name: string) {
  const key = name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\(pty\)\s*ltd|pty\s*ltd|\blimited\b|\bincorporated\b|\binc\b|\bcc\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
  return key.length >= 2 ? key : null;
}

