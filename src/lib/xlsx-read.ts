/** Minimal browser .xlsx reader: returns the first worksheet as rows of display strings (dates as YYYY-MM-DD). */

type Entry = { name: string; method: number; offset: number; compressedSize: number };

function zipEntries(buf: Uint8Array): Entry[] {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("This file is not a valid Excel (.xlsx) workbook.");
  const count = view.getUint16(eocd + 10, true);
  let p = view.getUint32(eocd + 16, true);
  const entries: Entry[] = [];
  const decoder = new TextDecoder();
  for (let i = 0; i < count; i++) {
    if (view.getUint32(p, true) !== 0x02014b50) break;
    const method = view.getUint16(p + 10, true);
    const compressedSize = view.getUint32(p + 20, true);
    const nameLen = view.getUint16(p + 28, true);
    const extraLen = view.getUint16(p + 30, true);
    const commentLen = view.getUint16(p + 32, true);
    const offset = view.getUint32(p + 42, true);
    entries.push({ name: decoder.decode(buf.subarray(p + 46, p + 46 + nameLen)), method, offset, compressedSize });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

async function readEntry(buf: Uint8Array, e: Entry) {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const start = e.offset + 30 + view.getUint16(e.offset + 26, true) + view.getUint16(e.offset + 28, true);
  const data = buf.slice(start, start + e.compressedSize);
  if (e.method === 0) return new TextDecoder().decode(data);
  if (e.method !== 8) throw new Error("Unsupported compression in this workbook.");
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Response(stream).text();
}

const xml = (s: string) => new DOMParser().parseFromString(s, "application/xml");
const byTag = (doc: Document | Element, tag: string) => Array.from(doc.getElementsByTagNameNS("*", tag));

const BUILTIN_DATE_FORMATS = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 27, 30, 36, 45, 46, 47, 50, 57]);

function columnIndex(ref: string) {
  const letters = ref.replace(/\d+/g, "");
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function serialToDate(serial: number) {
  const ms = Math.round((serial - 25569) * 86400 * 1000);
  return new Date(ms).toISOString().slice(0, 10);
}

function fmtNumber(n: number) {
  return String(Math.round(n * 1e6) / 1e6);
}

export async function readXlsx(file: File): Promise<string[][]> {
  const buf = new Uint8Array(await file.arrayBuffer());
  if (buf[0] === 0xd0 && buf[1] === 0xcf) {
    throw new Error("This is an old Excel 97-2003 (.xls) file. In Excel choose File → Save As → Excel Workbook (.xlsx), then upload again.");
  }
  const entries = zipEntries(buf);
  const find = (name: string) => entries.find((e) => e.name.toLowerCase() === name.toLowerCase());
  const read = async (name: string) => {
    const e = find(name);
    return e ? readEntry(buf, e) : null;
  };

  // First sheet in workbook order.
  const workbook = await read("xl/workbook.xml");
  const rels = await read("xl/_rels/workbook.xml.rels");
  let sheetPath = "xl/worksheets/sheet1.xml";
  if (workbook && rels) {
    const firstSheet = byTag(xml(workbook), "sheet")[0];
    const rid = firstSheet?.getAttribute("r:id") ?? firstSheet?.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id");
    const target = byTag(xml(rels), "Relationship").find((r) => r.getAttribute("Id") === rid)?.getAttribute("Target");
    if (target) sheetPath = target.startsWith("/") ? target.slice(1) : `xl/${target.replace(/^\.\//, "")}`;
  }
  const sheet = await read(sheetPath);
  if (!sheet) throw new Error("Could not find a worksheet in this workbook.");

  const sharedXml = await read("xl/sharedStrings.xml");
  const shared = sharedXml ? byTag(xml(sharedXml), "si").map((si) => byTag(si, "t").map((t) => t.textContent ?? "").join("")) : [];

  // Which cell styles are dates.
  const dateStyles = new Set<number>();
  const stylesXml = await read("xl/styles.xml");
  if (stylesXml) {
    const styles = xml(stylesXml);
    const customDate = new Set(
      byTag(styles, "numFmt")
        .filter((f) => /[dmy]/i.test((f.getAttribute("formatCode") ?? "").replace(/\[[^\]]*\]|"[^"]*"/g, "")))
        .map((f) => Number(f.getAttribute("numFmtId"))),
    );
    const cellXfs = byTag(styles, "cellXfs")[0];
    if (cellXfs) {
      byTag(cellXfs, "xf").forEach((xf, i) => {
        const id = Number(xf.getAttribute("numFmtId") ?? 0);
        if (BUILTIN_DATE_FORMATS.has(id) || customDate.has(id)) dateStyles.add(i);
      });
    }
  }

  const rows: string[][] = [];
  for (const row of byTag(xml(sheet), "row")) {
    const out: string[] = [];
    byTag(row, "c").forEach((c, i) => {
      const ref = c.getAttribute("r");
      const col = ref ? columnIndex(ref) : i;
      const type = c.getAttribute("t");
      const v = byTag(c, "v")[0]?.textContent ?? "";
      let value = "";
      if (type === "s") value = shared[Number(v)] ?? "";
      else if (type === "inlineStr") value = byTag(c, "t").map((t) => t.textContent ?? "").join("");
      else if (type === "str" || type === "e") value = v;
      else if (type === "b") value = v === "1" ? "TRUE" : "FALSE";
      else if (v !== "") {
        const n = Number(v);
        value = dateStyles.has(Number(c.getAttribute("s") ?? -1)) ? serialToDate(n) : fmtNumber(n);
      }
      out[col] = value.trim();
    });
    rows.push(Array.from(out, (x) => x ?? ""));
  }
  return rows.filter((r) => r.some((x) => x));
}
