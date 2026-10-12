import { simpleBrandedPdf } from "@/lib/modules/pdf-simple";

export async function buildPermitClosedPdf(permit: {
  organizationId: string;
  title: string;
  contractorName?: string | null;
  contractorPhone?: string | null;
  workDetails?: string | null;
  completionNotes?: string | null;
  managerNotes?: string | null;
  areaPhotoUrl?: string | null;
  equipmentPhotoUrl?: string | null;
  completionPhotoUrl?: string | null;
  documentNumber?: string | null;
}) {
  return simpleBrandedPdf({
    organizationId: permit.organizationId,
    title: `Permit Closed — ${permit.title}`,
    prefix: "PTW",
    documentNumber: permit.documentNumber ?? undefined,
    lines: [
      `Contractor: ${permit.contractorName ?? "-"}`,
      `Phone: ${permit.contractorPhone ?? "-"}`,
      `Details: ${permit.workDetails ?? "-"}`,
      `Completion notes: ${permit.completionNotes ?? "-"}`,
      `Manager notes: ${permit.managerNotes ?? "-"}`,
      `Area photo: ${permit.areaPhotoUrl ?? "-"}`,
      `PPE photo: ${permit.equipmentPhotoUrl ?? "-"}`,
      `Completion photo: ${permit.completionPhotoUrl ?? "-"}`,
    ],
  });
}
