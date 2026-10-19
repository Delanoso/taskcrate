import { readdir, stat } from "fs/promises";
import path from "path";
import { getProduct } from "@/data/products";
import { expireUnpaidSubscriptions, formatRentDate, rentIsOpen } from "@/lib/billing";
import { db } from "@/lib/db";
import { appOrigin, emailCompanyAdmins } from "@/lib/email";
import { jsonList } from "@/lib/modules/common";
import { sendAlertEmail } from "@/lib/mail";
import { sendExpiryDigests } from "@/lib/expiry-digest";
import { sendDueTrialReminders } from "@/lib/trial-reminder";
import { johannesburgParts } from "@/lib/trial-window";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const g = globalThis as unknown as { taskcrateJobs?: boolean };
const saDate = (d = new Date()) => d.toLocaleDateString("en-CA", { timeZone: "Africa/Johannesburg" });

type Job = { name: string; every: "hourly" | "daily"; run: () => Promise<string | void> };

/** Claims the job for this slot. Hourly: once an hour. Daily: once per SA calendar day, from 08:00. */
async function claim(job: Job, now: Date) {
  const row = await db.jobRun.findUnique({ where: { name: job.name } });
  if (job.every === "daily") {
    if (johannesburgParts(now).hour < 8) return false;
    if (row && saDate(row.lastRunAt) === saDate(now)) return false;
  } else if (row && now.getTime() - row.lastRunAt.getTime() < HOUR - 60_000) {
    return false;
  }
  if (!row) {
    await db.jobRun.create({ data: { name: job.name, lastRunAt: now } }).catch(() => undefined);
    return true;
  }
  const claimed = await db.jobRun.updateMany({ where: { name: job.name, lastRunAt: row.lastRunAt }, data: { lastRunAt: now } });
  return claimed.count === 1;
}

