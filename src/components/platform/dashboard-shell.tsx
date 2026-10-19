import Link from "next/link";
import { PRODUCTS } from "@/data/products";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { HardLink } from "@/components/platform/hard-link";
import { db } from "@/lib/db";
import { isCompanyAdmin } from "@/lib/rbac";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { getSession } from "@/lib/session";

type Props = {
  organizationName: string;
  activePath: string;
  accessibleSlugs: string[];
  children: React.ReactNode;
};

export async function DashboardShell({
  organizationName,
  activePath,
  accessibleSlugs,
  children,
}: Props) {
  const apps = PRODUCTS.filter((p) => accessibleSlugs.includes(p.slug));
  const session = await getSession();
  const account = session
    ? await db.user.findUnique({
        where: { id: session.userId },
        select: { email: true, platformAdmin: true },
      })
    : null;
  const membership = session
    ? await db.membership.findUnique({
        where: {
          userId_organizationId: {
            userId: session.userId,
            organizationId: session.organizationId,
          },
        },
        select: { role: true },
      })
    : null;
  const platformAdmin = isPlatformAdmin(account);
  const companyAdmin = platformAdmin || (membership ? isCompanyAdmin(membership.role) : false);

  const links = [
    { href: "/dashboard", label: "Overview", active: activePath === "/dashboard", show: true },
    { href: "/dashboard/settings/branding", label: "Branding & PDFs", active: activePath.includes("branding"), show: companyAdmin },
    { href: "/dashboard/settings/team", label: "People & access", active: activePath.includes("team"), show: companyAdmin },
    { href: "/dashboard/settings/password", label: "Account", active: activePath.includes("password"), show: true },
    { href: "/dashboard/billing", label: "Billing", active: activePath.includes("billing"), show: companyAdmin },
    { href: "/dashboard/support", label: "Support", active: activePath.includes("/support"), show: true },
    { href: "/dashboard/admin", label: "Control room", active: activePath.includes("/admin"), show: platformAdmin },
  ].filter((l) => l.show);
  const currentApp = apps.find((a) => activePath.includes(a.slug));

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-sidebar-border bg-sidebar text-sidebar-foreground lg:hidden">
        <div className="flex items-baseline justify-between gap-3 px-4 pt-3">
          <Link href="/dashboard" className="font-semibold tracking-tight">TaskCrate</Link>
          <p className="truncate text-xs text-sidebar-foreground/60">{organizationName}</p>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 py-2 text-sm">
          {links.map((l) => (
            <HardLink key={l.href} href={l.href}
              className={cn("shrink-0 rounded-full px-3 py-1.5", l.active ? "bg-sidebar-primary font-medium text-sidebar-primary-foreground" : "bg-sidebar-accent/40 text-sidebar-foreground/80")}>
              {l.label}
            </HardLink>
          ))}
        </nav>
        <details className="group border-t border-sidebar-border">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-2.5 text-sm">
            <span>
              <span className="text-sidebar-foreground/60">Your apps ({apps.length})</span>
              {currentApp ? <span className="ml-2 font-medium">{currentApp.name}</span> : null}
            </span>
            <span className="text-xs text-sidebar-foreground/60 group-open:hidden">Show</span>
            <span className="hidden text-xs text-sidebar-foreground/60 group-open:inline">Hide</span>
          </summary>
          <nav className="grid gap-1 px-3 pb-3 text-sm sm:grid-cols-2">
            {apps.length === 0 ? <p className="px-2 py-2 text-xs text-sidebar-foreground/60">No apps are open.</p> : null}
            {apps.map((app) => (
              <NavItem key={app.slug} href={`/dashboard/apps/${app.slug}`} active={activePath.includes(app.slug)}>{app.name}</NavItem>
            ))}
            {companyAdmin ? <NavItem href="/products" active={false}>Browse catalog</NavItem> : null}
          </nav>
        </details>
      </header>
      <div className="mx-auto grid max-w-7xl lg:grid-cols-[260px_1fr]">
        <aside className="hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:block lg:min-h-screen">
          <div className="p-4">
            <Link href="/dashboard" className="font-semibold tracking-tight">
              TaskCrate
            </Link>
            <p className="mt-1 truncate text-xs text-sidebar-foreground/60">{organizationName}</p>
          </div>
          <Separator className="bg-sidebar-border" />
          <nav className="space-y-1 p-3 text-sm">
            {links.map((l) => (
              <NavItem key={l.href} href={l.href} active={l.active}>{l.label}</NavItem>
            ))}
          </nav>
          <Separator className="my-2 bg-sidebar-border" />
          <div className="px-3 pb-2 text-xs font-medium uppercase tracking-wide text-sidebar-foreground/50">
            Your apps
          </div>
          <nav className="space-y-1 px-3 pb-6 text-sm">
            {apps.length === 0 ? (
              <p className="px-2 py-2 text-xs text-sidebar-foreground/60">
                No apps are open.
              </p>
            ) : (
              apps.map((app) => (
                <NavItem
                  key={app.slug}
                  href={`/dashboard/apps/${app.slug}`}
                  active={activePath.includes(app.slug)}
                >
                  {app.name}
                </NavItem>
              ))
            )}
          </nav>
          {companyAdmin ? (
            <div className="p-3">
              <Button variant="outline" size="sm" asChild className="w-full border-white/20 bg-transparent text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground">
                <Link href="/products">Browse catalog</Link>
              </Button>
            </div>
          ) : null}
        </aside>
        <main className="min-w-0 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

function NavItem({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <HardLink
      href={href}
      className={cn(
        "block rounded-md px-2 py-2 transition-colors",
        active
          ? "bg-sidebar-primary font-medium text-sidebar-primary-foreground"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
      )}
    >
      {children}
    </HardLink>
  );
}
