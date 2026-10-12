import Link from "next/link";
import { ProductCard } from "@/components/platform/product-card";
import { DashboardShell } from "@/components/platform/dashboard-shell";
import { Button } from "@/components/ui/button";
import { PRODUCTS } from "@/data/products";
import { requireDashboardContext } from "@/lib/dashboard-context";
import { canAccessProduct } from "@/lib/rbac";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ upgrade?: string }>;
}) {
  const { org, user, access } = await requireDashboardContext();
  const sp = await searchParams;

  const accessible = PRODUCTS.filter((p) => canAccessProduct(access, p.slug));
  const availableToBuy = PRODUCTS.filter((p) => access.subscribedSlugs.includes(p.slug));

  return (
    <DashboardShell
      organizationName={org.branding?.displayName ?? org.name}
      activePath="/dashboard"
      accessibleSlugs={accessible.map((p) => p.slug)}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back, {user.fullName}</h1>
          <p className="text-muted-foreground">
            Manage subscriptions, team access, and open modules from one place.
          </p>
        </div>
        <form action="/api/auth/logout" method="post">
          <Button variant="outline" type="submit">
            Sign out
          </Button>
        </form>
      </div>

      {sp.upgrade === "1" && (
        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          That module is not on your plan or your role cannot access it. Ask an admin or{" "}
          <Link href="/products" className="underline">
            subscribe
          </Link>
          .
        </div>
      )}

      <section className="mt-10">
        <h2 className="text-lg font-medium">Active modules</h2>
        {accessible.length === 0 ? (
          <div className="mt-4 rounded-xl border bg-card p-8 text-center">
            <p className="text-muted-foreground">No modules yet — pick one from the catalog.</p>
            <Button asChild className="mt-4">
              <Link href="/products">Browse products</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-4 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {accessible.map((p) => (
              <ProductCard key={p.slug} product={p} subscribed />
            ))}
          </div>
        )}
      </section>

      {availableToBuy.length > 0 && accessible.length < availableToBuy.length && (
        <section className="mt-10">
          <h2 className="text-lg font-medium">Subscribed but restricted</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Your administrator limited which apps you can open.
          </p>
        </section>
      )}
    </DashboardShell>
  );
}
