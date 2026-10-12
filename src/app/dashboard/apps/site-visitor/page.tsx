import { ModuleAppShell } from "@/lib/modules/app-page";
import { VisitorAdmin } from "@/components/modules/visitor-admin";

export default function Page() {
  return (
    <ModuleAppShell slug="site-visitor">
      <VisitorAdmin />
    </ModuleAppShell>
  );
}
