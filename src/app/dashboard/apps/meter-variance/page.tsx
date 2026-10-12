import { ModuleAppShell } from "@/lib/modules/app-page";
import { MeterAdmin } from "@/components/modules/meter-admin";

export default function Page() {
  return (
    <ModuleAppShell slug="meter-variance">
      <MeterAdmin />
    </ModuleAppShell>
  );
}
