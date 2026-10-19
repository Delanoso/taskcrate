export const TRAINING_COLUMNS = [
  { label: "Full name", example: "Amina Jacobs" },
  { label: "Employee number", example: "E014" },
  { label: "Ticket", example: "First aid" },
  { label: "Certificate number", example: "FA-100" },
  { label: "Training provider", example: "NOSA" },
  { label: "Issued", example: "2026-01-15" },
  { label: "Expires", example: "2028-01-14" },
] as const;

type Key = "fullName" | "employeeNumber" | "ticketType" | "certificateNumber" | "provider" | "issuedOn" | "expiresOn";

const HEADER_RULES: [RegExp, Key][] = [
  [/emp.*(no|num)|employee number/, "employeeNumber"],
  [/provider|trainer|school|issued by/, "provider"],
  [/expir|valid until|renew/, "expiresOn"],
  [/issued|date obtained/, "issuedOn"],
  [/ticket|licence|license|course/, "ticketType"],
  [/cert|number/, "certificateNumber"],
  [/name/, "fullName"],
];

export type TrainingImportRow = {
  fullName: string;
  employeeNumber: string | null;
  ticketType: string;
  certificateNumber: string | null;
  provider: string | null;
  issuedOn: string;
  expiresOn: string;
};

export function textToRows(text: string): string[][] {
  const lines = text.replace(/\r/g, "").split("\n").filter((line) => line.trim());
  if (!lines.length) return [];
  const sep = lines[0].includes("\t") ? "\t" : lines[0].includes(";") && !lines[0].includes(",") ? ";" : ",";
  return lines.map((line) => line.split(sep).map((cell) => cell.trim().replace(/^"|"$/g, "")));
}

function parseDate(raw: string) {
  const value = raw.trim();
  if (!value) return null;
  let match = value.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (match) return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
  match = value.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (match) return `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
  return null;
}

export function parseTrainingRows(input: string[][]) {
  if (input.length < 2) return { rows: [] as TrainingImportRow[], errors: ["Add a heading row and at least one ticket."] };
  const keys = input[0].map((cell) => HEADER_RULES.find(([rule]) => rule.test(cell.trim().toLowerCase()))?.[1] ?? null);
  if (!keys.includes("fullName") || !keys.includes("ticketType") || !keys.includes("expiresOn")) {
    return { rows: [], errors: ["The sheet needs Full name, Ticket, and Expires columns."] };
  }
  const rows: TrainingImportRow[] = [];
  const errors: string[] = [];
  input.slice(1).forEach((cells, index) => {
    if (!cells.some((cell) => cell.trim())) return;
    const pick = (key: Key) => {
      const at = keys.indexOf(key);
      return at >= 0 ? (cells[at] ?? "").trim() : "";
    };
    const line = index + 2;
    const issued = parseDate(pick("issuedOn"));
    const expires = parseDate(pick("expiresOn"));
    if (!pick("fullName")) errors.push(`Row ${line}: add the full name.`);
    if (!pick("ticketType")) errors.push(`Row ${line}: add the ticket.`);
    if (pick("issuedOn") && !issued) errors.push(`Row ${line}: issued date must be YYYY-MM-DD or DD/MM/YYYY.`);
    if (!expires) errors.push(`Row ${line}: expiry must be YYYY-MM-DD or DD/MM/YYYY.`);
    if (issued && expires && expires < issued) errors.push(`Row ${line}: the expiry is before the issued date.`);
    if (errors.some((error) => error.startsWith(`Row ${line}:`))) return;
    rows.push({
      fullName: pick("fullName"),
      employeeNumber: pick("employeeNumber") || null,
      ticketType: pick("ticketType"),
      certificateNumber: pick("certificateNumber") || null,
      provider: pick("provider") || null,
      issuedOn: issued || expires!,
      expiresOn: expires!,
    });
  });
  if (!rows.length && !errors.length) errors.push("No tickets were found under the heading row.");
  return { rows, errors };
}
