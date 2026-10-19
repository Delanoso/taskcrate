import { requireProductApi } from "@/lib/modules/api-guard";
import { TRAINING_COLUMNS } from "@/lib/modules/training-import";
import { buildXlsx, xlsxResponse } from "@/lib/xlsx-write";

export async function GET() {
  const gate = await requireProductApi("training-tickets");
  if ("error" in gate) return gate.error;
  const bytes = buildXlsx({
    sheetName: "Tickets",
    headers: TRAINING_COLUMNS.map((column) => column.label),
    rows: [TRAINING_COLUMNS.map((column) => column.example)],
    widths: TRAINING_COLUMNS.map(() => 22),
  });
  return xlsxResponse(bytes, "Training tickets template");
}
