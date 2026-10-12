import { IpNoticeDialog } from "@/components/platform/ip-notice-dialog";
import { DashboardShell } from "@/components/platform/dashboard-shell";
import { PRODUCTS, getProduct } from "@/data/products";
import { needsIpNotice, requireProductAccess } from "@/lib/dashboard-context";
import { canAccessProduct } from "@/lib/rbac";
import { notFound } from "next/navigation";

export async function ModuleAppShell({
  slug,
  children,
}: {
  slug: string;
  children: React.ReactNode;
}) {
  const product = getProduct(slug);
  if (!product) notFound();

  const ctx = await requireProductAccess(slug);
  const showIp = await needsIpNotice(ctx.session.userId, slug);
  const accessibleSlugs = PRODUCTS.filter((p) => canAccessProduct(ctx.access, p.slug)).map(
    (p) => p.slug,
  );

  return (
    <DashboardShell
      organizationName={ctx.org.branding?.displayName ?? ctx.org.name}
      activePath={`/dashboard/apps/${slug}`}
      accessibleSlugs={accessibleSlugs}
    >
      <IpNoticeDialog
        productSlug={slug}
        productName={product.name}
        openInitially={showIp}
      />
      <div className="mb-6">
        <p className="text-sm text-muted-foreground">{product.category}</p>
        <h1 className="text-2xl font-semibold tracking-tight">{product.name}</h1>
        <p className="mt-1 text-muted-foreground">{product.tagline}</p>
      </div>
      {children}
    </DashboardShell>
  );
}

export async function getModuleOrg(slug: string) {
  const ctx = await requireProductAccess(slug);
  return ctx;
}
