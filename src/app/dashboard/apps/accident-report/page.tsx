import { AccidentAdmin } from "@/components/modules/accident-admin";
import { ModuleAppShell } from "@/lib/modules/app-page";

export default function Page() {
  return (
    <ModuleAppShell slug="accident-report">
      <AccidentAdmin />
    </ModuleAppShell>
  );
}
