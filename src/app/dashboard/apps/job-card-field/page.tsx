import { ModuleAppShell } from "@/lib/modules/app-page";
import { JobCardFieldAdmin } from "@/components/modules/jobcard-admin";

export default function Page() {
  return (
    <ModuleAppShell slug="job-card-field">
      <JobCardFieldAdmin />
    </ModuleAppShell>
  );
}
