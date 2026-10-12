import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { saveDataUrlUpload } from "@/lib/uploads";

const CHECKS = ["Oil level", "Tire tread", "Window cracks", "Lights working", "Body damage noted"];

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const vehicle = await db.vehicle.findUnique({
    where: { publicToken: token },
    include: {
      organization: { include: { branding: true } },
      trips: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!vehicle) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    vehicle: {
      name: vehicle.name,
      regNumber: vehicle.regNumber,
      checklist: CHECKS,
      lastTrip: vehicle.trips[0] ?? null,
      companyName: vehicle.organization.branding?.displayName ?? vehicle.organization.name,
    },
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const vehicle = await db.vehicle.findUnique({
    where: { publicToken: token },
    include: { trips: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!vehicle) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = z.object({
    driverName: z.string().min(2),
    startKm: z.number().int().nonnegative(),
    checklist: z.array(z.boolean()).min(5),
    handoverFrom: z.string().optional(),
    handoverTo: z.string().optional(),
    panelPhotos: z.array(z.string().startsWith("data:image/")).max(4).optional(),
  }).parse(await req.json());

  const last = vehicle.trips[0];
  let varianceFlag = false;
  if (last?.endKm != null && body.startKm < last.endKm) varianceFlag = true;
  if (last?.endKm != null && Math.abs(body.startKm - last.endKm) > 5) varianceFlag = true;

  const photos: string[] = [];
  if (body.panelPhotos?.length) {
    for (const p of body.panelPhotos) {
      photos.push(await saveDataUrlUpload(p, `vehicle/${vehicle.organizationId}`));
    }
  }

  const trip = await db.vehicleTripLog.create({
    data: {
      vehicleId: vehicle.id,
      driverName: body.driverName,
      startKm: body.startKm,
      endKm: body.startKm,
      checklistJson: JSON.stringify(body.checklist),
      photoUrlsJson: JSON.stringify(photos),
      handoverFrom: body.handoverFrom,
      handoverTo: body.handoverTo,
      varianceFlag,
    },
  });

  if (varianceFlag || body.checklist.some((c) => !c)) {
    await db.notification.create({
      data: {
        organizationId: vehicle.organizationId,
        productSlug: "pretrip-handover",
        title: "Fleet variance / fault flag",
        body: `${vehicle.regNumber}: driver ${body.driverName}, km ${body.startKm}`,
      },
    });
    await db.jobCard.create({
      data: {
        organizationId: vehicle.organizationId,
        mode: "internal",
        title: `Vehicle check — ${vehicle.regNumber}`,
        machineRef: vehicle.regNumber,
        description: `Auto ticket from Pre-Trip log ${trip.id}. Variance=${varianceFlag}`,
        status: "open",
      },
    });
  }

  return NextResponse.json({ ok: true, tripId: trip.id, varianceFlag });
}
