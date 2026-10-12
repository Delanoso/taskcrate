import Link from "next/link";
import { PRODUCTS } from "@/data/products";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { HardLink } from "@/components/platform/hard-link";

type Props = {
  organizationName: string;
  activePath: string;
  accessibleSlugs: string[];
  children: React.ReactNode;
};

export function DashboardShell({
  organizationName,
  activePath,
  accessibleSlugs,
  children,
}: Props) {
  const apps = PRODUCTS.filter((p) => accessibleSlugs.includes(p.slug));

  return (
    <div className="min-h-screen bg-muted/20">
      <div className="mx-auto grid max-w-7xl lg:grid-cols-[260px_1fr]">
        <aside className="border-b bg-background lg:min-h-screen lg:border-b-0 lg:border-r">
          <div className="p-4">
            <Link href="/dashboard" className="font-semibold tracking-tight">
              Delano Workspace
            </Link>
            <p className="mt-1 truncate text-xs text-muted-foreground">{organizationName}</p>
          </div>
          <Separator />
          <nav className="space-y-1 p-3 text-sm">
            <NavItem href="/dashboard" active={activePath === "/dashboard"}>
              Overview
            </NavItem>
            <NavItem href="/dashboard/settings/branding" active={activePath.includes("branding")}>
              Branding & PDFs
            </NavItem>
            <NavItem href="/dashboard/settings/team" active={activePath.includes("team")}>
              Team & access
            </NavItem>
            <NavItem href="/dashboard/billing" active={activePath.includes("billing")}>
              Billing
            </NavItem>
          </nav>
          <Separator className="my-2" />
          <div className="px-3 pb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Your apps
          </div>
          <nav className="space-y-1 px-3 pb-6 text-sm">
            {apps.length === 0 ? (
              <p className="px-2 py-2 text-xs text-muted-foreground">
                No active subscriptions yet.
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
          <div className="hidden p-3 lg:block">
            <Button variant="outline" size="sm" asChild className="w-full">
              <Link href="/products">Browse catalog</Link>
            </Button>
          </div>
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
        active ? "bg-primary text-primary-foreground" : "hover:bg-muted",
      )}
    >
      {children}
    </HardLink>
  );
}
