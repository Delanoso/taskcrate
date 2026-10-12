import { IpNoticeDialog } from "@/components/platform/ip-notice-dialog";
import { DashboardShell } from "@/components/platform/dashboard-shell";
import { ToolboxAdmin } from "@/components/platform/toolbox-admin";
import { PRODUCTS } from "@/data/products";
import { needsIpNotice, requireProductAccess } from "@/lib/dashboard-context";
import { canAccessProduct } from "@/lib/rbac";

export default async function ToolboxTalksAppPage() {
  const ctx = await requireProductAccess("toolbox-talks");
  const showIp = await needsIpNotice(ctx.session.userId, "toolbox-talks");
  const accessibleSlugs = PRODUCTS.filter((p) => canAccessProduct(ctx.access, p.slug)).map(
    (p) => p.slug,
  );

  return (
    <DashboardShell
      organizationName={ctx.org.branding?.displayName ?? ctx.org.name}
      activePath="/dashboard/apps/toolbox-talks"
      accessibleSlugs={accessibleSlugs}
    >
      <IpNoticeDialog
        productSlug="toolbox-talks"
        productName="Toolbox Talks"
        openInitially={showIp}
      />
      <div className="mb-6">
        <p className="text-sm text-muted-foreground">Health &amp; Safety</p>
        <h1 className="text-2xl font-semibold tracking-tight">Toolbox Talks</h1>
        <p className="mt-1 text-muted-foreground">
          Publish a talk, drop one link in WhatsApp, track signatures, download the compliance
          register.
        </p>
      </div>
      <ToolboxAdmin orgSlug={ctx.org.slug} />
    </DashboardShell>
  );
}
