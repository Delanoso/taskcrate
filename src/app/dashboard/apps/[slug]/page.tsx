import Link from "next/link";
import { notFound } from "next/navigation";
import { IpNoticeDialog } from "@/components/platform/ip-notice-dialog";
import { DashboardShell } from "@/components/platform/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getProduct } from "@/data/products";
import { needsIpNotice, requireProductAccess } from "@/lib/dashboard-context";
import { canAccessProduct } from "@/lib/rbac";
import { buildWhatsAppShareLink } from "@/lib/whatsapp";
import { ModuleWorkspace } from "@/components/platform/module-workspace";

export default async function AppModulePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) notFound();

  const ctx = await requireProductAccess(slug);
  const showIp = await needsIpNotice(ctx.session.userId, slug);

  const accessibleSlugs = (await import("@/data/products")).PRODUCTS.filter((p) =>
    canAccessProduct(ctx.access, p.slug),
  ).map((p) => p.slug);

  const share = buildWhatsAppShareLink({
    organizationSlug: ctx.org.slug,
    documentType: slug,
    documentId: "demo-preview",
    recipientHint: "there",
  });

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

      <div className="grid gap-6 lg:grid-cols-2">
        <ModuleWorkspace product={product} organizationName={ctx.org.name} />
        <Card>
          <CardHeader>
            <CardTitle>Communications</CardTitle>
            <CardDescription>
              WhatsApp deep links include your company slug and document type in the secure URL.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="break-all rounded-md bg-muted p-3 font-mono text-xs">{share.secureUrl}</p>
            <Button asChild variant="secondary" className="w-full">
              <a href={share.whatsAppUrl} target="_blank" rel="noreferrer">
                Open WhatsApp with prefilled message
              </a>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/api/demo/pdf">Download sample branded PDF</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
