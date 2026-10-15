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

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto grid max-w-7xl lg:grid-cols-[260px_1fr]">
        <aside className="border-b border-sidebar-border bg-sidebar text-sidebar-foreground lg:min-h-screen lg:border-b-0 lg:border-r">
          <div className="p-4">
            <Link href="/dashboard" className="font-semibold tracking-tight">
              TaskCrate
            </Link>
            <p className="mt-1 truncate text-xs text-sidebar-foreground/60">{organizationName}</p>
          </div>
          <Separator className="bg-sidebar-border" />
          <nav className="space-y-1 p-3 text-sm">
            <NavItem href="/dashboard" active={activePath === "/dashboard"}>
              Overview
            </NavItem>
            {companyAdmin ? (
              <NavItem href="/dashboard/settings/branding" active={activePath.includes("branding")}>
                Branding & PDFs
              </NavItem>
            ) : null}
            {companyAdmin ? (
              <NavItem href="/dashboard/settings/team" active={activePath.includes("team")}>
                People & access
              </NavItem>
            ) : null}
            <NavItem href="/dashboard/settings/password" active={activePath.includes("password")}>
              Account
            </NavItem>
            {companyAdmin ? (
              <NavItem href="/dashboard/billing" active={activePath.includes("billing")}>
                Billing
              </NavItem>
            ) : null}
            <NavItem href="/dashboard/support" active={activePath.includes("/support")}>
              Support
            </NavItem>
            {platformAdmin ? (
              <NavItem href="/dashboard/admin" active={activePath.includes("/admin")}>
                Control room
              </NavItem>
            ) : null}
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
            <div className="hidden p-3 lg:block">
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
