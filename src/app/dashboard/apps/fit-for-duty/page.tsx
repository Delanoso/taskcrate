import { ModuleAppShell } from "@/lib/modules/app-page";
import { FitAdmin } from "@/components/modules/fit-admin";

export default function Page() {
  return (
    <ModuleAppShell slug="fit-for-duty">
      <FitAdmin />
    </ModuleAppShell>
  );
}
