import { BillsAdmin } from "@/components/modules/bills-admin";
import { ModuleAppShell } from "@/lib/modules/app-page";

export default function Page() {
  return (
    <ModuleAppShell slug="bills-to-pay">
      <BillsAdmin />
    </ModuleAppShell>
  );
}
