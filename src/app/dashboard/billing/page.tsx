import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/platform/dashboard-shell";
import { PRODUCTS } from "@/data/products";
import { formatRentDate, rentIsOpen } from "@/lib/billing";
import { monthQuote } from "@/lib/pricing";
import { requireDashboardContext } from "@/lib/dashboard-context";
import { db } from "@/lib/db";
import { canAccessProduct, canAddApps } from "@/lib/rbac";

export default async function BillingPage() {
  const ctx = await requireDashboardContext();
  if (!canAddApps(ctx.access.role)) redirect("/dashboard");
  const accessibleSlugs = PRODUCTS.filter((p) => canAccessProduct(ctx.access, p.slug)).map(
    (p) => p.slug,
  );
  const rents = await db.subscription.findMany({
    where: { organizationId: ctx.session.organizationId },
    orderBy: { createdAt: "desc" },
  });
  const quote = monthQuote();
  const trialOpen = !!(ctx.org.trialEndsAt && ctx.org.trialEndsAt.getTime() > Date.now());

  return (
    <DashboardShell
      organizationName={ctx.org.branding?.displayName ?? ctx.org.name}
      activePath="/dashboard/billing"
      accessibleSlugs={accessibleSlugs}
    >
      <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
      <p className="mt-1 text-muted-foreground">
        Each app is R1 000 on the 1st of the month. The first payment is only the days left until then:
        R{quote.amount.toFixed(2)} for {quote.daysLeft} day{quote.daysLeft === 1 ? "" : "s"} if you pay today.
      </p>
      {trialOpen && ctx.org.trialEndsAt ? (
        <p className="mt-4 rounded-lg border bg-card px-4 py-3 text-sm">
          Trial of every app until {formatRentDate(ctx.org.trialEndsAt)}.
          {ctx.org.trialNote ? ` ${ctx.org.trialNote}` : ""}
        </p>
      ) : ctx.org.trialNote ? (
        <p className="mt-4 rounded-lg border bg-card px-4 py-3 text-sm">{ctx.org.trialNote}</p>
      ) : null}
      <ul className="mt-8 space-y-3">
        {rents.length === 0 ? (
          <li className="text-muted-foreground">No rents yet.</li>
        ) : (
          rents.map((rent) => {
            const product = PRODUCTS.find((item) => item.slug === rent.productSlug);
            const open = rentIsOpen(rent);
            return (
              <li key={rent.id} className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium">{product?.name ?? rent.productSlug}</p>
                  <p className="text-sm text-muted-foreground">
                    {open && rent.currentPeriodEnd
                      ? `Paid until ${formatRentDate(rent.currentPeriodEnd)}`
                      : "Closed — payment was not received"}
                  </p>
                </div>
                {open ? (
                  <Link href={`/dashboard/apps/${rent.productSlug}`} className="text-sm underline">
                    Open app
                  </Link>
                ) : canAddApps(ctx.access.role) ? (
                  <Link href={`/products/${rent.productSlug}`} className="text-sm underline">
                    Pay to reopen
                  </Link>
                ) : (
                  <span className="text-sm text-muted-foreground">Closed</span>
                )}
              </li>
            );
          })
        )}
      </ul>
      {canAddApps(ctx.access.role) ? (
        <div className="mt-6 text-sm">
          <Link href="/products" className="underline">
            Add another app
          </Link>
        </div>
      ) : null}
    </DashboardShell>
  );
}
