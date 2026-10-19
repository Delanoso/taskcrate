import { PeopleAdmin } from "@/components/modules/people-admin";
import { DashboardShell } from "@/components/platform/dashboard-shell";
import { PRODUCTS } from "@/data/products";
import { requireDashboardContext } from "@/lib/dashboard-context";
import { canAccessProduct } from "@/lib/rbac";

export default async function PeoplePage() {
  const { org, access } = await requireDashboardContext();
  const accessible = PRODUCTS.filter((product) => canAccessProduct(access, product.slug));
  return (
    <DashboardShell organizationName={org.branding?.displayName ?? org.name} activePath="/dashboard/people" accessibleSlugs={accessible.map((product) => product.slug)}>
      <PeopleAdmin />
    </DashboardShell>
  );
}
