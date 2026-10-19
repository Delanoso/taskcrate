import { PRODUCTS } from "@/data/products";
import { rentIsOpen } from "@/lib/billing";
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

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const [companies, tickets, openCount, debits, paidThisMonth, failedMail, jobs] = await Promise.all([
    db.organization.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        subscriptions: true,
        memberships: { include: { user: true }, orderBy: { createdAt: "asc" } },
        _count: { select: { supportTickets: true } },
      },
    }),
    db.supportTicket.findMany({
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      take: 60,
      include: { organization: true, user: true },
    }),
    db.supportTicket.count({ where: { status: "open" } }),
    db.debitOrder.findMany({ where: { status: "active", sandbox: false }, include: { organization: { select: { name: true } } } }),
    db.billingPayment.aggregate({ where: { sandbox: false, createdAt: { gte: monthStart } }, _sum: { amountGross: true }, _count: true }),
    db.emailLog.findMany({ where: { status: "failed", createdAt: { gte: new Date(now.getTime() - 7 * 864e5) } }, orderBy: { createdAt: "desc" }, take: 10 }),
    db.jobRun.findMany({ orderBy: { name: "asc" } }),
  ]);
  const mrr = debits.reduce((a, d) => a + d.recurringAmount, 0);
  const behind = debits.filter((d) => d.missedAlertFor);
  const trialsEnding = companies.filter((c) => c.trialEndsAt && c.trialEndsAt > now && c.trialEndsAt.getTime() - now.getTime() < 7 * 864e5);

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

      <dl className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl border bg-card p-4">
          <dt className="text-xs text-muted-foreground">Monthly debit orders</dt>
          <dd className="text-2xl font-semibold">R {mrr.toLocaleString("en-ZA")}</dd>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <dt className="text-xs text-muted-foreground">Paid this month</dt>
          <dd className="text-2xl font-semibold">R {(paidThisMonth._sum.amountGross ?? 0).toLocaleString("en-ZA", { maximumFractionDigits: 0 })}</dd>
          <dd className="text-xs text-muted-foreground">{paidThisMonth._count} payments</dd>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <dt className="text-xs text-muted-foreground">Debits behind</dt>
          <dd className="text-2xl font-semibold">{behind.length}</dd>
          {behind.length > 0 && <dd className="text-xs text-muted-foreground">{behind.map((d) => d.organization.name).join(", ")}</dd>}
        </div>
        <div className="rounded-xl border bg-card p-4">
          <dt className="text-xs text-muted-foreground">Companies</dt>
          <dd className="text-2xl font-semibold">{companies.length}</dd>
          <dd className="text-xs text-muted-foreground">{trialsEnding.length} trials end this week</dd>
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

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border bg-card p-4 text-sm">
          <h2 className="font-medium">Automatic jobs</h2>
          {jobs.length === 0 ? <p className="mt-2 text-muted-foreground">Not run yet. They start a minute after the server starts.</p> : (
            <ul className="mt-2 space-y-1">
              {jobs.map((j) => (
                <li key={j.name} className="flex justify-between gap-2">
                  <span>{j.name}</span>
                  <span className={j.lastOk ? "text-muted-foreground" : "text-destructive"}>{j.lastRunAt.toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" })}{j.lastNote ? ` · ${j.lastNote}` : ""}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-xl border bg-card p-4 text-sm">
          <h2 className="font-medium">Emails that failed (last 7 days)</h2>
          {failedMail.length === 0 ? <p className="mt-2 text-muted-foreground">None. Every customer email went out.</p> : (
            <ul className="mt-2 space-y-1">
              {failedMail.map((m) => <li key={m.id}><span className="font-medium">{m.subject}</span> to {m.to} · <span className="text-destructive">{m.error}</span></li>)}
            </ul>
          )}
        </section>
      </div>

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
                <div className="flex flex-wrap items-center gap-2">
                  <form action="/api/admin" method="post" className="flex items-center gap-1">
                    <input type="hidden" name="intent" value="extend_trial" />
                    <input type="hidden" name="organizationId" value={company.id} />
                    <select name="days" defaultValue="7" className="h-9 rounded-md border bg-background px-2 text-sm" aria-label="Days">
                      <option value="3">3 days</option><option value="7">7 days</option><option value="14">14 days</option><option value="30">30 days</option>
                    </select>
                    <Button type="submit" variant="outline" size="sm">Give trial</Button>
                  </form>
                  {ctx.session.organizationId === company.id ? (
                    <p className="text-sm text-muted-foreground">You are in this workspace</p>
                  ) : (
                    <form action="/api/admin" method="post">
                      <input type="hidden" name="intent" value="enter" />
                      <input type="hidden" name="organizationId" value={company.id} />
                      <Button type="submit" variant="outline" size="sm">
                        Open workspace
                      </Button>
                    </form>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </DashboardShell>
  );
}
