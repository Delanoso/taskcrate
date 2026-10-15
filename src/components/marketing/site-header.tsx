import Link from "next/link";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-sidebar text-sidebar-foreground">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary text-sm text-sidebar-primary-foreground">
            TC
          </span>
          <span className="hidden min-[400px]:inline">TaskCrate</span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-sidebar-foreground/70 md:flex">
          <Link href="/products" className="hover:text-sidebar-foreground">
            Products
          </Link>
          <Link href="/#platform" className="hover:text-sidebar-foreground">
            Platform
          </Link>
          <Link href="/legal/terms" className="hover:text-sidebar-foreground">
            Terms
          </Link>
          <Link href="/legal/privacy" className="hover:text-sidebar-foreground">
            Privacy
          </Link>
        </nav>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <Link href="/login">Sign in</Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            asChild
            className="border-white/25 bg-transparent text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <Link href="/register">Register</Link>
          </Button>
          <Button
            size="sm"
            asChild
            className="bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
          >
            <Link href="/products">Browse apps</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
