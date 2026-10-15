import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; reset?: string }>;
}) {
  const sp = await searchParams;

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 text-card-foreground shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight">Sign in to your workspace</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          One login for every TaskCrate app your company subscribes to.
        </p>

        {/* Fully native controls — no Base UI (Safari form name/submit bugs) */}
        <form action="/api/auth/login" method="post" className="mt-6 space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium">
              Work email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-base"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-base"
            />
          </div>
          <p className="text-right text-sm">
            <Link href="/forgot-password" className="text-muted-foreground underline">
              Forgot password?
            </Link>
          </p>
          {sp.reset ? (
            <p className="text-sm text-foreground">Password updated. Sign in with the new password.</p>
          ) : null}
          {sp.error ? <p className="text-sm text-red-600">{sp.error}</p> : null}
          <button
            type="submit"
            className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary text-sm font-medium text-primary-foreground"
          >
            Sign in
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          New here?{" "}
          <Link href="/register" className="text-foreground underline">
            Start a 7-day trial
          </Link>
        </p>
        <p className="mt-3 text-center text-[10px] text-muted-foreground/70">auth-build 2026-10-14a</p>
      </div>
    </div>
  );
}
