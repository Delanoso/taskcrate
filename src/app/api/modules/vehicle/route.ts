import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireProductApi } from "@/lib/modules/api-guard";
import { closeTrip, handOverTrip, PretripError, startPretrip, toTripView } from "@/lib/modules/pretrip";
import { PRETRIP_CHECKS } from "@/lib/modules/pretrip-shared";

const signatureSchema = z.string().startsWith("data:image/").max(500_000);
const photoSchema = z.object({
  side: z.enum(["front", "rear", "left", "right", "damage"]),
  dataUrl: z.string().startsWith("data:image/").max(1_500_000),
});
const checkSchema = z.object({ key: z.string(), pass: z.boolean() });

const pretripSchema = z.object({
  action: z.literal("pretrip"),
  vehicleId: z.string(),
  driverName: z.string().trim().min(2).max(120),
  licenceNo: z.string().trim().max(40).optional(),
  site: z.string().trim().max(120).optional(),
  startKm: z.number().int().nonnegative().max(9_999_999),
  checks: z.array(checkSchema).min(PRETRIP_CHECKS.length),
  faultNote: z.string().trim().max(2000).optional(),
  photos: z.array(photoSchema).max(6),
  driverSignature: signatureSchema,
});

const handoverSchema = z.object({
  action: z.literal("handover"),
  vehicleId: z.string(),
  fromName: z.string().trim().min(2).max(120),
  fromSignature: signatureSchema,
  toName: z.string().trim().min(2).max(120),
  toSignature: signatureSchema,
  handoverKm: z.number().int().nonnegative().max(9_999_999),
  note: z.string().trim().max(2000).optional(),
  photos: z.array(photoSchema).max(2).optional(),
});

const closeSchema = z.object({
  action: z.literal("close"),
  vehicleId: z.string(),
  endDriverName: z.string().trim().min(2).max(120),
  endSignature: signatureSchema,
  endKm: z.number().int().nonnegative().max(9_999_999),
  endNote: z.string().trim().max(2000).optional(),
});

function badRequest(error: unknown) {
  if (error instanceof z.ZodError) return NextResponse.json({ error: "Check the pre-trip fields and try again." }, { status: 400 });
  if (error instanceof PretripError) return NextResponse.json({ error: error.message }, { status: 400 });
  throw error;
}

export async function GET(req: Request) {
  const gate = await requireProductApi("pretrip-handover");
  if ("error" in gate) return gate.error;
  const id = new URL(req.url).searchParams.get("id");
  if (id) {
    const vehicle = await db.vehicle.findFirst({
      where: { id, organizationId: gate.session.organizationId },
      include: { trips: { orderBy: { createdAt: "desc" }, take: 40 } },
    });
    if (!vehicle) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({
      vehicle: {
        id: vehicle.id,
        name: vehicle.name,
        regNumber: vehicle.regNumber,
        make: vehicle.make,
        publicToken: vehicle.publicToken,
        trips: vehicle.trips.map((trip) => toTripView(trip, true)),
      },
    });
  }

  const items = await db.vehicle.findMany({
    where: { organizationId: gate.session.organizationId },
    include: { trips: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({
    items: items.map((vehicle) => ({
      id: vehicle.id,
      name: vehicle.name,
      regNumber: vehicle.regNumber,
      make: vehicle.make,
      publicToken: vehicle.publicToken,
      latest: vehicle.trips[0] ? toTripView(vehicle.trips[0], false) : null,
    })),
  });
}

export async function POST(req: Request) {
  try {
    const gate = await requireProductApi("pretrip-handover");
    if ("error" in gate) return gate.error;
    const body = z.discriminatedUnion("action", [
      z.object({
        action: z.literal("create"),
        name: z.string().trim().min(2).max(120),
        regNumber: z.string().trim().min(2).max(20),
        make: z.string().trim().max(80).optional(),
      }),
      pretripSchema,
      handoverSchema,
      closeSchema,
    ]).parse(await req.json());

    if (body.action === "create") {
      const item = await db.vehicle.create({
        data: {
          organizationId: gate.session.organizationId,
          name: body.name.trim(),
          regNumber: body.regNumber.trim().toUpperCase(),
          make: body.make?.trim() || null,
        },
      });
      return NextResponse.json({ item });
    }

    const vehicle = await db.vehicle.findFirst({
      where: { id: body.vehicleId, organizationId: gate.session.organizationId },
    });
    if (!vehicle) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const trip = body.action === "pretrip"
      ? await startPretrip({ vehicle, ...body })
      : body.action === "handover"
        ? await handOverTrip({ vehicle, ...body })
        : await closeTrip({ vehicle, ...body });
    return NextResponse.json({ trip: toTripView(trip, true) });
  } catch (error) {
    return badRequest(error);
  }
}
