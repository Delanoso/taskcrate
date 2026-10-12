import { ModuleAppShell } from "@/lib/modules/app-page";
import { ContractorAdmin } from "@/components/modules/contractor-admin";

export default function Page() {
  return (
    <ModuleAppShell slug="contractor-safety-file">
      <ContractorAdmin />
    </ModuleAppShell>
  );
}
