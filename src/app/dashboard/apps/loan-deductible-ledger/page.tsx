import { ModuleAppShell } from "@/lib/modules/app-page";
import { LoanAdmin } from "@/components/modules/loan-admin";

export default function Page() {
  return (
    <ModuleAppShell slug="loan-deductible-ledger">
      <LoanAdmin />
    </ModuleAppShell>
  );
}
