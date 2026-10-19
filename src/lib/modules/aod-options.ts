export type AodKind = "loan" | "deductible";

/** Built-in reasons. Companies add their own in the Reasons tab. */
export const BUILTIN_REASONS: { key: string; label: string; kind: AodKind }[] = [
  { key: "advance", label: "Salary advance", kind: "loan" },
  { key: "loan", label: "Personal loan", kind: "loan" },
  { key: "purchase", label: "Purchase from the company", kind: "loan" },
  { key: "payment", label: "Payment made on the employee's behalf", kind: "loan" },
  { key: "overpayment", label: "Salary overpaid", kind: "loan" },
  { key: "training", label: "Training costs recovered", kind: "loan" },
  { key: "uniform", label: "Uniform / PPE", kind: "loan" },
  { key: "fine", label: "Traffic fine", kind: "loan" },
  { key: "damage", label: "Damage to company property", kind: "deductible" },
  { key: "loss", label: "Loss of company property", kind: "deductible" },
  { key: "shortage", label: "Cash or stock shortage", kind: "deductible" },
  { key: "other", label: "Other", kind: "loan" },
];

export const STATUS_LABEL: Record<string, string> = {
  pending: "Awaiting signature",
  active: "Repaying",
  settled: "Settled",
  declined: "Declined",
  cancelled: "Cancelled",
  signed: "Repaying",
};

export const METHODS = [
  { key: "payroll", label: "Salary deduction" },
  { key: "cash", label: "Cash" },
  { key: "eft", label: "EFT" },
  { key: "other", label: "Other" },
] as const;

export const methodLabel = (k: string) => METHODS.find((m) => m.key === k)?.label ?? k;

export const money = (n: number | null | undefined) =>
  n == null ? "-" : `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const periodLabel = (p: string) => {
  const [y, m] = p.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString("en-ZA", { month: "long", year: "numeric" });
};

export function addMonths(period: string, n: number) {
  const [y, m] = period.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Planned instalments; the last one takes the remainder. */
export function schedule(amount: number, instalment: number | null, firstPeriod: string | null) {
  if (!instalment || instalment <= 0 || !firstPeriod) return [];
  const rows: { period: string; amount: number }[] = [];
  let left = Math.round(amount * 100);
  const each = Math.round(instalment * 100);
  for (let i = 0; left > 0 && i < 240; i++) {
    const take = Math.min(each, left);
    rows.push({ period: addMonths(firstPeriod, i), amount: take / 100 });
    left -= take;
  }
  return rows;
}

/** The acknowledgement the employee signs. */
export function aodTerms(input: {
  company: string;
  employeeName: string;
  employeeIdNumber?: string | null;
  amount: number;
  reason: string;
  description: string;
  kind: AodKind;
  instalment: number | null;
  instalments: number;
  firstPeriod: string | null;
  method: string;
}) {
  const who = `I, ${input.employeeName}${input.employeeIdNumber ? ` (ID ${input.employeeIdNumber})` : ""}`;
  const plan =
    input.instalment && input.firstPeriod
      ? `I will repay this amount in ${input.instalments} monthly instalment${input.instalments === 1 ? "" : "s"} of ${money(input.instalment)} (the last instalment may be less), starting ${periodLabel(input.firstPeriod)}.`
      : "I will repay this amount as agreed with the company.";
  const how =
    input.method === "payroll"
      ? `I agree, in terms of section 34(1) of the Basic Conditions of Employment Act, that ${input.company} may deduct these instalments from my remuneration.`
      : `I will pay the instalments by ${methodLabel(input.method).toLowerCase()}.`;
  const terms = [
    `${who}, acknowledge that I owe ${input.company} the amount of ${money(input.amount)} for: ${input.reason}. ${input.description}`.trim(),
    plan,
    how,
    "No interest is charged on this amount.",
    "If my employment ends before the amount is repaid in full, the outstanding balance becomes payable immediately and may be deducted from my final remuneration, to the extent the law allows.",
    "I may ask for a statement of payments and the balance at any time.",
  ];
  if (input.kind === "deductible") {
    terms.splice(
      2,
      0,
      "I confirm that the loss or damage happened in the course of my employment and was due to my fault, that a fair procedure was followed and I had a reasonable opportunity to explain why the deduction should not be made, that the amount does not exceed the actual loss or damage, and that no monthly deduction will exceed one quarter of my remuneration in money (section 34(2) of the BCEA).",
    );
  }
  return terms;
}
