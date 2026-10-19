import Link from "next/link";
import { ProductCard } from "@/components/platform/product-card";
import { DashboardShell } from "@/components/platform/dashboard-shell";
import { Button } from "@/components/ui/button";
import { PRODUCTS } from "@/data/products";
import { formatRentDate } from "@/lib/billing";
import { requireDashboardContext } from "@/lib/dashboard-context";
import { canAccessProduct, canAddApps } from "@/lib/rbac";
import { watchForCompany } from "@/lib/ops-watch";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ upgrade?: string; trial?: string }>;
}) {
  const { org, user, access } = await requireDashboardContext();
  const sp = await searchParams;

  const accessible = PRODUCTS.filter((p) => canAccessProduct(access, p.slug));
  const waiting = await watchForCompany(org.id);
  const availableToBuy = PRODUCTS.filter((p) => access.subscribedSlugs.includes(p.slug));
  const admin = canAddApps(access.role);

  return (
    <DashboardShell
      organizationName={org.branding?.displayName ?? org.name}
      activePath="/dashboard"
      accessibleSlugs={accessible.map((p) => p.slug)}
    >
      {org.slug === "taskcrate-demo" && (
        <p className="mb-4 rounded-lg border bg-card px-4 py-3 text-sm">Sample company for sales calls. The records are examples. This company is not a paying customer, and it does not send the morning emails.</p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back, {user.fullName}</h1>
          <p className="text-muted-foreground">
            {admin
              ? "Open apps, invite people, and add monthly apps."
              : "Open the apps that are available to you."}
          </p>
        </div>
        <form action="/api/auth/logout" method="post">
          <Button variant="outline" type="submit">
            Sign out
          </Button>
        </form>
      </div>

      {access.trialActive && access.trialEndsAt ? (
        <div className="mt-6 rounded-lg border bg-card px-4 py-3 text-sm">
          Every app is open until {formatRentDate(access.trialEndsAt)}. No card was taken. After the
          trial, an app stays open only once it is paid.
        </div>
      ) : null}

      {!access.trialActive && org.trialNote ? (
        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {org.trialNote} The apps open after payment.
        </div>
      ) : null}

      {sp.upgrade === "1" && (
        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          This app is closed until the monthly rent is paid.
          {admin ? (
            <>
              {" "}
              <Link href="/products" className="underline">
                Pay to open it
              </Link>
              .
            </>
          ) : null}
        </div>
      )}

      {waiting.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-medium">Needs you</h2>
          <p className="mt-1 text-sm text-muted-foreground">The same list that goes out in the morning email.</p>
          <ul className="mt-3 space-y-2">
            {waiting.slice(0, 20).map((item) => (
              <li key={`${item.slug}-${item.text}`} className="rounded-lg border bg-card px-4 py-3 text-sm">{item.text}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-10">
        <h2 className="text-lg font-medium">Active modules</h2>
        {accessible.length === 0 ? (
          <div className="mt-4 rounded-xl border bg-card p-8 text-center">
            <p className="text-muted-foreground">
              {admin
                ? access.trialEndsAt && !access.trialActive
                  ? "The 7-day trial has ended. Pay for the apps you want to keep."
                  : org.trialNote
                    ? "A trial was not started for this company. Pay for the apps you want."
                    : access.lapsedSlugs.length > 0
                      ? "Apps are closed because the monthly rent was not paid."
                      : "No apps yet."
                : "No apps are open for you yet."}
            </p>
            {admin ? (
              <Button asChild className="mt-4">
                <Link href="/products">
                  {(access.trialEndsAt && !access.trialActive) || org.trialNote || access.lapsedSlugs.length > 0
                    ? "Pay to open apps"
                    : "Browse products"}
                </Link>
              </Button>
            ) : null}
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
            An admin chooses which apps you can open.
          </p>
        </section>
      )}
    </DashboardShell>
  );
}
