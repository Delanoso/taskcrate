import Link from "next/link";
import { notFound } from "next/navigation";
import { getProduct, PRODUCTS, formatRentLabel } from "@/data/products";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PurchasePanel } from "@/components/platform/purchase-panel";
import { PhoneSandbox } from "@/components/marketing/phone-sandbox";
import { db } from "@/lib/db";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { isCompanyAdmin } from "@/lib/rbac";
import { getSession } from "@/lib/session";

export function generateStaticParams() {
  return PRODUCTS.map((p) => ({ slug: p.slug }));
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) notFound();

  const session = await getSession();
  let canAdd = !session;
  if (session) {
    const account = await db.user.findUnique({
      where: { id: session.userId },
      select: { email: true, platformAdmin: true },
    });
    if (isPlatformAdmin(account)) {
      canAdd = true;
    } else {
      const membership = await db.membership.findUnique({
        where: {
          userId_organizationId: {
            userId: session.userId,
            organizationId: session.organizationId,
          },
        },
        select: { role: true },
      });
      canAdd = !!membership && isCompanyAdmin(membership.role);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <p className="text-sm text-muted-foreground">
        Register for a 7-day trial of every app, or rent one when you are ready. First payment covers the
        days left this month, then R1 000 on the 1st.
      </p>
      <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_340px_360px]">
        <div>
          <Badge variant="secondary">{product.category}</Badge>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">{product.name}</h1>
          <p className="mt-3 text-lg text-muted-foreground">{product.tagline}</p>
          <h2 className="mt-8 text-sm font-medium tracking-wide text-foreground uppercase">The problem</h2>
          <p className="mt-2 leading-relaxed">{product.solves}</p>
          <h2 className="mt-8 text-sm font-medium tracking-wide text-foreground uppercase">How it works</h2>
          <p className="mt-2 leading-relaxed text-muted-foreground">{product.description}</p>
          <h2 className="mt-8 text-sm font-medium tracking-wide text-foreground uppercase">What is included</h2>
          <ul className="mt-3 space-y-2">
            {product.features.map((f) => (
              <li key={f} className="flex gap-2 text-sm">
                <span className="text-primary">✓</span>
                {f}
              </li>
            ))}
          </ul>
          <p className="mt-8 text-sm font-medium">{formatRentLabel()}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {product.hasPdfExport && <Badge variant="outline">Branded PDFs</Badge>}
            {product.hasSignatures && <Badge variant="outline">Signatures</Badge>}
            {product.hasDateReminders && <Badge variant="outline">Date reminders</Badge>}
          </div>
        </div>

        <div className="flex justify-center lg:justify-start">
          <div>
            <p className="mb-3 text-center text-xs font-medium tracking-wide text-muted-foreground uppercase lg:text-left">
              Interactive sandbox
            </p>
            <PhoneSandbox productSlug={product.slug} />
            <p className="mt-3 max-w-[220px] text-center text-xs text-muted-foreground lg:text-left">
              Tap through a short example of the app.
            </p>
          </div>
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          {canAdd && session ? (
            <div className="space-y-3 rounded-xl border bg-card p-6">
              <p className="font-medium">Add {product.name}</p>
              <p className="text-sm text-muted-foreground">Choose it on your Billing page with any other apps. One PayFast debit order covers them all.</p>
              <Button asChild className="w-full"><Link href={`/dashboard/billing?add=${product.slug}`}>Add on the Billing page</Link></Button>
            </div>
          ) : canAdd ? (
            <PurchasePanel productSlug={product.slug} />
          ) : (
            <p className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
              An admin adds monthly apps for the company.
            </p>
          )}
          <Button variant="link" asChild className="mt-4 px-0">
            <Link href="/products">← Back to catalog</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
