import { ModuleAppShell } from "@/lib/modules/app-page";
import { LeaveAdmin } from "@/components/modules/leave-admin";

export default function Page() {
  return (
    <ModuleAppShell slug="leave-planner">
      <LeaveAdmin />
    </ModuleAppShell>
  );
}
