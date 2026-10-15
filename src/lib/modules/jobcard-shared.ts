export type JobMode = "internal" | "field";
export type JobPriority = "low" | "normal" | "urgent";
export type JobPhoto = { url: string; side: "open" | "work" };
export type JobPart = { name: string; qty: number; cost: number };

export type JobCardView = {
  id: string;
  jobNumber: string;
  mode: JobMode;
  title: string;
  status: string;
  priority: JobPriority;
  machineRef: string | null;
  location: string | null;
  description: string | null;
  reportedByName: string | null;
  reportedByPhone: string | null;
  openComment: string | null;
  openSignature: string | null;
  openSignedAt: string | null;
  mechanicName: string | null;
  workComment: string | null;
  technicianSignature: string | null;
  technicianSignedAt: string | null;
  hoursWorked: number | null;
  downtimeHours: number | null;
  parts: JobPart[];
  partsCost: number | null;
  acceptName: string | null;
  acceptComment: string | null;
  acceptSignature: string | null;
  acceptedAt: string | null;
  photos: JobPhoto[];
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  companyName: string;
  publicToken?: string;
};

export type JobCardSummary = {
  id: string;
  jobNumber: string;
  mode: JobMode;
  title: string;
  status: string;
  priority: JobPriority;
  machineRef: string | null;
  reportedByName: string | null;
  mechanicName: string | null;
  createdAt: string;
  publicToken: string;
};

export function sideLabels(mode: JobMode) {
  if (mode === "field") {
    return {
      asset: "Site or address",
      place: "Client company",
      accept: "Client name",
      acceptSign: "Client signature",
      acceptComment: "Client comment",
      kind: "Field service",
    };
  }
  return {
    asset: "Machine or asset",
    place: "Department or area",
    accept: "Received by",
    acceptSign: "Signature of the person receiving it",
    acceptComment: "Comment on receipt",
    kind: "Internal",
  };
}

export function parsePhotos(raw: string | null | undefined): JobPhoto[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const url = "url" in item && typeof item.url === "string" ? item.url : "";
      const side = "side" in item && item.side === "work" ? "work" : "open";
      if (!url.startsWith("/uploads/")) return [];
      return [{ url, side }];
    });
  } catch {
    return [];
  }
}

export function parseParts(raw: string | null | undefined): JobPart[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const name = "name" in item && typeof item.name === "string" ? item.name.trim() : "";
      if (!name) return [];
      const qty = "qty" in item ? Number(item.qty) : 1;
      const cost = "cost" in item ? Number(item.cost) : 0;
      return [{
        name: name.slice(0, 120),
        qty: Number.isFinite(qty) && qty > 0 ? qty : 1,
        cost: Number.isFinite(cost) && cost >= 0 ? cost : 0,
      }];
    });
  } catch {
    return [];
  }
}

export function formatRand(amount: number) {
  return `R${amount.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatWhen(iso: string | null) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" });
}

type GapSource = {
  reportedByName?: string | null;
  description?: string | null;
  openComment?: string | null;
  openSignature?: string | null;
  mechanicName?: string | null;
  workComment?: string | null;
  technicianSignature?: string | null;
  hoursWorked?: number | null;
  acceptName?: string | null;
  acceptSignature?: string | null;
};

export function closeGaps(job: GapSource, mode: JobMode) {
  const labels = sideLabels(mode);
  const gaps: string[] = [];
  if (!job.reportedByName?.trim()) gaps.push("Name of the person who opened it");
  if (!job.description?.trim()) gaps.push("What is wrong");
  if (!job.openComment?.trim()) gaps.push("Comment on the opening side");
  if (!job.openSignature) gaps.push("Signature of the person who opened it");
  if (!job.mechanicName?.trim()) gaps.push("Technician name");
  if (!job.workComment?.trim()) gaps.push("Comment on the work");
  if (!job.technicianSignature) gaps.push("Technician signature");
  if (job.hoursWorked == null || !(job.hoursWorked > 0)) gaps.push("Hours on the job");
  if (!job.acceptName?.trim()) gaps.push(labels.accept);
  if (!job.acceptSignature) gaps.push(labels.acceptSign);
  return gaps;
}

export const JOB_STEPS = [
  { key: "open", label: "Opened" },
  { key: "scheduled", label: "Scheduled" },
  { key: "in_progress", label: "In progress" },
  { key: "awaiting_signoff", label: "Sign-off" },
  { key: "done", label: "Closed" },
] as const;

export function jobStepIndex(status: string) {
  const index = JOB_STEPS.findIndex((step) => step.key === status);
  return index < 0 ? 0 : index;
}
