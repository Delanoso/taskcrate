import { CHEMICALS } from "./chemicals";
import { CONSTRUCTION } from "./construction";
import { DRIVING } from "./driving";
import { ELECTRICAL } from "./electrical";
import { ERGONOMICS } from "./ergonomics";
import { CHEMICALS_EXTRAS } from "./extras/chemicals";
import { CONSTRUCTION_EXTRAS } from "./extras/construction";
import { DRIVING_EXTRAS } from "./extras/driving";
import { ELECTRICAL_EXTRAS } from "./extras/electrical";
import { ERGONOMICS_EXTRAS } from "./extras/ergonomics";
import { FIRE_EXTRAS } from "./extras/fire";
import { GENERAL_EXTRAS } from "./extras/general";
import { HEALTH_EXTRAS } from "./extras/health";
import { WAREHOUSE_EXTRAS } from "./extras/warehouse";
import { WORKSHOP_EXTRAS } from "./extras/workshop";
import { FIRE } from "./fire";
import { GENERAL } from "./general";
import { HEALTH } from "./health";
import type { LibraryTalk, TalkExtras } from "./types";
import { WAREHOUSE } from "./warehouse";
import { WORKSHOP } from "./workshop";

export { TALK_CATEGORIES, type LibraryTalk, type TalkCategory } from "./types";

const EXTRAS: Record<string, TalkExtras> = {
  ...GENERAL_EXTRAS,
  ...WORKSHOP_EXTRAS,
  ...WAREHOUSE_EXTRAS,
  ...DRIVING_EXTRAS,
  ...CONSTRUCTION_EXTRAS,
  ...ELECTRICAL_EXTRAS,
  ...FIRE_EXTRAS,
  ...HEALTH_EXTRAS,
  ...CHEMICALS_EXTRAS,
  ...ERGONOMICS_EXTRAS,
};

export const TALK_LIBRARY: LibraryTalk[] = [
  ...GENERAL,
  ...WORKSHOP,
  ...WAREHOUSE,
  ...DRIVING,
  ...CONSTRUCTION,
  ...ELECTRICAL,
  ...FIRE,
  ...HEALTH,
  ...CHEMICALS,
  ...ERGONOMICS,
].map((t) => {
  const extras = EXTRAS[t.slug];
  if (!extras) throw new Error(`Toolbox talk "${t.slug}" is missing its why/dos/donts`);
  return { ...t, ...extras };
});

/** Stored as ToolboxTalk.content so the register keeps a copy of what staff read. */
export function talkToPlainText(talk: LibraryTalk) {
  return [
    talk.summary,
    "",
    `Why it matters: ${talk.why}`,
    "",
    ...talk.points.map((p, i) => `${i + 1}. ${p}`),
    "",
    "Do:",
    ...talk.dos.map((d) => `- ${d}`),
    "Don't:",
    ...talk.donts.map((d) => `- ${d}`),
    "",
    `Remember: ${talk.remember}`,
    `Talk about it: ${talk.ask}`,
  ].join("\n");
}

export function findLibraryTalk(slug: string | null | undefined) {
  return slug ? TALK_LIBRARY.find((t) => t.slug === slug) : undefined;
}
