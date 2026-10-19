import { PayrollAdmin } from "@/components/modules/payroll-admin";
import { ModuleAppShell } from "@/lib/modules/app-page";

export default function Page() {
  return (
    <ModuleAppShell slug="payroll">
      <PayrollAdmin />
    </ModuleAppShell>
  );
}