const JOBS: Job[] = [
  {
    name: "Trial reminders",
    every: "hourly",
    run: async () => {
      const r = await sendDueTrialReminders();
      return r.sent || r.failed ? `${r.sent} sent, ${r.failed} failed` : undefined;
    },
  },
  {
    name: "Close unpaid apps",
    every: "hourly",
    run: async () => {
      await expireUnpaidSubscriptions();
    },
  },
  {
    name: "Trial ended",
    every: "hourly",
    run: async () => {
      const orgs = await db.organization.findMany({
        where: { trialEndsAt: { lte: new Date() }, trialEndedEmailSent: false },
        include: { subscriptions: true },
      });
      for (const org of orgs) {
        const claimed = await db.organization.updateMany({ where: { id: org.id, trialEndedEmailSent: false }, data: { trialEndedEmailSent: true, trialNoticeSent: true } });
        if (!claimed.count) continue;
        const paid = org.subscriptions.filter(rentIsOpen).map((s) => getProduct(s.productSlug)?.name ?? s.productSlug);
        await emailCompanyAdmins(org.id, {
          kind: "trial_ended",
          subject: paid.length ? "Your TaskCrate trial has ended. Your paid apps stay open" : "Your TaskCrate free trial has ended",
          lines: paid.length
            ? [`The free trial for ${org.name} ended on ${formatRentDate(org.trialEndsAt!)}.`, `These apps are paid and stay open: ${paid.join(", ")}.`, "The other apps are closed. Your records in them are kept if you want to add them later."]
            : [`The free trial for ${org.name} ended on ${formatRentDate(org.trialEndsAt!)}, so the apps are closed for now.`, "Nothing has been deleted. Choose the apps you want and pay on the Billing page; they open again straight away with all your records."],
          button: { label: paid.length ? "Add more apps" : "Choose and pay for your apps", url: `${appOrigin()}/login?next=/dashboard/billing` },
        });
        await sendAlertEmail({ subject: `[TaskCrate] Trial ended: ${org.name}`, text: paid.length ? `Paid apps: ${paid.join(", ")}` : `${org.name} finished the trial and has not paid.` }).catch(() => undefined);
      }
      return orgs.length ? `${orgs.length} companies` : undefined;
    },
  },
  {
    name: "Morning dates",
    every: "daily",
    run: () => sendExpiryDigests(),
  },
  {
    name: "Win-back emails",
    every: "daily",
    run: async () => {
      const now = Date.now();
      const orgs = await db.organization.findMany({
        where: { trialEndedEmailSent: true, winbackStage: { lt: 2 }, trialEndsAt: { lte: new Date(now - 3 * DAY) } },
        include: { subscriptions: true },
      });
      let sent = 0;
      for (const org of orgs) {
        if (org.subscriptions.some(rentIsOpen)) {
          await db.organization.update({ where: { id: org.id }, data: { winbackStage: 2 } });
          continue;
        }
        const ended = org.trialEndsAt!.getTime();
        const stage = org.winbackStage === 0 ? 1 : now - ended >= 10 * DAY ? 2 : null;
        if (!stage) continue;
        await db.organization.update({ where: { id: org.id }, data: { winbackStage: stage } });
        sent += await emailCompanyAdmins(org.id, {
          kind: `winback_${stage}`,
          subject: stage === 1 ? `Your ${org.name} records are still in TaskCrate` : "Can we help you get TaskCrate working for you?",
          lines:
            stage === 1
              ? ["Your trial ended a few days ago. Everything you captured is still saved.", "You do not need every app. Most companies start with one or two, from R1 000 a month each, and the first payment only covers the rest of this month."]
              : ["We noticed you have not picked any apps since your trial. If something did not work the way you needed, open a support ticket and tell us; we read every one.", "If the timing was wrong, your records stay saved and you can pay for an app whenever you are ready."],
          button: { label: stage === 1 ? "Choose your apps" : "Open TaskCrate", url: `${appOrigin()}/login?next=/dashboard/billing` },
        });
      }
      return sent ? `${sent} sent` : undefined;
    },
  },
  {
    name: "Debit order check",
    every: "daily",
    run: async () => {
      const now = new Date();
      const { day } = johannesburgParts(now);
      if (day < 3) return;
      const period = saDate(now).slice(0, 7);
      const monthStart = new Date(`${period}-01T00:00:00+02:00`);
      const debits = await db.debitOrder.findMany({
        where: { status: "active", sandbox: false, createdAt: { lt: monthStart }, OR: [{ missedAlertFor: null }, { missedAlertFor: { not: period } }] },
        include: { organization: { select: { name: true } } },
      });
      let flagged = 0;
      for (const d of debits) {
        if (d.lastPaidAt && d.lastPaidAt >= monthStart) continue;
        await db.debitOrder.update({ where: { id: d.id }, data: { missedAlertFor: period } });
        const apps = jsonList(d.appsJson).map((s) => getProduct(s)?.name ?? s);
        await emailCompanyAdmins(d.organizationId, {
          kind: "debit_missed",
          subject: "We could not collect your TaskCrate payment",
          lines: [
            `Your monthly debit order of R ${d.recurringAmount.toFixed(2)} for ${apps.join(", ")} has not come through this month.`,
            "The apps stay open for a few more days. Please update the card on the Billing page, or contact your bank if the card is still valid.",
          ],
          button: { label: "Update card", url: `${appOrigin()}/dashboard/billing` },
        });
        await sendAlertEmail({ subject: `[TaskCrate] Debit not received: ${d.organization.name}`, text: `R ${d.recurringAmount.toFixed(2)} for ${apps.join(", ")} has not come through for ${period}.` }).catch(() => undefined);
        flagged++;
      }
      return flagged ? `${flagged} behind` : undefined;
    },
  },
  {
    name: "Backup check",
    every: "daily",
    run: async () => {
      if (process.env.NODE_ENV !== "production") return "skipped (not production)";
      const dir = process.env.TASKCRATE_BACKUP_DIR || "/opt/taskcrate-backups/nightly";
      const files = await readdir(dir).catch(() => [] as string[]);
      let newest = 0;
      for (const f of files) newest = Math.max(newest, (await stat(path.join(dir, f)).catch(() => null))?.mtimeMs ?? 0);
      const hours = newest ? Math.round((Date.now() - newest) / HOUR) : null;
      if (hours === null || hours > 36) {
        await sendAlertEmail({ subject: "[TaskCrate] Backup is missing or old", text: hours === null ? `No backups found in ${dir}.` : `The newest backup in ${dir} is ${hours} hours old.` });
        throw new Error(hours === null ? "no backup found" : `newest backup ${hours} h old`);
      }
      return `newest ${hours} h old`;
    },
  },
  {
    name: "Housekeeping",
    every: "daily",
    run: async () => {
      const now = Date.now();
      const [n, e, r, i] = await Promise.all([
        db.notification.deleteMany({ where: { readAt: { lt: new Date(now - 180 * DAY) } } }),
        db.emailLog.deleteMany({ where: { createdAt: { lt: new Date(now - 365 * DAY) } } }),
        db.passwordReset.deleteMany({ where: { expiresAt: { lt: new Date(now) } } }),
        db.paymentIntent.deleteMany({ where: { status: "pending", createdAt: { lt: new Date(now - 30 * DAY) } } }),
      ]);
      const total = n.count + e.count + r.count + i.count;
      return total ? `${total} old rows removed` : undefined;
    },
  },
];

export async function runDueJobs(now = new Date()) {
  for (const job of JOBS) {
    if (!(await claim(job, now).catch(() => false))) continue;
    try {
      const note = await job.run();
      await db.jobRun.update({ where: { name: job.name }, data: { lastOk: true, lastNote: note ? String(note).slice(0, 200) : null } });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const prev = await db.jobRun.findUnique({ where: { name: job.name } });
      await db.jobRun.update({ where: { name: job.name }, data: { lastOk: false, lastNote: message.slice(0, 200) } });
      if (prev?.lastOk !== false && job.name !== "Backup check") {
        await sendAlertEmail({ subject: `[TaskCrate] Job failed: ${job.name}`, text: message }).catch(() => undefined);
      }
    }
  }
}

export function startScheduler() {
  if (g.taskcrateJobs) return;
  g.taskcrateJobs = true;
  console.log("TaskCrate scheduler is running");
  const tick = () => void runDueJobs().catch((err) => console.error("Scheduler tick failed", err));
  setTimeout(tick, 60_000);
  setInterval(tick, 10 * 60_000);
}
