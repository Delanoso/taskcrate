import { ModuleAppShell } from "@/lib/modules/app-page";
import { StockAdmin } from "@/components/modules/stock-admin";

export default function Page() {
  return (
    <ModuleAppShell slug="workshop-consumables">
      <StockAdmin />
    </ModuleAppShell>
  );
}
