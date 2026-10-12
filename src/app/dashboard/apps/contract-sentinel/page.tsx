import { ModuleAppShell } from "@/lib/modules/app-page";
import { ContractAdmin } from "@/components/modules/contract-admin";

export default function Page() {
  return (
    <ModuleAppShell slug="contract-sentinel">
      <ContractAdmin />
    </ModuleAppShell>
  );
}
