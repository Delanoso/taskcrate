export const CURRENCIES = [
  { code: "ZAR", name: "South African rand", symbol: "R" },
  { code: "USD", name: "US dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "EUR" },
  { code: "GBP", name: "British pound", symbol: "GBP" },
  { code: "AUD", name: "Australian dollar", symbol: "A$" },
  { code: "NAD", name: "Namibian dollar", symbol: "N$" },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]["code"];

export type LineInput = {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
};

export type BuiltInTemplate = {
  name: string;
  notes: string;
  terms: string;
  lines: LineInput[];
};

export const BUILTIN_TEMPLATES: BuiltInTemplate[] = [
  {
    name: "Professional services",
    notes: "Thank you for the chance to quote on this work.",
    terms: "This quotation is valid for the period shown. Work starts after you accept it in writing. An invoice follows, payable on the terms shown.",
    lines: [
      { description: "Professional services", quantity: 1, unit: "hour", unitPrice: 0 },
      { description: "Disbursements", quantity: 1, unit: "each", unitPrice: 0 },
    ],
  },
  {
    name: "Goods supplied",
    notes: "Goods remain ours until the invoice is paid in full.",
    terms: "Prices are for the goods described. Delivery is included only where a delivery line is shown. Payment is due on the date of the invoice.",
    lines: [
      { description: "Goods", quantity: 1, unit: "each", unitPrice: 0 },
      { description: "Delivery", quantity: 1, unit: "each", unitPrice: 0 },
    ],
  },
  {
    name: "Call-out and repairs",
    notes: "The call-out covers travel to site. Parts are charged as used.",
    terms: "Work is warranted for 30 days against faulty workmanship. Payment is due on the terms shown on the invoice.",
    lines: [
      { description: "Call-out fee", quantity: 1, unit: "each", unitPrice: 0 },
      { description: "Labour", quantity: 1, unit: "hour", unitPrice: 0 },
      { description: "Parts", quantity: 1, unit: "each", unitPrice: 0 },
    ],
  },
  {
    name: "Monthly retainer",
    notes: "This covers the agreed monthly service.",
    terms: "The retainer is billed in advance and is payable on the terms shown. Work outside the retainer is quoted separately.",
    lines: [{ description: "Monthly retainer", quantity: 1, unit: "month", unitPrice: 0 }],
  },
];

export function isCurrency(code: string): code is CurrencyCode {
  return CURRENCIES.some((c) => c.code === code);
}

export function formatMoney(cents: number, currency: string) {
  const symbol = CURRENCIES.find((c) => c.code === currency)?.symbol ?? currency;
  const negative = cents < 0;
  const abs = Math.abs(Math.round(cents));
  const whole = Math.floor(abs / 100).toLocaleString("en-ZA");
  const frac = String(abs % 100).padStart(2, "0");
  return `${negative ? "-" : ""}${symbol} ${whole}.${frac}`;
}

export function priceTotals(lines: LineInput[], chargeVat: boolean, vatPercent: number) {
  const subtotalCents = lines.reduce(
    (sum, line) => sum + Math.round((Number(line.quantity) || 0) * Math.round((Number(line.unitPrice) || 0) * 100)),
    0,
  );
  const vatCents = chargeVat ? Math.round(subtotalCents * (vatPercent / 100)) : 0;
  return { subtotalCents, vatCents, totalCents: subtotalCents + vatCents };
}

export function todayIso() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Johannesburg" });
}

export function addDays(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export function emptyToNull(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}
