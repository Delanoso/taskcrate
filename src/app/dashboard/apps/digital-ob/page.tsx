import { ModuleAppShell } from "@/lib/modules/app-page";
import { ObAdmin } from "@/components/modules/ob-admin";

export default function Page() {
  return (
    <ModuleAppShell slug="digital-ob">
      <ObAdmin />
    </ModuleAppShell>
  );
}
