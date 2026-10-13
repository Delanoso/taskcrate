import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { canAccessProduct } from "@/lib/rbac";
import { companyName, staffName } from "@/lib/modules/common";
import { HANDBACK, ISSUER, hasLedger, requireEquipmentApi, serializeIssue, serializeItem } from "@/lib/modules/equipment-server";
import { peopleDirectory } from "@/lib/modules/people";

export async function GET() {
  const gate = await requireEquipmentApi();
  if ("error" in gate) return gate.error;
  const orgId = gate.session.organizationId;
  const [items, issues, directory, me, ledger, company] = await Promise.all([
    db.equipmentItem.findMany({ where: { organizationId: orgId }, orderBy: [{ name: "asc" }] }),
    db.equipmentIssue.findMany({ where: { organizationId: orgId }, orderBy: { createdAt: "desc" }, take: 3000 }),
    peopleDirectory(orgId),
    staffName(gate.session.userId),
    hasLedger(orgId),
    companyName(orgId),
  ]);
  const now = Date.now();
  return NextResponse.json({
    company,
    me,
    canManage: gate.access.role !== "MEMBER",
    modules: { issuer: canAccessProduct(gate.access, ISSUER), handback: canAccessProduct(gate.access, HANDBACK), ledger },
    items: items.map(serializeItem),
    issues: issues.map((x) => serializeIssue(x, now)),
    directory,
  });
}
