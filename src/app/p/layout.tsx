import { Suspense } from "react";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,oklch(0.86_0.06_250),oklch(0.94_0.028_250)_55%)]">
      <div className="mx-auto max-w-lg px-4 py-10">
        <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
          {children}
        </Suspense>
      </div>
    </div>
  );
}
