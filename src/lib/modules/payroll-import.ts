export const PAYROLL_COLUMNS = [
  { key: "fullName", label: "Full name", example: "Thabo Nkosi" },
  { key: "employeeNumber", label: "Employee number", example: "E001" },
  { key: "idNumber", label: "ID number", example: "9001015800084" },
  { key: "taxNumber", label: "Tax number", example: "1234567890" },
  { key: "dateOfBirth", label: "Date of birth", example: "1990-01-01" },
  { key: "startDate", label: "Start date", example: "2024-03-01" },
  { key: "jobTitle", label: "Job title", example: "Driver" },
  { key: "email", label: "Email", example: "thabo@example.co.za" },
  { key: "phone", label: "Phone", example: "0821234567" },
  { key: "bankName", label: "Bank", example: "FNB" },
  { key: "accountNumber", label: "Account number", example: "62123456789" },
  { key: "branchCode", label: "Branch code", example: "250655" },
  { key: "accountType", label: "Account type", example: "Cheque" },
  { key: "monthlySalary", label: "Monthly salary", example: "20000" },
  { key: "allowances", label: "Taxable allowances", example: "0" },
  { key: "pension", label: "Pension employee", example: "0" },
  { key: "employerPension", label: "Pension company", example: "0" },
  { key: "medicalMember", label: "On medical aid", example: "Yes" },
  { key: "medicalDependants", label: "Medical dependants", example: "1" },
  { key: "medicalDeduction", label: "Medical aid deduction", example: "1800" },
  { key: "paysUif", label: "Pays UIF", example: "Yes" },
] as const;

type Key = (typeof PAYROLL_COLUMNS)[number]["key"];

const HEADER_RULES: [RegExp, Key][] = [
  [/dependant|dependent/, "medicalDependants"],
  [/medical.*(deduct|amount|fee)|aid deduction/, "medicalDeduction"],
  [/on medical|medical aid|medical member|scheme/, "medicalMember"],
  [/company pension|employer pension|pension company/, "employerPension"],
  [/pension|provident|retirement/, "pension"],
  [/allowance/, "allowances"],
  [/salary|basic|monthly pay|wage/, "monthlySalary"],
  [/pays uif|^uif$/, "paysUif"],
  [/branch/, "branchCode"],
  [/account type|acc type/, "accountType"],
  [/account/, "accountNumber"],
  [/bank/, "bankName"],
  [/e-?mail/, "email"],
  [/phone|cell|mobile/, "phone"],
  [/title|job|position/, "jobTitle"],
  [/start|engage|joined/, "startDate"],
  [/birth|dob/, "dateOfBirth"],
  [/tax/, "taxNumber"],
  [/id number|identity|sa id/, "idNumber"],
  [/emp.*(no|num)|employee number|staff number/, "employeeNumber"],
  [/name/, "fullName"],
];

export type PayrollImportRow = {
  fullName: string;
  employeeNumber: string | null;
  idNumber: string | null;
  taxNumber: string | null;
  dateOfBirth: string | null;
  startDate: string | null;
  jobTitle: string | null;
  email: string | null;
  phone: string | null;
  bankName: string | null;
  accountNumber: string | null;
  branchCode: string | null;
  accountType: string | null;
  monthlySalaryCents: number;
  allowanceCents: number;
  pensionCents: number;
  employerPensionCents: number;
  medicalMember: boolean;
  medicalDependants: number;
  medicalDeductionCents: number;
  paysUif: boolean;
};

export function textToRows(text: string): string[][] {
  const lines = text.replace(/\r/g, "").split("\n").filter((line) => line.trim());
  if (!lines.length) return [];
  const sep = lines[0].includes("\t") ? "\t" : lines[0].includes(";") && !lines[0].includes(",") ? ";" : ",";
  return lines.map((line) => splitLine(line, sep));
}

