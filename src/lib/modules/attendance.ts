import { z } from "zod";
import { db } from "@/lib/db";
import { photoSchema } from "@/lib/modules/common";
import { dutyBlockReasons } from "@/lib/modules/duty-gate";
import { saveDataUrlUpload } from "@/lib/uploads";

export class AttendanceError extends Error {}

const punchSchema = z.object({
  direction: z.enum(["IN", "OUT"]),
  fullName: z.string().trim().min(2, "Add the name").max(160),
  employeeNumber: z.string().trim().max(40).optional().or(z.literal("")),
  note: z.string().trim().max(300).optional().or(z.literal("")),
  overrideReason: z.string().trim().max(300).optional().or(z.literal("")),
  photoDataUrl: photoSchema,
  signatureDataUrl: photoSchema,
});

export function personKey(fullName: string, employeeNumber?: string | null) {
  return (employeeNumber?.trim() || fullName.trim()).toLowerCase();
}

export function formatWhen(date: Date) {
  return date.toLocaleString("en-ZA", {
    timeZone: "Africa/Johannesburg",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export async function attendanceSnapshot(organizationId: string) {
  const sites = await db.attendanceSite.findMany({
    where: { organizationId },
    include: { punches: { orderBy: { createdAt: "desc" }, take: 400 } },
    orderBy: { name: "asc" },
  });
  return {
    sites: sites.map((site) => {
      const chronological = [...site.punches].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      const latest = new Map<string, (typeof chronological)[number]>();
      for (const punch of chronological) latest.set(personKey(punch.fullName, punch.employeeNumber), punch);
      const onSite = [...latest.values()].filter((punch) => punch.direction === "IN");
      return {
        id: site.id,
        name: site.name,
        location: site.location,
        publicToken: site.publicToken,
        onSite: onSite.map((punch) => ({
          fullName: punch.fullName,
          employeeNumber: punch.employeeNumber,
          since: punch.createdAt.toISOString(),
        })),
        punches: site.punches.map((punch) => ({
          id: punch.id,
          direction: punch.direction,
          fullName: punch.fullName,
          employeeNumber: punch.employeeNumber,
          note: punch.note,
          photoUrl: punch.photoUrl,
          createdAt: punch.createdAt.toISOString(),
          when: formatWhen(punch.createdAt),
        })),
      };
    }),
  };
}

export async function createAttendanceSite(organizationId: string, raw: unknown) {
  const parsed = z
    .object({
      name: z.string().trim().min(2, "Add the site name").max(120),
      location: z.string().trim().max(200).optional().or(z.literal("")),
    })
    .safeParse(raw);
  if (!parsed.success) throw new AttendanceError(parsed.error.issues[0]?.message ?? "Check the site");
  return db.attendanceSite.create({
    data: {
      organizationId,
      name: parsed.data.name,
      location: parsed.data.location?.trim() || null,
    },
  });
}

export async function clockAttendance(site: { id: string; organizationId: string }, raw: unknown) {
  const parsed = punchSchema.safeParse(raw);
  if (!parsed.success) throw new AttendanceError(parsed.error.issues[0]?.message ?? "Check the clock entry");
  const data = parsed.data;
  const number = data.employeeNumber?.trim() || null;
  const key = personKey(data.fullName, number);
  const recent = await db.attendancePunch.findMany({
    where: { siteId: site.id },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const last = recent.find((punch) => personKey(punch.fullName, punch.employeeNumber) === key);
  if (data.direction === "IN" && last?.direction === "IN") {
    throw new AttendanceError(`${data.fullName} is already clocked in. Clock out first.`);
  }
  if (data.direction === "OUT" && last?.direction !== "IN") {
    throw new AttendanceError(`${data.fullName} is not clocked in at this site.`);
  }
  let gateOverride: string | null = null;
  if (data.direction === "IN") {
    const reasons = await dutyBlockReasons(site.organizationId, [{ name: data.fullName, employeeNumber: number }]);
    const reason = data.overrideReason?.trim() ?? "";
    if (reasons.length && reason.length < 12) {
      throw new AttendanceError(`Stopped: ${reasons.join(" ")} A manager can allow it by writing the reason below (at least a short sentence) and clocking in again.`);
    }
    if (reasons.length) gateOverride = reason;
  }
  const folder = `attendance/${site.organizationId}`;
  const [photoUrl, signatureUrl] = await Promise.all([
    saveDataUrlUpload(data.photoDataUrl, folder),
    saveDataUrlUpload(data.signatureDataUrl, folder),
  ]);
  return db.attendancePunch.create({
    data: {
      siteId: site.id,
      direction: data.direction,
      fullName: data.fullName,
      employeeNumber: number,
      note: data.note?.trim() || null,
      gateOverride,
      photoUrl,
      signatureUrl,
    },
  });
}
