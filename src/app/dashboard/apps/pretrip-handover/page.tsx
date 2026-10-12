import { ModuleAppShell } from "@/lib/modules/app-page";
import { VehicleAdmin } from "@/components/modules/vehicle-admin";

export default function Page() {
  return (
    <ModuleAppShell slug="pretrip-handover">
      <VehicleAdmin />
    </ModuleAppShell>
  );
}
