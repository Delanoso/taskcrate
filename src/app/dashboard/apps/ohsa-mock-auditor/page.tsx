import { ModuleAppShell } from "@/lib/modules/app-page";
import { OhsaAdmin } from "@/components/modules/ohsa-admin";

export default function Page() {
  return (
    <ModuleAppShell slug="ohsa-mock-auditor">
      <OhsaAdmin />
    </ModuleAppShell>
  );
}
