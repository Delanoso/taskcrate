import Link from "next/link";
import Stripe from "stripe";
import { Button } from "@/components/ui/button";
import { provisionWorkspaceFromPayment } from "@/lib/provision";
import { createSession } from "@/lib/session";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string; provider?: string; product?: string }>;
}) {
  const sp = await searchParams;
  let message =
    "Payment received. If your workspace is not ready yet, refresh in a moment — provisioning is automatic.";
  let loginHint: string | null = null;
  let tempPassword: string | undefined;
  let appSlug = sp.product;

  if (sp.session_id && process.env.STRIPE_SECRET_KEY) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      const session = await stripe.checkout.sessions.retrieve(sp.session_id);
      const meta = session.metadata ?? {};
      if (meta.email && meta.fullName && meta.companyName && meta.productSlug) {
        const result = await provisionWorkspaceFromPayment({
          email: meta.email,
          fullName: meta.fullName,
          companyName: meta.companyName,
          productSlug: meta.productSlug,
          paymentRef: session.subscription?.toString() ?? session.id,
          provider: "stripe",
        });
        await createSession({
          userId: result.userId,
          organizationId: result.organizationId,
          email: result.email,
        });
        appSlug = meta.productSlug;
        tempPassword = result.temporaryPassword;
        message = "Payment cleared. Your Delano workspace is ready.";
        loginHint = result.email;
      }
    } catch {
      message = "Payment succeeded but provisioning needs a moment. Try signing in with your checkout email.";
    }
  }

  if (sp.provider === "payfast") {
    message =
      "PayFast confirmed redirect. Your workspace is provisioned when the ITN webhook arrives (usually seconds). Sign in with the email you paid with.";
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">You&apos;re in</h1>
      <p className="mt-3 text-muted-foreground">{message}</p>
      {loginHint && (
        <p className="mt-2 text-sm">
          Signed in as <strong>{loginHint}</strong>
          {tempPassword ? (
            <>
              . Temporary password: <code className="rounded bg-muted px-1">{tempPassword}</code>
            </>
          ) : null}
        </p>
      )}
      <div className="mt-8 flex justify-center gap-3">
        <Button asChild>
          <Link href={appSlug ? `/dashboard/apps/${appSlug}` : "/dashboard"}>Open workspace</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    </div>
  );
}
