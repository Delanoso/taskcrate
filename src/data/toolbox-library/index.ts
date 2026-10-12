import { CHEMICALS } from "./chemicals";
import { CONSTRUCTION } from "./construction";
import { DRIVING } from "./driving";
import { ELECTRICAL } from "./electrical";
import { ERGONOMICS } from "./ergonomics";
import { FIRE } from "./fire";
import { GENERAL } from "./general";
import { HEALTH } from "./health";
import type { LibraryTalk } from "./types";
import { WAREHOUSE } from "./warehouse";
import { WORKSHOP } from "./workshop";

export { TALK_CATEGORIES, type LibraryTalk, type TalkCategory } from "./types";

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
];

/** Stored as ToolboxTalk.content so the register keeps a copy of what staff read. */
export function talkToPlainText(talk: LibraryTalk) {
  return [
    talk.summary,
    "",
    ...talk.points.map((p, i) => `${i + 1}. ${p}`),
    "",
    `Remember: ${talk.remember}`,
    `Talk about it: ${talk.ask}`,
  ].join("\n");
}

export function findLibraryTalk(slug: string | null | undefined) {
  return slug ? TALK_LIBRARY.find((t) => t.slug === slug) : undefined;
}
