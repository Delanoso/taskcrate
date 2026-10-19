import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/platform/dashboard-shell";
import { BillingManager } from "@/components/platform/billing-manager";
import { PRODUCTS } from "@/data/products";
import { requireDashboardContext } from "@/lib/dashboard-context";
import { canAccessProduct, canAddApps } from "@/lib/rbac";

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ paid?: string; cancelled?: string; card?: string }> }) {
  const ctx = await requireDashboardContext();
  if (!canAddApps(ctx.access.role)) redirect("/dashboard");
  const sp = await searchParams;
  const accessibleSlugs = PRODUCTS.filter((p) => canAccessProduct(ctx.access, p.slug)).map((p) => p.slug);
  const notice = sp.paid ? "paid" : sp.cancelled ? "cancelled" : sp.card ? "card" : null;

  return (
    <DashboardShell
      organizationName={ctx.org.branding?.displayName ?? ctx.org.name}
      activePath="/dashboard/billing"
      accessibleSlugs={accessibleSlugs}
    >
      <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
      <p className="mt-1 text-muted-foreground">Pay for your apps by card through PayFast. One monthly debit order covers every app you choose.</p>
      <BillingManager notice={notice} />
    </DashboardShell>
  );
}
