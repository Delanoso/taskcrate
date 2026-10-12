import Link from "next/link";
import { notFound } from "next/navigation";
import { getProduct, PRODUCTS, formatRentLabel } from "@/data/products";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PurchasePanel } from "@/components/platform/purchase-panel";
import { PhoneSandbox } from "@/components/marketing/phone-sandbox";

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

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <p className="text-sm text-muted-foreground">
        No sign-in required to browse · Tap the phone demo · Rent when ready
      </p>
      <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_340px_360px]">
        <div>
          <Badge variant="secondary">{product.category}</Badge>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">{product.name}</h1>
          <p className="mt-3 text-lg text-muted-foreground">{product.tagline}</p>
          <p className="mt-6 leading-relaxed text-muted-foreground">{product.description}</p>
          <ul className="mt-8 space-y-2">
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
              Tap through the highlighted actions for a State Transition Success in seconds.
            </p>
          </div>
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <PurchasePanel productSlug={product.slug} />
          <Button variant="link" asChild className="mt-4 px-0">
            <Link href="/products">← Back to catalog</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
