import { DashboardShell } from "@/components/platform/dashboard-shell";
import { TeamManager } from "@/components/platform/team-manager";
import { PRODUCTS } from "@/data/products";
import { requireDashboardContext } from "@/lib/dashboard-context";
import { canAccessProduct, canInviteUsers } from "@/lib/rbac";
import { redirect } from "next/navigation";

export default async function TeamSettingsPage() {
  const ctx = await requireDashboardContext();
  if (!canInviteUsers(ctx.access.role)) redirect("/dashboard");

  const accessibleSlugs = PRODUCTS.filter((p) => canAccessProduct(ctx.access, p.slug)).map(
    (p) => p.slug,
  );

  return (
    <DashboardShell
      organizationName={ctx.org.branding?.displayName ?? ctx.org.name}
      activePath="/dashboard/settings/team"
      accessibleSlugs={accessibleSlugs}
    >
      <h1 className="text-2xl font-semibold tracking-tight">People & access</h1>
      <p className="mt-1 max-w-2xl text-muted-foreground">
        Admins invite people, choose which apps they can open, and add monthly apps.
      </p>
      <div className="mt-8">
        <TeamManager subscribedSlugs={ctx.access.subscribedSlugs} currentUserId={ctx.user.id} />
      </div>
    </DashboardShell>
  );
}
