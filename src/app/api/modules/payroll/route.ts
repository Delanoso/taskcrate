import { NextResponse } from "next/server";
import { requireProductApi } from "@/lib/modules/api-guard";
import {
  PayrollError,
  calculatePayroll,
  finalisePayroll,
  importPayrollEmployees,
  payrollSnapshot,
  reopenPayroll,
  savePayrollEmployee,
  savePayrollProfile,
  setPayrollActive,
} from "@/lib/modules/payroll";

const SLUG = "payroll";

export async function GET() {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  return NextResponse.json(await payrollSnapshot(gate.session.organizationId));
}

export async function POST(req: Request) {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  const body = await req.json().catch(() => null);
  const action = body?.action;
  try {
    const org = gate.session.organizationId;
    if (action === "profile") return NextResponse.json({ profile: await savePayrollProfile(org, body) });
    if (action === "employee") return NextResponse.json({ employee: await savePayrollEmployee(org, body) });
    if (action === "active") {
      return NextResponse.json({ employee: await setPayrollActive(org, String(body?.id ?? ""), Boolean(body?.active)) });
    }
    if (action === "import") {
      return NextResponse.json(await importPayrollEmployees(org, Array.isArray(body?.rows) ? body.rows : []));
    }
    if (action === "calculate") {
      const extras = body?.extras && typeof body.extras === "object" ? (body.extras as Record<string, number>) : {};
      return NextResponse.json({ run: await calculatePayroll(org, String(body?.period ?? ""), extras) });
    }
    if (action === "finalise") return NextResponse.json({ run: await finalisePayroll(org, String(body?.period ?? "")) });
    if (action === "reopen") return NextResponse.json({ run: await reopenPayroll(org, String(body?.period ?? "")) });
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    if (error instanceof PayrollError) return NextResponse.json({ error: error.message }, { status: 400 });
    throw error;
  }
}
