import { ModuleAppShell } from "@/lib/modules/app-page";
import { EquipmentWorkspace } from "@/components/modules/equipment-admin";

export default function Page() {
  return (
    <ModuleAppShell slug="equipment-issuer">
      <EquipmentWorkspace mode="issuer" />
    </ModuleAppShell>
  );
}
