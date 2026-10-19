import { db } from "@/lib/db";
import { appOrigin, emailCompanyAdmins } from "@/lib/email";
import { wakeDue } from "@/lib/modules/ob";

const DAY = 24 * 60 * 60 * 1000;

const saToday = () => new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Johannesburg" });

type Item = { org: string; slug: string; text: string };

function add(items: Item[], org: string, slug: string, text: string) {
  items.push({ org, slug, text });
}

/** One morning email per company for work that is sitting unfinished. */
export async function sendOpsWatch(now = new Date()) {
  const today = saToday();
  const todayStart = new Date(`${today}T00:00:00+02:00`);
  const yesterday = new Date(todayStart.getTime() - DAY);
  const twoDays = new Date(now.getTime() - 2 * DAY);
  const week = new Date(now.getTime() - 7 * DAY);
  const since = new Date(todayStart.getTime() - 3 * DAY);
  const items: Item[] = [];

  const punches = await db.attendancePunch.findMany({
    where: { createdAt: { gte: since } },
    include: { site: { select: { organizationId: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });
  const lastPunch = new Map<string, (typeof punches)[number]>();
  for (const punch of punches) {
    const who = (punch.employeeNumber || punch.fullName).trim().toLowerCase();
    lastPunch.set(`${punch.site.organizationId}|${who}`, punch);
  }
  for (const punch of lastPunch.values()) {
    if (punch.direction === "IN" && punch.createdAt < todayStart) {
      add(items, punch.site.organizationId, "site-attendance", `${punch.fullName} clocked in at ${punch.site.name} and has not clocked out.`);
    }
  }

  const visitors = await db.visitorCheckIn.findMany({
    where: { checkedOutAt: null, createdAt: { lt: todayStart } },
    include: { site: { select: { organizationId: true, name: true } } },
  });
  for (const visitor of visitors) {
    add(items, visitor.site.organizationId, "site-visitor", `${visitor.fullName} is still signed in at ${visitor.site.name}.`);
  }

  const reports = await db.nearMissReport.findMany({
    where: { status: { not: "closed" }, dueDate: { lt: todayStart } },
  });
  for (const report of reports) {
    add(items, report.organizationId, "near-miss-whisperer", `${report.reference ?? "A report"} is past its action date.`);
  }

  const accidents = await db.accidentReport.findMany({
    where: { status: { not: "closed" }, createdAt: { lt: twoDays } },
  });
  for (const report of accidents) {
    add(items, report.organizationId, "accident-report", `${report.reportNumber} for ${report.injuredName} is still open.`);
  }

  const stock = await db.stockItem.findMany({ select: { organizationId: true, name: true, quantity: true, reorderAt: true, unit: true } });
  for (const item of stock) {
    if (item.quantity <= item.reorderAt) {
      add(items, item.organizationId, "workshop-consumables", `${item.name} is at ${item.quantity} ${item.unit} (reorder at ${item.reorderAt}).`);
    }
  }

  const meters = await db.meterSite.findMany({
    include: { readings: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  for (const site of meters) {
    const latest = site.readings[0];
    if (!latest || latest.createdAt < week) {
      add(items, site.organizationId, "meter-variance", `${site.name} has no reading in the last 7 days.`);
    }
  }

  const talks = await db.toolboxTalk.findMany({
    where: { status: "open", createdAt: { lt: twoDays }, attendances: { none: {} } },
  });
  for (const talk of talks) {
    add(items, talk.organizationId, "toolbox-talks", `“${talk.title}” has been open for two days with no signatures.`);
  }

  const gear = await db.equipmentIssue.findMany({
    where: { status: "active", dueBackAt: { lt: todayStart } },
    include: { item: { select: { name: true } } },
  });
  for (const issue of gear) {
    add(items, issue.organizationId, "equipment-handback", `${issue.item.name} is still with ${issue.employeeName} after the return date.`);
  }

  const unsignedGear = await db.equipmentIssue.findMany({
    where: { status: "awaiting_signature", createdAt: { lt: yesterday } },
    include: { item: { select: { name: true } } },
  });
  for (const issue of unsignedGear) {
    add(items, issue.organizationId, "equipment-issuer", `${issue.employeeName} has not signed for ${issue.item.name}.`);
  }

  const aods = await db.loanDeductibleRecord.findMany({
    where: { status: "pending", createdAt: { lt: yesterday } },
  });
  for (const record of aods) {
    add(items, record.organizationId, "loan-deductible-ledger", `${record.reference ?? "An AOD"} for ${record.employeeName} is still unsigned.`);
  }

  const hearings = await db.disciplineEntry.findMany({
    where: { status: "hearing", hearingAt: { lt: todayStart } },
  });
  for (const entry of hearings) {
    add(items, entry.organizationId, "discipline-log", `${entry.reference ?? entry.employeeName}'s hearing date has passed and the outcome is not recorded.`);
  }

  const audits = await db.ohsaAudit.findMany({
    where: { status: "in_progress", createdAt: { lt: twoDays } },
  });
  for (const audit of audits) {
    add(items, audit.organizationId, "ohsa-mock-auditor", `“${audit.title}” has been open for two days.`);
  }

  const packs = await db.onboardingPacket.findMany({
    where: { status: "submitted", submittedAt: { lt: yesterday } },
  });
  for (const pack of packs) {
    add(items, pack.organizationId, "onboard-docs", `${pack.employeeName}'s onboarding pack is waiting for a review.`);
  }

  const byOrg = new Map<string, Map<string, string[]>>();
  for (const item of items) {
    const slugs = byOrg.get(item.org) ?? new Map<string, string[]>();
    const list = slugs.get(item.slug) ?? [];
    list.push(item.text);
    slugs.set(item.slug, list);
    byOrg.set(item.org, slugs);
  }

  let companies = 0;
  for (const [organizationId, slugs] of byOrg) {
    const lines = [...slugs.values()].flat();
    if (!lines.length) continue;
    const shown = lines.slice(0, 40);
    if (lines.length > shown.length) shown.push(`And ${lines.length - shown.length} more, open on the dashboard.`);
    const sent = await emailCompanyAdmins(organizationId, {
      kind: "ops_watch",
      subject: "Work still open this morning",
      lines: ["These are still waiting for someone.", ...shown.map((line) => `• ${line}`)],
      button: { label: "Open TaskCrate", url: `${appOrigin()}/dashboard` },
      after: ["Deal with the item and it drops off this list."],
    });
    if (sent) companies++;
    for (const [slug, texts] of slugs) {
      await db.notification.create({
        data: {
          organizationId,
          productSlug: slug,
          title: "Work still open this morning",
          body: texts.slice(0, 4).join(" · ").slice(0, 500),
        },
      }).catch(() => undefined);
    }
  }
  return companies ? `${companies} companies, ${items.length} items` : undefined;
}

/** Emails the company when an occurrence book has gone quiet past its wake time. Once per wake window. */
export async function sendObWakes(now = new Date()) {
  const sites = await db.obSite.findMany({
    include: { entries: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  let sent = 0;
  for (const site of sites) {
    const last = site.entries[0]?.createdAt ?? null;
    if (!wakeDue(last, site.wakeMinutes, now.getTime())) continue;
    const kind = `ob_wake_${site.id}`;
    const recent = await db.emailLog.findFirst({
      where: { organizationId: site.organizationId, kind, status: "sent", createdAt: { gt: new Date(now.getTime() - site.wakeMinutes * 60_000) } },
    });
    if (recent) continue;
    const gap = last ? `${Math.floor((now.getTime() - last.getTime()) / 60_000)} minutes` : "no entry yet";
    const count = await emailCompanyAdmins(site.organizationId, {
      kind,
      subject: `OB quiet: ${site.name}`,
      lines: [`${site.name} has gone ${gap} without an occurrence-book entry.`, "The guard should log one now. If the site is closed, raise the wake time."],
      button: { label: "Open TaskCrate", url: `${appOrigin()}/dashboard` },
    });
    if (count) sent++;
  }
  return sent ? `${sent} sites` : undefined;
}
