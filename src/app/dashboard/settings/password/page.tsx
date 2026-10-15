import { DashboardShell } from "@/components/platform/dashboard-shell";
import { PRODUCTS } from "@/data/products";
import { requireDashboardContext } from "@/lib/dashboard-context";
import { canAccessProduct } from "@/lib/rbac";

export default async function PasswordSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string; name?: string; nameError?: string }>;
}) {
  const ctx = await requireDashboardContext();
  const sp = await searchParams;
  const accessibleSlugs = PRODUCTS.filter((p) => canAccessProduct(ctx.access, p.slug)).map(
    (p) => p.slug,
  );

  return (
    <DashboardShell
      organizationName={ctx.org.branding?.displayName ?? ctx.org.name}
      activePath="/dashboard/settings/password"
      accessibleSlugs={accessibleSlugs}
    >
      <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
      <p className="mt-1 max-w-2xl text-muted-foreground">
        This is the name shown for {ctx.user.email}.
      </p>
      <form action="/api/account/name" method="post" className="mt-8 max-w-md space-y-4 rounded-xl border bg-card p-6">
        <div className="space-y-2">
          <label htmlFor="fullName" className="block text-sm font-medium">
            Name
          </label>
          <input
            id="fullName"
            name="fullName"
            required
            minLength={2}
            maxLength={120}
            defaultValue={ctx.user.fullName}
            autoComplete="name"
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-base"
          />
        </div>
        {sp.name ? <p className="text-sm text-foreground">Name updated.</p> : null}
        {sp.nameError ? <p className="text-sm text-red-600">{sp.nameError}</p> : null}
        <button
          type="submit"
          className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          Save name
        </button>
      </form>
      <h2 className="mt-10 text-lg font-medium">Password</h2>
      <p className="mt-1 max-w-2xl text-muted-foreground">
        Changing your password signs out other browsers and phones. This one stays signed in.
      </p>
      <form
        action="/api/auth/password"
        method="post"
        className="mt-8 max-w-md space-y-4 rounded-xl border bg-card p-6"
      >
        <div className="space-y-2">
          <label htmlFor="current" className="block text-sm font-medium">
            Current password
          </label>
          <input
            id="current"
            name="current"
            type="password"
            required
            autoComplete="current-password"
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-base"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-medium">
            New password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-base"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="confirm" className="block text-sm font-medium">
            Confirm new password
          </label>
          <input
            id="confirm"
            name="confirm"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-base"
          />
        </div>
        {sp.saved ? <p className="text-sm text-foreground">Password updated.</p> : null}
        {sp.error ? <p className="text-sm text-red-600">{sp.error}</p> : null}
        <button
          type="submit"
          className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          Save password
        </button>
      </form>
    </DashboardShell>
  );
}
