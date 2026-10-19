import { AttendanceAdmin } from "@/components/modules/attendance-admin";
import { ModuleAppShell } from "@/lib/modules/app-page";

export default function Page() {
  return (
    <ModuleAppShell slug="site-attendance">
      <AttendanceAdmin />
    </ModuleAppShell>
  );
}
