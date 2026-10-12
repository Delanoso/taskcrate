import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/20">
      <div className="border-b bg-background px-4 py-4">
        <Link href="/" className="font-semibold">
          ← Delano Solutions
        </Link>
      </div>
      {children}
    </div>
  );
}
