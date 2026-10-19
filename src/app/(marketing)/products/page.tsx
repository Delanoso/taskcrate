import { ProductCard } from "@/components/platform/product-card";
import { formatRentLabel, productsByCategory } from "@/data/products";

export default function ProductsPage() {
  const byCat = productsByCategory();

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Every app</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Browse with no sign-in. Each app is {formatRentLabel()}. A 7-day trial opens all of them, with no card.
        Open an app to see the problem it solves and everything that is included.
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
