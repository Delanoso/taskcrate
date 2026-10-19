import { db } from "@/lib/db";
import { appOrigin, emailCompanyAdmins, sendEmail } from "@/lib/email";
import { resolveItem } from "@/lib/modules/safety-file-items";

const DAY = 24 * 60 * 60 * 1000;
const WINDOW = new Set([30, 14, 7, 3, 1, 0]);

const saToday = () => new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Johannesburg" });

function addDays(iso: string, days: number) {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function daysUntil(iso: string | null | undefined, today: string) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return null;
  const target = Date.parse(`${iso.slice(0, 10)}T00:00:00Z`);
  const start = Date.parse(`${today}T00:00:00Z`);
  if (Number.isNaN(target) || Number.isNaN(start)) return null;
  return Math.round((target - start) / DAY);
}

function when(days: number) {
  if (days < 0) return `expired ${-days} ${-days === 1 ? "day" : "days"} ago`;
  if (days === 0) return "expires today";
  return `expires in ${days} ${days === 1 ? "day" : "days"}`;
}

function keep(days: number | null) {
  return days != null && (days < 0 || WINDOW.has(days));
}

type Bucket = { slug: string; lines: string[] };

/** One morning email per company for dates that need a person. Also chases unsigned contracts. */
export async function sendExpiryDigests(now = new Date()) {
  const today = saToday();
  const horizon = addDays(today, 30);
  const [tickets, vehicles, documents, contracts] = await Promise.all([
    db.trainingTicket.findMany({ where: { expiresOn: { lte: horizon } }, select: { organizationId: true, fullName: true, ticketType: true, expiresOn: true } }),
    db.vehicle.findMany({
      select: { organizationId: true, name: true, regNumber: true, licenceDiscExpires: true, insuranceExpires: true, roadworthyExpires: true },
    }),
    db.contractorDocument.findMany({
      where: { expiresAt: { not: null, lte: new Date(`${horizon}T23:59:59+02:00`) } },
      select: { docType: true, expiresAt: true, contractor: { select: { organizationId: true, companyName: true } } },
    }),
    db.contractDocument.findMany({
      where: { status: { in: ["sent", "viewed"] } },
      select: {
        id: true,
        organizationId: true,
        title: true,
        employeeName: true,
        employeeEmail: true,
        employeePhone: true,
        publicToken: true,
        dueDate: true,
        createdAt: true,
        lastRemindedAt: true,
      },
    }),
  ]);

  const byOrg = new Map<string, Bucket[]>();
  const take = (organizationId: string, slug: string) => {
    const list = byOrg.get(organizationId) ?? [];
    let bucket = list.find((item) => item.slug === slug);
    if (!bucket) {
      bucket = { slug, lines: [] };
      list.push(bucket);
      byOrg.set(organizationId, list);
    }
    return bucket;
  };

  for (const ticket of tickets) {
    const days = daysUntil(ticket.expiresOn, today);
    if (!keep(days)) continue;
    take(ticket.organizationId, "training-tickets").lines.push(`${ticket.fullName} — ${ticket.ticketType} ${when(days!)}`);
  }
  for (const vehicle of vehicles) {
    const papers = [
      ["Licence disc", vehicle.licenceDiscExpires],
      ["Insurance", vehicle.insuranceExpires],
      ["Roadworthy", vehicle.roadworthyExpires],
    ] as const;
    for (const [label, iso] of papers) {
      const days = daysUntil(iso, today);
      if (!keep(days)) continue;
      take(vehicle.organizationId, "pretrip-handover").lines.push(`${vehicle.regNumber} (${vehicle.name}) — ${label} ${when(days!)}`);
    }
  }
  for (const document of documents) {
    const iso = document.expiresAt?.toLocaleDateString("en-CA", { timeZone: "Africa/Johannesburg" });
    const days = daysUntil(iso, today);
    if (!keep(days)) continue;
    const label = resolveItem(document.docType).label;
    take(document.contractor.organizationId, "contractor-safety-file").lines.push(`${document.contractor.companyName} — ${label} ${when(days!)}`);
  }

  let chased = 0;
  for (const contract of contracts) {
    const createdDay = contract.createdAt.toLocaleDateString("en-CA", { timeZone: "Africa/Johannesburg" });
    if (createdDay >= today) continue;
    if (contract.lastRemindedAt && now.getTime() - contract.lastRemindedAt.getTime() < 3 * DAY) continue;
    const url = `${appOrigin()}/p/contract/${contract.publicToken}`;
    const who = contract.employeeName?.trim() || "the signer";
    const due = contract.dueDate ? ` Due ${contract.dueDate.toLocaleDateString("en-ZA", { timeZone: "Africa/Johannesburg" })}.` : "";
    if (contract.employeeEmail) {
      const sent = await sendEmail({
        to: contract.employeeEmail,
        organizationId: contract.organizationId,
        kind: "contract_chase",
        subject: `Please sign: ${contract.title}`,
        lines: [`${contract.title} is still waiting for your signature.${due}`, "Open the link, read it, and sign on your phone."],
        button: { label: "Open the contract", url },
      });
      if (!sent.ok) {
        take(contract.organizationId, "contract-sentinel").lines.push(`Could not email ${who} for ${contract.title}. Send it yourself: ${url}`);
        continue;
      }
      chased++;
      take(contract.organizationId, "contract-sentinel").lines.push(`Reminder emailed to ${who} for ${contract.title}.`);
    } else {
      const phone = contract.employeePhone ? ` Phone ${contract.employeePhone}.` : " No phone or email is on the document.";
      take(contract.organizationId, "contract-sentinel").lines.push(`${contract.title} is still unsigned for ${who}.${phone} Link: ${url}`);
    }
    await db.contractDocument.update({
      where: { id: contract.id },
      data: { lastRemindedAt: now, reminderCount: { increment: 1 } },
    });
  }

  let companies = 0;
  for (const [organizationId, buckets] of byOrg) {
    const lines = buckets.flatMap((bucket) => bucket.lines);
    if (!lines.length) continue;
    const shown = lines.slice(0, 40);
    if (lines.length > shown.length) shown.push(`And ${lines.length - shown.length} more, open on the dashboard.`);
    const sent = await emailCompanyAdmins(organizationId, {
      kind: "expiry_digest",
      subject: "Dates that need you today",
      lines: ["These are due, expired, or still unsigned.", ...shown.map((line) => `• ${line}`)],
      button: { label: "Open TaskCrate", url: `${appOrigin()}/dashboard` },
      after: ["Renew the document, or send the contract again, and it drops off this list."],
    });
    if (sent) companies++;
    for (const bucket of buckets) {
      await db.notification.create({
        data: {
          organizationId,
          productSlug: bucket.slug,
          title: "Dates that need you today",
          body: bucket.lines.slice(0, 4).join(" · ").slice(0, 500),
        },
      });
    }
  }
  return companies || chased ? `${companies} companies, ${chased} contract reminders` : undefined;
}
