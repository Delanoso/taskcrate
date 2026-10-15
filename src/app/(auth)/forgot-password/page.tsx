import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const sp = await searchParams;

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 text-card-foreground shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight">Reset your password</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter the work email on the account. If it is registered, we email a link that works for one hour.
        </p>

        <form action="/api/auth/forgot" method="post" className="mt-6 space-y-4">
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
          {sp.sent ? (
            <p className="text-sm text-foreground">
              If that email is registered, we sent a reset link. It expires in one hour and can be used once.
            </p>
          ) : null}
          {sp.error ? <p className="text-sm text-red-600">{sp.error}</p> : null}
          <button
            type="submit"
            className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary text-sm font-medium text-primary-foreground"
          >
            Email reset link
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          <Link href="/login" className="text-foreground underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
