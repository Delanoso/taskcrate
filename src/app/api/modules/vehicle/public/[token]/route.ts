import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { closeTrip, handOverTrip, PretripError, publicPapers, startPretrip, toTripView } from "@/lib/modules/pretrip";
import { PANEL_SIDES, PRETRIP_CHECKS, tripIsOpen } from "@/lib/modules/pretrip-shared";

const signatureSchema = z.string().startsWith("data:image/").max(500_000);
const photoSchema = z.object({
  side: z.enum(["front", "rear", "left", "right", "damage"]),
  dataUrl: z.string().startsWith("data:image/").max(1_500_000),
});
const checkSchema = z.object({ key: z.string(), pass: z.boolean() });

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const vehicle = await db.vehicle.findUnique({
    where: { publicToken: token },
    include: {
      organization: { include: { branding: true } },
      trips: { orderBy: { createdAt: "desc" }, take: 8 },
    },
  });
  if (!vehicle) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const open = vehicle.trips.find((trip) => tripIsOpen(trip));
  const lastClosed = vehicle.trips.find((trip) => trip.endKm != null);
  return NextResponse.json({
    vehicle: {
      name: vehicle.name,
      regNumber: vehicle.regNumber,
      make: vehicle.make,
      companyName: vehicle.organization.branding?.displayName ?? vehicle.organization.name,
      papers: publicPapers(vehicle),
    },
    checks: PRETRIP_CHECKS,
    panels: PANEL_SIDES,
    lastEndKm: lastClosed?.endKm ?? null,
    openTrip: open ? toTripView(open, false) : null,
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const vehicle = await db.vehicle.findUnique({ where: { publicToken: token } });
    if (!vehicle) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const body = z.discriminatedUnion("action", [
      z.object({
        action: z.literal("pretrip"),
        driverName: z.string().trim().min(2).max(120),
        licenceNo: z.string().trim().max(40).optional(),
        site: z.string().trim().max(120).optional(),
        startKm: z.number().int().nonnegative().max(9_999_999),
        checks: z.array(checkSchema).min(PRETRIP_CHECKS.length),
        faultNote: z.string().trim().max(2000).optional(),
        photos: z.array(photoSchema).max(6),
        driverSignature: signatureSchema,
      }),
      z.object({
        action: z.literal("handover"),
        fromName: z.string().trim().min(2).max(120),
        fromSignature: signatureSchema,
        toName: z.string().trim().min(2).max(120),
        toSignature: signatureSchema,
        handoverKm: z.number().int().nonnegative().max(9_999_999),
        note: z.string().trim().max(2000).optional(),
        photos: z.array(photoSchema).max(2).optional(),
      }),
      z.object({
        action: z.literal("close"),
        endDriverName: z.string().trim().min(2).max(120),
        endSignature: signatureSchema,
        endKm: z.number().int().nonnegative().max(9_999_999),
        endNote: z.string().trim().max(2000).optional(),
      }),
    ]).parse(await req.json());

    const trip = body.action === "pretrip"
      ? await startPretrip({ vehicle, ...body })
      : body.action === "handover"
        ? await handOverTrip({ vehicle, ...body })
        : await closeTrip({ vehicle, ...body });
    return NextResponse.json({ trip: toTripView(trip, true) });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Check the pre-trip fields and try again." }, { status: 400 });
    if (error instanceof PretripError) return NextResponse.json({ error: error.message }, { status: 400 });
    throw error;
  }
}
