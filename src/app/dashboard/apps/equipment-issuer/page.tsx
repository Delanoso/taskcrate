import { ModuleAppShell } from "@/lib/modules/app-page";
import { EquipmentAdmin } from "@/components/modules/equipment-admin";

export default function Page() {
  return (
    <ModuleAppShell slug="equipment-issuer">
      <EquipmentAdmin />
    </ModuleAppShell>
  );
}
