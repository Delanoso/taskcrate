import { ModuleAppShell } from "@/lib/modules/app-page";
import { NearMissAdmin } from "@/components/modules/nearmiss-admin";

export default function Page() {
  return (
    <ModuleAppShell slug="near-miss-whisperer">
      <NearMissAdmin />
    </ModuleAppShell>
  );
}
