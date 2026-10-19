export const PRETRIP_CHECKS = [
  { key: "lights", label: "Lights and indicators" },
  { key: "tyres", label: "Tyres, tread, and wheel nuts" },
  { key: "brakes", label: "Brakes" },
  { key: "fluids", label: "Oil, water, and fuel" },
  { key: "mirrors", label: "Mirrors and windows" },
  { key: "wipers", label: "Wipers and hooter" },
  { key: "body", label: "Body damage" },
  { key: "plates", label: "Licence disc and number plates" },
  { key: "safety", label: "Triangle and fire extinguisher" },
  { key: "belts", label: "Seat belts" },
] as const;

export type PaperState = "missing" | "expired" | "due" | "valid";

function johannesburgToday() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Johannesburg" });
}

export function paperState(expiresOn: string | null | undefined, today = johannesburgToday()): PaperState {
  if (!expiresOn) return "missing";
  if (expiresOn < today) return "expired";
  const [year, month, day] = today.split("-").map(Number);
  const dueBy = new Date(Date.UTC(year, month - 1, day + 30)).toISOString().slice(0, 10);
  if (expiresOn <= dueBy) return "due";
  return "valid";
}

export function paperStateLabel(state: PaperState) {
  if (state === "missing") return "Not on file";
  if (state === "expired") return "Expired";
  if (state === "due") return "Due in 30 days";
  return "In date";
}

export function papersHeadline(expires: Array<string | null | undefined>) {
  const states = expires.map((date) => paperState(date));
  if (states.includes("expired")) return "A paper has expired";
  if (states.includes("due")) return "A paper is due in the next 30 days";
  if (states.includes("missing")) return "Papers still to add";
  return "Papers in date";
}

export const PANEL_SIDES = [
  { key: "front", label: "Front" },
  { key: "rear", label: "Rear" },
  { key: "left", label: "Left side" },
  { key: "right", label: "Right side" },
] as const;

const LEGACY_CHECKS = ["Oil level", "Tire tread", "Window cracks", "Lights working", "Body damage noted"];

export type CheckAnswer = { key: string; label: string; pass: boolean };
export type TripPhoto = { url: string; side: string };

export type TripView = {
  id: string;
  driverName: string;
  licenceNo: string | null;
  site: string | null;
  startKm: number;
  endKm: number | null;
  endDriverName: string | null;
  checks: CheckAnswer[];
  faultNote: string | null;
  photos: TripPhoto[];
  driverSignature: string | null;
  endSignature: string | null;
  endNote: string | null;
  handoverFrom: string | null;
  handoverTo: string | null;
  handoverFromSignature: string | null;
  handoverToSignature: string | null;
  handoverKm: number | null;
  handoverNote: string | null;
  handoverAt: string | null;
  startedAt: string;
  endedAt: string | null;
  open: boolean;
  varianceFlag: boolean;
};

export function formatKm(km: number) {
  return `${km.toLocaleString("en-ZA")} km`;
}

export function formatWhen(iso: string | null) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("en-ZA", {
    timeZone: "Africa/Johannesburg",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function parseChecks(raw: string | null | undefined): CheckAnswer[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    if (parsed.every((item) => typeof item === "boolean")) {
      return parsed.map((pass, index) => ({
        key: `legacy-${index}`,
        label: LEGACY_CHECKS[index] ?? `Check ${index + 1}`,
        pass: Boolean(pass),
      }));
    }
    return parsed.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const key = "key" in item && typeof item.key === "string" ? item.key : "";
      const pass = "pass" in item && typeof item.pass === "boolean" ? item.pass : null;
      if (!key || pass == null) return [];
      const known = PRETRIP_CHECKS.find((check) => check.key === key);
      const label = "label" in item && typeof item.label === "string" ? item.label : known?.label ?? key;
      return [{ key, label, pass }];
    });
  } catch {
    return [];
  }
}

export function parsePhotos(raw: string | null | undefined): TripPhoto[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      if (typeof item === "string" && item.startsWith("/uploads/")) return [{ url: item, side: "panel" }];
      if (!item || typeof item !== "object") return [];
      const url = "url" in item && typeof item.url === "string" ? item.url : "";
      const side = "side" in item && typeof item.side === "string" ? item.side : "panel";
      if (!url.startsWith("/uploads/")) return [];
      return [{ url, side }];
    });
  } catch {
    return [];
  }
}

export function tripIsOpen(trip: { endKm: number | null; endedAt: Date | string | null }) {
  return trip.endKm == null && trip.endedAt == null;
}
