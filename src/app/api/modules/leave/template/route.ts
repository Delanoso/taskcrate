import { requireProductApi } from "@/lib/modules/api-guard";
import { buildZip } from "@/lib/zip";

const HEADERS = ["Name", "Employee number", "Cellphone", "Level", "Start date", "Days added per month", "Annual leave balance", "Sick leave balance", "Family leave balance"];
const EXAMPLES: (string | number)[][] = [
  ["Sipho Ndlovu", "E001", "082 123 4567", "Staff", "2022-03-01", 1.25, 8.5, 22, 3],
  ["Anna Botha", "E002", "083 765 4321", "Managers", "2019-06-15", 1.75, 12, "", ""],
];
const WIDTHS = [24, 16, 16, 12, 13, 20, 20, 18, 19];

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const col = (i: number) => String.fromCharCode(65 + i);

function cell(value: string | number, ref: string, style = 0) {
  if (value === "") return "";
  const s = style ? ` s="${style}"` : "";
  return typeof value === "number"
    ? `<c r="${ref}"${s}><v>${value}</v></c>`
    : `<c r="${ref}" t="inlineStr"${s}><is><t>${esc(value)}</t></is></c>`;
}

function sheetXml() {
  const rows = [HEADERS, ...EXAMPLES].map(
    (row, r) => `<row r="${r + 1}">${row.map((v, c) => cell(v, `${col(c)}${r + 1}`, r === 0 ? 1 : 0)).join("")}</row>`,
  );
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
<cols>${WIDTHS.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("")}</cols>
<sheetData>${rows.join("")}</sheetData>
</worksheet>`;
}

const FILES: Record<string, string> = {
  "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`,
  "_rels/.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
  "xl/workbook.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="Employees" sheetId="1" r:id="rId1"/></sheets>
</workbook>`,
  "xl/_rels/workbook.xml.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`,
  "xl/styles.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>
<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>
</styleSheet>`,
};

export async function GET() {
  const gate = await requireProductApi("leave-planner");
  if ("error" in gate) return gate.error;
  const zip = buildZip([
    ...Object.entries(FILES).map(([name, text]) => ({ name, data: Buffer.from(text, "utf8") })),
    { name: "xl/worksheets/sheet1.xml", data: Buffer.from(sheetXml(), "utf8") },
  ]);
  return new Response(new Uint8Array(zip), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="leave-employees-template.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
