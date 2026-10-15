import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const token = sp.token ?? "";

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 text-card-foreground shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight">Choose a password</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Use at least 8 characters. This link works once. Saving it accepts the{" "}
          <Link href="/legal/terms" className="underline">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/legal/privacy" className="underline">
            Privacy notice
          </Link>
          .
        </p>

        {token ? (
          <form action="/api/auth/reset" method="post" className="mt-6 space-y-4">
            <input type="hidden" name="token" value={token} />
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
                Confirm password
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
            {sp.error ? <p className="text-sm text-red-600">{sp.error}</p> : null}
            <button
              type="submit"
              className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary text-sm font-medium text-primary-foreground"
            >
              Save password
            </button>
          </form>
        ) : (
          <p className="mt-6 text-sm text-red-600">
            {sp.error || "This reset link is missing. Request a new one from the sign-in page."}
          </p>
        )}

        <p className="mt-4 text-center text-sm text-muted-foreground">
          <Link href="/forgot-password" className="text-foreground underline">
            Request a new link
          </Link>
        </p>
      </div>
    </div>
  );
}
