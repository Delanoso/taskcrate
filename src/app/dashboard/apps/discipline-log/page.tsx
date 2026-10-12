import { ModuleAppShell } from "@/lib/modules/app-page";
import { DisciplineAdmin } from "@/components/modules/discipline-admin";

export default function Page() {
  return (
    <ModuleAppShell slug="discipline-log">
      <DisciplineAdmin />
    </ModuleAppShell>
  );
}
