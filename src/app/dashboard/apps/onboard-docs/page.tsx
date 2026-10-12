import { ModuleAppShell } from "@/lib/modules/app-page";
import { OnboardAdmin } from "@/components/modules/onboard-admin";

export default function Page() {
  return (
    <ModuleAppShell slug="onboard-docs">
      <OnboardAdmin />
    </ModuleAppShell>
  );
}
