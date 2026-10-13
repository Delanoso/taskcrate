import type { SerializedReport } from "@/lib/modules/nearmiss-server";

export type Report = SerializedReport;

export type NearMissData = {
  company: string;
  publicUrl: string;
  locations: string[];
  canManage: boolean;
  reports: Report[];
};

export const fmtDate = (iso: string | null | undefined) =>
  iso ? new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" }) : "-";
