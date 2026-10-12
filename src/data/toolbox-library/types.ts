import type { SceneKey } from "@/components/toolbox/talk-scene";

export const TALK_CATEGORIES = {
  general: { label: "General Safety", accent: "#2563eb" },
  workshop: { label: "Workshop", accent: "#ea580c" },
  warehouse: { label: "Warehousing & Forklifts", accent: "#ca8a04" },
  driving: { label: "Truck Driving & Fleet", accent: "#0891b2" },
  construction: { label: "Construction & Heights", accent: "#d97706" },
  electrical: { label: "Electrical", accent: "#7c3aed" },
  fire: { label: "Fire & Emergency", accent: "#dc2626" },
  health: { label: "Health & Wellbeing", accent: "#16a34a" },
  chemicals: { label: "Chemicals & Substances", accent: "#9333ea" },
  ergonomics: { label: "Manual Handling & Ergonomics", accent: "#0d9488" },
} as const;

export type TalkCategory = keyof typeof TALK_CATEGORIES;

export type LibraryTalk = {
  slug: string;
  category: TalkCategory;
  title: string;
  scene: SceneKey;
  summary: string;
  points: [string, string, string, string, string];
  remember: string;
  ask: string;
};
