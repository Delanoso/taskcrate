import Link from "next/link";
import { DashboardShell } from "@/components/platform/dashboard-shell";
import { SubscribeAllButton } from "@/components/platform/subscribe-all-button";
import { PRODUCTS } from "@/data/products";
import { requireDashboardContext } from "@/lib/dashboard-context";
import { canAccessProduct } from "@/lib/rbac";

export default async function BillingPage() {
  const ctx = await requireDashboardContext();
  const accessibleSlugs = PRODUCTS.filter((p) => canAccessProduct(ctx.access, p.slug)).map(
    (p) => p.slug,
  );

  const subs = ctx.access.subscribedSlugs
    .map((slug) => PRODUCTS.find((p) => p.slug === slug))
    .filter(Boolean);

  return (
    <DashboardShell
      organizationName={ctx.org.branding?.displayName ?? ctx.org.name}
      activePath="/dashboard/billing"
      accessibleSlugs={accessibleSlugs}
    >
      <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
      <p className="mt-1 text-muted-foreground">
        Connect Stripe keys in production for fully automated checkout and webhooks. Without keys,
        subscriptions activate in demo mode for local testing.
      </p>
      <ul className="mt-8 space-y-3">
        {subs.length === 0 ? (
          <li className="text-muted-foreground">No active subscriptions.</li>
        ) : (
          subs.map((p) => (
            <li key={p!.slug} className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">{p!.name}</p>
                <p className="text-sm text-muted-foreground">${p!.priceMonthlyUsd}/mo · active</p>
              </div>
              <Link href={`/dashboard/apps/${p!.slug}`} className="text-sm underline">
                Open app
              </Link>
            </li>
          ))
        )}
      </ul>
      <div className="mt-6 flex flex-wrap gap-4 text-sm">
        <Link href="/products" className="underline">
          Add another module
        </Link>
        <SubscribeAllButton />
      </div>
    </DashboardShell>
  );
}
