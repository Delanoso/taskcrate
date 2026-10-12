import { ModuleAppShell } from "@/lib/modules/app-page";
import { EquipmentHandbackAdmin } from "@/components/modules/equipment-admin";

export default function Page() {
  return (
    <ModuleAppShell slug="equipment-handback">
      <EquipmentHandbackAdmin />
    </ModuleAppShell>
  );
}
