import Link from "next/link";
import { ArrowRight, Layers, Shield, Sparkles } from "lucide-react";
import { ProductCard } from "@/components/platform/product-card";
import { Button } from "@/components/ui/button";
import { APP_PAIRS, PAIR_ZAR } from "@/data/links";
import { getProduct, productsByCategory, formatRentLabel } from "@/data/products";

const NEW_APPS: [string, string | null][] = [
  ["bills-to-pay", "Photograph a supplier invoice, set the due date, and get an email when it is still unpaid."],
  ["payroll", "Payslips, overtime from the clock, EMP201 figures, a bank file, and an annual IRP5 pack."],
  ["quotations", "Save the client once. Email the quote. A morning email chases what is still unpaid."],
  ["site-attendance", "Clocked hours become overtime on the payslip. An expired ticket or a failed fit check stops clock-in."],
  ["training-tickets", "Expiry is emailed. An expired ticket stops clock-in and a permit until someone renews it."],
  ["accident-report", "Investigate it, download the COIDA pack, and open a near-miss, a discipline case, or an AOD."],
  ["loan-deductible-ledger", "Signed on the phone. A signed AOD deducts on the next payroll run."],
  ["permit-to-work", "A failed fit check or an expired ticket stops the permit unless a manager writes a reason."],
];

export default function HomePage() {
  const byCat = productsByCategory();

  return (
    <>
      <section className="relative overflow-hidden border-b">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.86_0.07_250),transparent_58%)]" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <p className="text-sm font-medium text-primary">TaskCrate</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Every file your clients, auditors and inspectors ask for. Now online.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
            Permits, safety files, registers, contracts, payslips and quotes: the same documents
            you are asked for on paper, captured on a phone, signed on screen, and ready as a branded
            PDF or Excel the moment someone asks. Each app works on its own for {formatRentLabel()}.
            Two apps that write into each other are R{PAIR_ZAR.toLocaleString("en-ZA")} each. Try every
            app for 7 days with no card. The company is emailed when something needs a person, so the
            dashboard does not have to be watched.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <a href="#apps">
                See all apps <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/register">Start 7-day trial</Link>
            </Button>
          </div>
          <dl className="mt-14 grid gap-6 sm:grid-cols-3">
            {[
              {
                icon: Layers,
                title: "7-day trial, no card",
                text: "Register once and use every app for 7 days. One trial per company and cellphone number.",
              },
              {
                icon: Shield,
                title: "One debit order, on the 1st",
                text: "Pay by card through PayFast. The first charge is only the days left this month; then one monthly debit order covers every app you chose. Invoices on your Billing page.",
              },
              {
                icon: Sparkles,
                title: "Your logo on every PDF",
                text: "Upload your logo and colours once. Permits, contracts, payslips, AODs and quotes all go out under your name.",
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

      <section className="mx-auto max-w-6xl px-4 pt-16 sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight">New on TaskCrate</h2>
        <p className="mt-1 max-w-2xl text-muted-foreground">Recently added and rebuilt apps. Every link you send now has a QR code too.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {NEW_APPS.map(([slug, note]) => {
            const p = getProduct(slug);
            if (!p) return null;
            return (
              <Link key={slug} href={`/products/${slug}`} className="rounded-xl border bg-card p-4 shadow-sm transition-colors hover:border-primary">
                <p className="font-medium">{p.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{note ?? p.tagline}</p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight">Apps that work together</h2>
        <p className="mt-1 max-w-2xl text-muted-foreground">
          Every app still runs on its own. Where one writes into another, pay for both and each is R{PAIR_ZAR.toLocaleString("en-ZA")} a month instead of R1 000. Staff names live on a free staff list, and any app can use them or ignore them.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {APP_PAIRS.map((pair) => {
            const left = getProduct(pair.a);
            const right = getProduct(pair.b);
            if (!left || !right) return null;
            return (
              <div key={`${pair.a}-${pair.b}`} className="rounded-xl border bg-card p-4 text-sm">
                <p className="font-medium">
                  <Link href={`/products/${left.slug}`} className="underline">{left.name}</Link>
                  {" + "}
                  <Link href={`/products/${right.slug}`} className="underline">{right.name}</Link>
                </p>
                <p className="mt-1 text-muted-foreground">{pair.because}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section id="apps" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight">All apps</h2>
        <p className="mt-1 max-w-2xl text-muted-foreground">
          Each card names the problem, then the features that close it. Open an app for the full list.
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
