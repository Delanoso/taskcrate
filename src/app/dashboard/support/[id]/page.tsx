import Link from "next/link";
import { notFound } from "next/navigation";
import { PRODUCTS } from "@/data/products";
import { DashboardShell } from "@/components/platform/dashboard-shell";
import { Button } from "@/components/ui/button";
import { requireDashboardContext } from "@/lib/dashboard-context";
import { db } from "@/lib/db";
import { canAccessProduct } from "@/lib/rbac";
import { productLabel } from "@/lib/support";

export default async function SupportTicketPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sent?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { org, access } = await requireDashboardContext();
  const ticket = await db.supportTicket.findFirst({
    where: { id, organizationId: org.id },
    include: { user: true, replies: { include: { user: true }, orderBy: { createdAt: "asc" } } },
  });
  if (!ticket) notFound();
  const accessible = PRODUCTS.filter((p) => canAccessProduct(access, p.slug)).map((p) => p.slug);

  return (
    <DashboardShell
      organizationName={org.branding?.displayName ?? org.name}
      activePath="/dashboard/support"
      accessibleSlugs={accessible}
    >
      <Link href="/dashboard/support" className="text-sm text-muted-foreground hover:underline">
        All tickets
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">{ticket.subject}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {productLabel(ticket.productSlug)} · {ticket.status === "open" ? "Open" : "Resolved"} ·{" "}
        {ticket.user.fullName}
      </p>
      {sp.sent ? <p className="mt-4 text-sm">Message sent.</p> : null}
      <article className="mt-6 rounded-xl border bg-card p-4 whitespace-pre-wrap">{ticket.body}</article>
      <ul className="mt-4 space-y-3">
        {ticket.replies.map((reply) => (
          <li key={reply.id} className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">
              {reply.user.fullName} · {reply.createdAt.toLocaleString("en-ZA")}
            </p>
            <p className="mt-2 whitespace-pre-wrap">{reply.body}</p>
          </li>
        ))}
      </ul>
      {ticket.status === "open" ? (
        <form action="/api/support" method="post" className="mt-6 max-w-xl space-y-3">
          <input type="hidden" name="intent" value="reply" />
          <input type="hidden" name="ticketId" value={ticket.id} />
          <textarea
            name="body"
            required
            minLength={2}
            rows={4}
            placeholder="Add more detail"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-base"
          />
          <Button type="submit">Send update</Button>
        </form>
      ) : (
        <p className="mt-6 text-sm text-muted-foreground">This ticket is resolved.</p>
      )}
    </DashboardShell>
  );
}
