import { ProductCard } from "@/components/platform/product-card";
import { formatRentLabel, productsByCategory } from "@/data/products";

export default function ProductsPage() {
  const byCat = productsByCategory();

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Product catalog</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        No sign-in to browse. Tap each phone sandbox, then rent any app for {formatRentLabel()}.
        PayFast or Stripe checkout provisions your workspace when payment clears.
      </p>
      {[...byCat.entries()].map(([category, products]) => (
        <section key={category} className="mt-12">
          <h2 className="text-xl font-medium tracking-tight">{category}</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
