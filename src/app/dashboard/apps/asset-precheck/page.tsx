import { ModuleAppShell } from "@/lib/modules/app-page";
import { AssetAdmin } from "@/components/modules/asset-admin";

export default function Page() {
  return (
    <ModuleAppShell slug="asset-precheck">
      <AssetAdmin />
    </ModuleAppShell>
  );
}
