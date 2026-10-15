export const OB_CATEGORIES = [
  { key: "patrol-started", label: "Patrol started" },
  { key: "patrol-completed", label: "Patrol completed" },
  { key: "gate-incident", label: "Gate incident" },
  { key: "shift-handover", label: "Shift handover", handover: true },
  { key: "visitor", label: "Visitor logged" },
  { key: "alarm", label: "Alarm event" },
  { key: "suspicious", label: "Suspicious activity" },
  { key: "damage", label: "Property damage" },
  { key: "medical", label: "Medical" },
  { key: "other", label: "Other" },
] as const;

export type ObEntryView = {
  id: string;
  entryNumber: string;
  category: string;
  notes: string | null;
  people: string | null;
  actionTaken: string | null;
  guardName: string;
  guardSignature: string | null;
  photoUrl: string | null;
  extraPhotoUrl: string | null;
  handoverToName: string | null;
  handoverToSignature: string | null;
  lat: number | null;
  lng: number | null;
  createdAt: string;
  legacy: boolean;
};

export type ObSiteSummary = {
  id: string;
  name: string;
  location: string | null;
  publicToken: string;
  wakeMinutes: number;
  guardPhone: string | null;
  controlPhone: string | null;
  lastCategory: string | null;
  lastAt: string | null;
  wakeDue: boolean;
};

export type ObSiteDetail = ObSiteSummary & { entries: ObEntryView[] };

export function categoryByLabel(label: string) {
  return OB_CATEGORIES.find((item) => item.label === label) ?? null;
}

export function isHandover(category: string) {
  const found = categoryByLabel(category);
  return Boolean(found && "handover" in found && found.handover);
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

export function formatGps(lat: number | null, lng: number | null) {
  if (lat == null || lng == null) return null;
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

export function mapsUrl(lat: number | null, lng: number | null) {
  if (lat == null || lng == null) return null;
  return `https://maps.google.com/?q=${lat},${lng}`;
}
