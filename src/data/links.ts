import { getProduct, RENT_ZAR } from "@/data/products";

/** Price of one app when its partner is in the same payment or already open. */
export const PAIR_ZAR = 800;

export type AppPair = { a: string; b: string; because: string };

/** Apps stay separate. A pair only exists where one app already writes into the other. */
export const APP_PAIRS: AppPair[] = [
  { a: "onboard-docs", b: "leave-planner", because: "An approved onboarding pack becomes a person on the leave book." },
  { a: "equipment-issuer", b: "equipment-handback", because: "What was issued is what gets handed back." },
  { a: "equipment-handback", b: "loan-deductible-ledger", because: "Damage or loss on handback opens an AOD." },
  { a: "loan-deductible-ledger", b: "payroll", because: "A signed AOD deducts on the payslip." },
  { a: "site-attendance", b: "payroll", because: "Clocked hours and overtime land on the payslip." },
  { a: "training-tickets", b: "site-attendance", because: "An expired ticket stops that person clocking in." },
  { a: "training-tickets", b: "permit-to-work", because: "An expired ticket stops that person on a permit." },
  { a: "fit-for-duty", b: "site-attendance", because: "A failed fit check stops clock-in." },
  { a: "fit-for-duty", b: "permit-to-work", because: "A failed fit check stops the permit." },
  { a: "workshop-consumables", b: "job-card-internal", because: "Parts on a closed workshop job leave the shelf." },
  { a: "workshop-consumables", b: "job-card-field", because: "Parts on a closed field job leave the shelf." },
  { a: "quotations", b: "job-card-internal", because: "A closed workshop job becomes a quotation." },
  { a: "quotations", b: "job-card-field", because: "A closed field job becomes a quotation." },
  { a: "quotations", b: "bills-to-pay", because: "Quotes and invoices in, supplier bills out." },
  { a: "accident-report", b: "near-miss-whisperer", because: "An accident can open a near-miss." },
  { a: "accident-report", b: "discipline-log", because: "An accident can open a discipline case." },
  { a: "accident-report", b: "loan-deductible-ledger", because: "The cost of an accident can become an AOD." },
  { a: "pretrip-handover", b: "job-card-internal", because: "A vehicle fault opens a workshop job." },
];

export function partnersOf(slug: string) {
  return APP_PAIRS.flatMap((pair) => {
    const other = pair.a === slug ? pair.b : pair.b === slug ? pair.a : null;
    if (!other) return [];
    const product = getProduct(other);
    return product ? [{ slug: other, name: product.name, because: pair.because }] : [];
  });
}

/** R800 when this app and a linked partner are both in the set. Otherwise R1 000. */
export function priceOf(slug: string, have: Iterable<string>) {
  const set = new Set(have);
  set.add(slug);
  const linked = APP_PAIRS.some((pair) => (pair.a === slug || pair.b === slug) && set.has(pair.a) && set.has(pair.b));
  return linked ? PAIR_ZAR : RENT_ZAR;
}

export function activePairs(slugs: string[], owned: string[] = []) {
  const have = new Set([...slugs, ...owned]);
  return APP_PAIRS.filter((pair) => have.has(pair.a) && have.has(pair.b) && (slugs.includes(pair.a) || slugs.includes(pair.b)));
}

export type StarterPack = { id: string; name: string; forWho: string; slugs: string[] };

/** The four ways a company starts. Every app in a pack is R800 because its partner is in the same pack. */
export const STARTER_PACKS: StarterPack[] = [
  {
    id: "site",
    name: "Site",
    forWho: "The gate. Attendance, tickets, a fit check, and the permit. An expired ticket or a failed fit check stops clock-in and the permit.",
    slugs: ["site-attendance", "training-tickets", "fit-for-duty", "permit-to-work"],
  },
  {
    id: "workshop",
    name: "Workshop",
    forWho: "The workshop. A job card, the parts on the shelf, and the bakkie's walk-around. A fault opens a job. Parts leave the shelf when the job closes.",
    slugs: ["job-card-internal", "workshop-consumables", "pretrip-handover"],
  },
  {
    id: "people",
    name: "People",
    forWho: "Hire to pay. The onboarding pack becomes a person on leave. A signed AOD deducts on the payslip.",
    slugs: ["onboard-docs", "leave-planner", "payroll", "loan-deductible-ledger"],
  },
  {
    id: "money",
    name: "Money",
    forWho: "Money in and money out. Quotes and invoices on one side, supplier bills on the other.",
    slugs: ["quotations", "bills-to-pay"],
  },
];

export function packById(id: string) {
  return STARTER_PACKS.find((pack) => pack.id === id);
}

export function basketTotals(slugs: string[], owned: string[], daysLeft: number, daysInMonth: number) {
  const have = [...slugs, ...owned];
  const prices = slugs.map((slug) => priceOf(slug, have));
  const monthly = prices.reduce((sum, price) => sum + price, 0);
  const today = Math.round(prices.reduce((sum, price) => sum + (price * daysLeft) / daysInMonth, 0) * 100) / 100;
  return { monthly, today, prices };
}
