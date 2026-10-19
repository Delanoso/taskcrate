import Link from "next/link";
import { PRODUCTS } from "@/data/products";
import { DashboardShell } from "@/components/platform/dashboard-shell";
import { Button } from "@/components/ui/button";
import { requireDashboardContext } from "@/lib/dashboard-context";
import { db } from "@/lib/db";
import { canAccessProduct } from "@/lib/rbac";
import { mailConfigured } from "@/lib/mail";
import { alertEmail } from "@/lib/platform-admin";
import { productLabel } from "@/lib/support";

const field =
  "h-10 w-full rounded-lg border border-input bg-background px-3 text-base";

export default async function SupportPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const { org, access } = await requireDashboardContext();
  const sp = await searchParams;
  const tickets = await db.supportTicket.findMany({
    where: { organizationId: org.id },
    orderBy: { createdAt: "desc" },
    include: { user: true },
  });
  const accessible = PRODUCTS.filter((p) => canAccessProduct(access, p.slug)).map((p) => p.slug);

  return (
    <DashboardShell
      organizationName={org.branding?.displayName ?? org.name}
      activePath="/dashboard/support"
      accessibleSlugs={accessible}
    >
      <h1 className="text-2xl font-semibold tracking-tight">Support</h1>
      <p className="mt-1 text-muted-foreground">
        Tell us what went wrong. The ticket is saved here and sent to {alertEmail()}.
      </p>

      {sp.sent ? (
        <p className="mt-4 rounded-lg border bg-card px-4 py-3 text-sm">Ticket saved.</p>
      ) : null}
      {sp.error ? (
        <p className="mt-4 text-sm text-destructive">{sp.error === "busy" ? "Too many tickets in a short time. Please wait a few minutes." : "Add a short subject and describe the problem."}</p>
      ) : null}
      {!mailConfigured() ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Tickets are stored in the control room. Email delivery starts once the mailbox login is on the server.
        </p>
      ) : null}

      <form action="/api/support" method="post" className="mt-6 max-w-xl space-y-3 rounded-xl border bg-card p-4">
        <input type="hidden" name="intent" value="create" />
        <label className="block text-sm font-medium">
          Subject
          <input name="subject" required minLength={3} maxLength={140} className={`${field} mt-1`} />
        </label>
        <label className="block text-sm font-medium">
          Which app
          <select name="productSlug" className={`${field} mt-1`}>
            <option value="">General</option>
            {PRODUCTS.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium">
          What happened
          <textarea name="body" required minLength={10} rows={5} className={`${field} mt-1 h-auto py-2`} />
        </label>
        <Button type="submit">Send ticket</Button>
      </form>

      <h2 className="mt-10 text-lg font-medium">Your tickets</h2>
      <ul className="mt-3 space-y-3">
        {tickets.length === 0 ? (
          <li className="text-sm text-muted-foreground">No tickets yet.</li>
        ) : (
          tickets.map((ticket) => (
            <li key={ticket.id} className="rounded-xl border bg-card p-4">
              <Link href={`/dashboard/support/${ticket.id}`} className="font-medium hover:underline">
                {ticket.subject}
              </Link>
              <p className="mt-1 text-xs text-muted-foreground">
                {productLabel(ticket.productSlug)} · {ticket.status === "open" ? "Open" : "Resolved"} ·{" "}
                {ticket.createdAt.toLocaleString("en-ZA")}
              </p>
            </li>
          ))
        )}
      </ul>
    </DashboardShell>
  );
}
