import { TrainingAdmin } from "@/components/modules/training-admin";
import { ModuleAppShell } from "@/lib/modules/app-page";

export default function Page() {
  return (
    <ModuleAppShell slug="training-tickets">
      <TrainingAdmin />
    </ModuleAppShell>
  );
}