function splitLine(line: string, sep: string) {
  if (sep === "\t") return line.split("\t").map((cell) => cell.trim());
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else quoted = !quoted;
    } else if (ch === sep && !quoted) {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

export function parseDate(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  if (/^\d{5}(\.\d+)?$/.test(value)) {
    const serial = Number(value);
    if (serial > 20000 && serial < 80000) {
      return new Date(Math.round((serial - 25569) * 86400000)).toISOString().slice(0, 10);
    }
  }
  let match = value.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (match) return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
  match = value.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (match) return `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
  return null;
}

function moneyCents(raw: string) {
  const cleaned = raw.trim().replace(/[R$£€\s]/g, "").replace(/,(?=\d{3}\b)/g, "").replace(",", ".");
  if (!cleaned) return 0;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

function yesNo(raw: string, fallback: boolean) {
  const value = raw.trim().toLowerCase();
  if (!value) return fallback;
  if (["y", "yes", "true", "1", "on"].includes(value)) return true;
  if (["n", "no", "false", "0", "off"].includes(value)) return false;
  return null;
}

function blank(raw: string) {
  const value = raw.trim();
  return value ? value : null;
}

export function parsePayrollRows(input: string[][]): { rows: PayrollImportRow[]; errors: string[] } {
  if (input.length < 2) return { rows: [], errors: ["Add a heading row and at least one employee."] };
  const headers = input[0].map((cell) => cell.trim().toLowerCase());
  const keys = headers.map((header) => HEADER_RULES.find(([rule]) => rule.test(header))?.[1] ?? null);
  if (!keys.includes("fullName") || !keys.includes("monthlySalary")) {
    return { rows: [], errors: ["The sheet needs a Full name column and a Monthly salary column."] };
  }
  const rows: PayrollImportRow[] = [];
  const errors: string[] = [];
  input.slice(1).forEach((cells, index) => {
    if (!cells.some((cell) => cell.trim())) return;
    const pick = (key: Key) => {
      const at = keys.indexOf(key);
      return at >= 0 ? (cells[at] ?? "").trim() : "";
    };
    const line = index + 2;
    const fullName = pick("fullName");
    const salary = moneyCents(pick("monthlySalary"));
    const allowances = moneyCents(pick("allowances"));
    const pension = moneyCents(pick("pension"));
    const employerPension = moneyCents(pick("employerPension"));
    const medicalDeduction = moneyCents(pick("medicalDeduction"));
    const member = yesNo(pick("medicalMember"), false);
    const paysUif = yesNo(pick("paysUif"), true);
    const dependantsRaw = pick("medicalDependants");
    const dependants = dependantsRaw ? Number(dependantsRaw) : 0;
    const dob = parseDate(pick("dateOfBirth"));
    const start = parseDate(pick("startDate"));
    if (!fullName) errors.push(`Row ${line}: add the full name.`);
    if (salary == null || salary <= 0) errors.push(`Row ${line}: monthly salary must be greater than 0.`);
    if (allowances == null || pension == null || employerPension == null || medicalDeduction == null) {
      errors.push(`Row ${line}: money columns must be numbers.`);
    }
    if (member == null) errors.push(`Row ${line}: On medical aid must be Yes or No.`);
    if (paysUif == null) errors.push(`Row ${line}: Pays UIF must be Yes or No.`);
    if (pick("dateOfBirth") && !dob) errors.push(`Row ${line}: date of birth must be YYYY-MM-DD or DD/MM/YYYY.`);
    if (pick("startDate") && !start) errors.push(`Row ${line}: start date must be YYYY-MM-DD or DD/MM/YYYY.`);
    if (dependantsRaw && (!Number.isInteger(dependants) || dependants < 0 || dependants > 20)) {
      errors.push(`Row ${line}: medical dependants must be a whole number.`);
    }
    if (errors.some((error) => error.startsWith(`Row ${line}:`))) return;
    rows.push({
      fullName,
      employeeNumber: blank(pick("employeeNumber")),
      idNumber: blank(pick("idNumber")),
      taxNumber: blank(pick("taxNumber")),
      dateOfBirth: dob,
      startDate: start,
      jobTitle: blank(pick("jobTitle")),
      email: blank(pick("email")),
      phone: blank(pick("phone")),
      bankName: blank(pick("bankName")),
      accountNumber: blank(pick("accountNumber")),
      branchCode: blank(pick("branchCode")),
      accountType: blank(pick("accountType")),
      monthlySalaryCents: salary!,
      allowanceCents: allowances!,
      pensionCents: pension!,
      employerPensionCents: employerPension!,
      medicalMember: member!,
      medicalDependants: dependants,
      medicalDeductionCents: medicalDeduction!,
      paysUif: paysUif!,
    });
  });
  if (!rows.length && !errors.length) errors.push("No employees were found under the heading row.");
  return { rows, errors };
}
