import { db } from "@/lib/db";
import { requireProductApi } from "@/lib/modules/api-guard";
import { buildXlsx, xlsxResponse } from "@/lib/xlsx-write";

export async function GET() {
  const gate = await requireProductApi("workshop-consumables");
  if ("error" in gate) return gate.error;
  const items = await db.stockItem.findMany({
    where: { organizationId: gate.session.organizationId },
    orderBy: { name: "asc" },
  });
  const rows = items.map((item) => [
    item.name,
    item.sku ?? "",
    item.unit,
    item.quantity,
    item.reorderAt,
    item.quantity <= item.reorderAt ? "Reorder" : "Ok",
    item.location ?? "",
    item.supplier ?? "",
  ]);
  const bytes = buildXlsx({
    sheetName: "Stock",
    headers: ["Item", "SKU", "Unit", "On hand", "Reorder at", "Status", "Location", "Supplier"],
    rows,
    widths: [28, 16, 12, 12, 14, 12, 18, 22],
  });
  return xlsxResponse(bytes, "Stock register");
}
