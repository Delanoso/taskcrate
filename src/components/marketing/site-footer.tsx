import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-sidebar text-sidebar-foreground">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-12 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-semibold">TaskCrate</p>
          <p className="mt-1 max-w-md text-sm text-sidebar-foreground/70">
            Premium micro-SaaS tools for growing teams — one dashboard, strict tenant isolation,
            and branding on every document.
          </p>
          <p className="mt-3 text-xs text-sidebar-foreground/50">© Delano Solutions</p>
        </div>
        <div className="flex gap-6 text-sm text-sidebar-foreground/70">
          <Link href="/legal/terms" className="hover:text-sidebar-foreground">
            Terms
          </Link>
          <Link href="/legal/privacy" className="hover:text-sidebar-foreground">
            Privacy
          </Link>
          <Link href="/products" className="hover:text-sidebar-foreground">
            Catalog
          </Link>
          <Link href="/register" className="hover:text-sidebar-foreground">
            7-day trial
          </Link>
        </div>
      </div>
    </footer>
  );
}
