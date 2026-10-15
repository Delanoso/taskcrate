import { PRODUCTS } from "@/data/products";
import { expireUnpaidSubscriptions, rentIsOpen } from "@/lib/billing";
import { DashboardShell } from "@/components/platform/dashboard-shell";
import { Button } from "@/components/ui/button";
import { requireDashboardContext } from "@/lib/dashboard-context";
import { db } from "@/lib/db";
import { mailConfigured } from "@/lib/mail";
import { alertEmail, isPlatformAdmin } from "@/lib/platform-admin";
import { productLabel } from "@/lib/support";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AdminHomePage() {
  const ctx = await requireDashboardContext();
  if (!isPlatformAdmin(ctx.user)) redirect("/dashboard");

  await expireUnpaidSubscriptions();

  const [companies, tickets, openCount] = await Promise.all([
    db.organization.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        subscriptions: true,
        memberships: { include: { user: true }, orderBy: { createdAt: "asc" } },
        _count: { select: { supportTickets: true } },
      },
    }),
    db.supportTicket.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { organization: true, user: true },
    }),
    db.supportTicket.count({ where: { status: "open" } }),
  ]);

  const slugs = PRODUCTS.map((p) => p.slug);

  return (
    <DashboardShell
      organizationName={ctx.org.branding?.displayName ?? ctx.org.name}
      activePath="/dashboard/admin"
      accessibleSlugs={slugs}
    >
      <h1 className="text-2xl font-semibold tracking-tight">Control room</h1>
      <p className="mt-1 text-muted-foreground">
        Every company, every app, and every support ticket. Alerts go to {alertEmail()}.
      </p>
      {!mailConfigured() ? (
        <p className="mt-4 rounded-lg border bg-card px-4 py-3 text-sm">
          Tickets are saved here. They are not emailed yet, because the server still needs the mailbox
          login for {alertEmail()}.
        </p>
      ) : null}

      <dl className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4">
          <dt className="text-xs text-muted-foreground">Companies</dt>
          <dd className="text-2xl font-semibold">{companies.length}</dd>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <dt className="text-xs text-muted-foreground">Open tickets</dt>
          <dd className="text-2xl font-semibold">{openCount}</dd>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <dt className="text-xs text-muted-foreground">Active app rents</dt>
          <dd className="text-2xl font-semibold">
            {companies.reduce(
              (sum, company) => sum + company.subscriptions.filter((sub) => rentIsOpen(sub)).length,
              0,
            )}
          </dd>
        </div>
      </dl>

      <h2 className="mt-10 text-lg font-medium">Tickets</h2>
      <ul className="mt-3 space-y-3">
        {tickets.length === 0 ? (
          <li className="text-sm text-muted-foreground">No tickets yet.</li>
        ) : (
          tickets.map((ticket) => (
            <li key={ticket.id} className="rounded-xl border bg-card p-4">
              <Link href={`/dashboard/admin/tickets/${ticket.id}`} className="font-medium hover:underline">
                {ticket.subject}
              </Link>
              <p className="mt-1 text-sm text-muted-foreground">
                {ticket.organization.name} · {ticket.user.email} · {productLabel(ticket.productSlug)} ·{" "}
                {ticket.status === "open" ? "Open" : "Resolved"}
              </p>
            </li>
          ))
        )}
      </ul>

      <h2 className="mt-10 text-lg font-medium">Companies</h2>
      <ul className="mt-3 space-y-3">
        {companies.map((company) => {
          const owner = company.memberships[0]?.user;
          const openRents = company.subscriptions.filter((sub) => rentIsOpen(sub));
          return (
            <li key={company.id} className="rounded-xl border bg-card p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">{company.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {owner ? `${owner.fullName} · ${owner.email}` : "No owner"}
                    {company.phone ? ` · ${company.phone}` : ""} · registered{" "}
                    {company.createdAt.toLocaleDateString("en-ZA")} · {openRents.length} open apps ·{" "}
                    {company._count.supportTickets} tickets
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {company.trialEndsAt && company.trialEndsAt.getTime() > Date.now()
                      ? `Trial until ${company.trialEndsAt.toLocaleDateString("en-ZA")}`
                      : company.trialEndsAt
                        ? `Trial ended ${company.trialEndsAt.toLocaleDateString("en-ZA")}`
                        : company.trialNote ?? "No trial"}
                  </p>
                  {company.subscriptions.length > 0 ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {company.subscriptions
                        .map((sub) => {
                          const name = PRODUCTS.find((p) => p.slug === sub.productSlug)?.name ?? sub.productSlug;
                          return rentIsOpen(sub) ? name : `${name} (closed)`;
                        })
                        .join(", ")}
                    </p>
                  ) : null}
                </div>
                {ctx.session.organizationId === company.id ? (
                  <p className="text-sm text-muted-foreground">You are in this workspace</p>
                ) : (
                  <form action="/api/admin" method="post">
                    <input type="hidden" name="intent" value="enter" />
                    <input type="hidden" name="organizationId" value={company.id} />
                    <Button type="submit" variant="outline">
                      Open workspace
                    </Button>
                  </form>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </DashboardShell>
  );
}
