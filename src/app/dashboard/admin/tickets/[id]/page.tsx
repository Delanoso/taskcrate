import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PRODUCTS } from "@/data/products";
import { DashboardShell } from "@/components/platform/dashboard-shell";
import { Button } from "@/components/ui/button";
import { requireDashboardContext } from "@/lib/dashboard-context";
import { db } from "@/lib/db";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { productLabel } from "@/lib/support";

export default async function AdminTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireDashboardContext();
  if (!isPlatformAdmin(ctx.user)) redirect("/dashboard");

  const ticket = await db.supportTicket.findUnique({
    where: { id },
    include: {
      organization: true,
      user: true,
      replies: { include: { user: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!ticket) notFound();

  return (
    <DashboardShell
      organizationName={ctx.org.branding?.displayName ?? ctx.org.name}
      activePath="/dashboard/admin"
      accessibleSlugs={PRODUCTS.map((p) => p.slug)}
    >
      <Link href="/dashboard/admin" className="text-sm text-muted-foreground hover:underline">
        Control room
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">{ticket.subject}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {ticket.organization.name} · {ticket.user.fullName} · {ticket.user.email} ·{" "}
        {productLabel(ticket.productSlug)} · {ticket.status === "open" ? "Open" : "Resolved"}
      </p>
      {ticket.mailError ? (
        <p className="mt-4 rounded-lg border bg-card px-4 py-3 text-sm">{ticket.mailError}</p>
      ) : null}
      <article className="mt-6 rounded-xl border bg-card p-4 whitespace-pre-wrap">{ticket.body}</article>
      <ul className="mt-4 space-y-3">
        {ticket.replies.map((reply) => (
          <li key={reply.id} className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">
              {reply.user.fullName} · {reply.user.email} · {reply.createdAt.toLocaleString("en-ZA")}
            </p>
            <p className="mt-2 whitespace-pre-wrap">{reply.body}</p>
          </li>
        ))}
      </ul>
      <div className="mt-6 flex flex-wrap gap-3">
        <form action="/api/admin" method="post">
          <input type="hidden" name="ticketId" value={ticket.id} />
          <input type="hidden" name="intent" value={ticket.status === "open" ? "resolve" : "reopen"} />
          <Button type="submit" variant="outline">
            {ticket.status === "open" ? "Mark resolved" : "Reopen"}
          </Button>
        </form>
        {ctx.session.organizationId !== ticket.organizationId ? (
          <form action="/api/admin" method="post">
            <input type="hidden" name="intent" value="enter" />
            <input type="hidden" name="organizationId" value={ticket.organizationId} />
            <Button type="submit">Open their workspace</Button>
          </form>
        ) : null}
      </div>
      <form action="/api/admin" method="post" className="mt-6 max-w-xl space-y-3">
        <input type="hidden" name="intent" value="reply" />
        <input type="hidden" name="ticketId" value={ticket.id} />
        <label className="block text-sm font-medium">
          Reply
          <textarea
            name="body"
            required
            minLength={2}
            rows={4}
            className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-base"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="resolve" value="1" className="size-4" />
          Mark resolved with this reply
        </label>
        <Button type="submit">Send reply to {ticket.user.email}</Button>
        <p className="text-xs text-muted-foreground">The customer gets your reply by email with a link back to the ticket.</p>
      </form>
    </DashboardShell>
  );
}
