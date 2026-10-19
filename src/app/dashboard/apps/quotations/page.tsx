import { BillingAdmin } from "@/components/modules/billing-admin";
import { ModuleAppShell } from "@/lib/modules/app-page";

export default function Page() {
  return (
    <ModuleAppShell slug="quotations">
      <BillingAdmin />
    </ModuleAppShell>
  );
}
