import { BrandingForm } from "@/components/platform/branding-form";
import { DashboardShell } from "@/components/platform/dashboard-shell";
import { requireDashboardContext } from "@/lib/dashboard-context";
import { canAccessProduct, canManageTeam } from "@/lib/rbac";
import { PRODUCTS } from "@/data/products";
import { redirect } from "next/navigation";

export default async function BrandingSettingsPage() {
  const ctx = await requireDashboardContext();
  if (!canManageTeam(ctx.access.role)) redirect("/dashboard");

  const accessibleSlugs = PRODUCTS.filter((p) => canAccessProduct(ctx.access, p.slug)).map(
    (p) => p.slug,
  );

  const branding = ctx.org.branding!;

  return (
    <DashboardShell
      organizationName={branding.displayName}
      activePath="/dashboard/settings/branding"
      accessibleSlugs={accessibleSlugs}
    >
      <h1 className="text-2xl font-semibold tracking-tight">Branding & PDF defaults</h1>
      <p className="mt-1 max-w-2xl text-muted-foreground">
        Logo, display name, and colours apply to PDF headers and accents across every subscribed
        module.
      </p>
      <div className="mt-8 max-w-lg">
        <BrandingForm
          initial={{
            displayName: branding.displayName,
            primaryColor: branding.primaryColor,
            accentColor: branding.accentColor,
            logoUrl: branding.logoUrl ?? "",
          }}
        />
      </div>
    </DashboardShell>
  );
}
