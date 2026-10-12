import { Check, TriangleAlert, X } from "lucide-react";
import { TalkScene } from "@/components/toolbox/talk-scene";
import { TALK_CATEGORIES, type LibraryTalk } from "@/data/toolbox-library/types";

const css = `
@keyframes tt-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.tt-in{animation:tt-in .5s ease-out both}
@media (prefers-reduced-motion:reduce){.tt-in{animation:none}}
`;

/** One-page animated toolbox talk, shared by the manager preview and the worker link. */
export function TalkPage({ talk }: { talk: LibraryTalk }) {
  const cat = TALK_CATEGORIES[talk.category];
  return (
    <article className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <style>{css}</style>
      <div className="px-4 pt-4" style={{ background: `${cat.accent}14` }}>
        <p className="text-xs font-semibold tracking-wide uppercase" style={{ color: cat.accent }}>
          {cat.label}
        </p>
        <TalkScene scene={talk.scene} accent={cat.accent} className="mx-auto h-36 w-full max-w-xs" />
      </div>
      <div className="space-y-4 p-5">
        <div className="space-y-1.5">
          <h2 className="text-xl font-semibold tracking-tight">{talk.title}</h2>
          <p className="text-sm text-muted-foreground">{talk.summary}</p>
        </div>
        <div className="tt-in flex gap-2.5 rounded-lg bg-amber-50 p-3 text-sm text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <p>
            <span className="font-semibold">Why it matters: </span>
            {talk.why}
          </p>
        </div>
        <ol className="space-y-2.5">
          {talk.points.map((p, i) => (
            <li
              key={i}
              className="tt-in flex gap-3 text-sm"
              style={{ animationDelay: `${0.5 + i * 0.3}s` }}
            >
              <span
                className="flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ background: cat.accent }}
              >
                {i + 1}
              </span>
              <span className="pt-0.5">{p}</span>
            </li>
          ))}
        </ol>
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              ["Do", talk.dos, Check, "text-green-700 dark:text-green-400", "bg-green-50 dark:bg-green-950/30", "2.1s"],
              ["Don't", talk.donts, X, "text-red-700 dark:text-red-400", "bg-red-50 dark:bg-red-950/30", "2.4s"],
            ] as const
          ).map(([label, items, Icon, tone, bg, delay]) => (
            <div key={label} className={`tt-in rounded-lg p-3 ${bg}`} style={{ animationDelay: delay }}>
              <p className={`mb-1.5 text-xs font-bold tracking-wide uppercase ${tone}`}>{label}</p>
              <ul className="space-y-1.5">
                {items.map((item) => (
                  <li key={item} className="flex gap-2 text-sm">
                    <Icon className={`mt-0.5 size-4 shrink-0 ${tone}`} strokeWidth={3} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div
          className="tt-in rounded-lg border-l-4 p-3 text-sm font-medium"
          style={{ borderColor: cat.accent, background: `${cat.accent}10`, animationDelay: "2.8s" }}
        >
          Remember: {talk.remember}
        </div>
        <p className="tt-in text-xs text-muted-foreground" style={{ animationDelay: "3.1s" }}>
          <span className="font-semibold text-foreground">Talk about it:</span> {talk.ask}
        </p>
      </div>
    </article>
  );
}