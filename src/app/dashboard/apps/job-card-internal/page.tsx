import { ModuleAppShell } from "@/lib/modules/app-page";
import { JobCardInternalAdmin } from "@/components/modules/jobcard-admin";

export default function Page() {
  return (
    <ModuleAppShell slug="job-card-internal">
      <JobCardInternalAdmin />
    </ModuleAppShell>
  );
}
