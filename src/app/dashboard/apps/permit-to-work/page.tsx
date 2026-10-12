import { ModuleAppShell } from "@/lib/modules/app-page";
import { PermitAdmin } from "@/components/modules/permit-admin";

export default function Page() {
  return (
    <ModuleAppShell slug="permit-to-work">
      <PermitAdmin />
    </ModuleAppShell>
  );
}
