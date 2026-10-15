import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-white/10 bg-sidebar px-4 py-4 text-sidebar-foreground">
        <Link href="/" className="font-semibold">
          ← TaskCrate
        </Link>
      </div>
      {children}
    </div>
  );
}
