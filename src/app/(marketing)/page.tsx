import Link from "next/link";
import { ArrowRight, Layers, Shield, Sparkles } from "lucide-react";
import { ProductCard } from "@/components/platform/product-card";
import { Button } from "@/components/ui/button";
import { productsByCategory, formatRentLabel } from "@/data/products";

export default function HomePage() {
  const byCat = productsByCategory();

  return (
    <>
      <section className="relative overflow-hidden border-b">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.93_0.04_250),transparent_55%)]" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <p className="text-sm font-medium text-primary">Delano Solutions</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Rent premium ops apps for {formatRentLabel()}.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
            Browse every app profile with no sign-in. Tap the phone sandbox, feel the workflow, then
            rent with one-click PayFast or Stripe — your workspace provisions on autopilot when
            payment clears.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <a href="#apps">
                See all apps <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">Sign in to workspace</Link>
            </Button>
          </div>
          <dl className="mt-14 grid gap-6 sm:grid-cols-3">
            {[
              {
                icon: Layers,
                title: "No account to browse",
                text: "Open any profile and play the interactive phone demo instantly.",
              },
              {
                icon: Shield,
                title: "R1,000/mo per app",
                text: `Flat rent ${formatRentLabel()}. One dashboard if you take several.`,
              },
              {
                icon: Sparkles,
                title: "Autopilot provision",
                text: "Payment clears → tenant workspace + subscription created without manual setup.",
              },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-xl border bg-card p-5 shadow-sm">
                <Icon className="h-5 w-5 text-primary" />
                <dt className="mt-3 font-medium">{title}</dt>
                <dd className="mt-1 text-sm text-muted-foreground">{text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section id="apps" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight">All apps</h2>
        <p className="mt-1 text-muted-foreground">
          Tap each phone sandbox for State Transition Success, then rent when ready.
        </p>
        {[...byCat.entries()].map(([category, products]) => (
          <div key={category} className="mt-12">
            <h3 className="text-lg font-medium tracking-tight">{category}</h3>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((p) => (
                <ProductCard key={p.slug} product={p} />
              ))}
            </div>
          </div>
        ))}
      </section>
    </>
  );
}
