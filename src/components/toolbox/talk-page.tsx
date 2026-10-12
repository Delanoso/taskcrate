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
        <ol className="space-y-2.5">
          {talk.points.map((p, i) => (
            <li
              key={i}
              className="tt-in flex gap-3 text-sm"
              style={{ animationDelay: `${0.3 + i * 0.35}s` }}
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
        <div
          className="tt-in rounded-lg border-l-4 p-3 text-sm font-medium"
          style={{ borderColor: cat.accent, background: `${cat.accent}10`, animationDelay: "2.2s" }}
        >
          Remember: {talk.remember}
        </div>
        <p className="tt-in text-xs text-muted-foreground" style={{ animationDelay: "2.5s" }}>
          <span className="font-semibold text-foreground">Talk about it:</span> {talk.ask}
        </p>
      </div>
    </article>
  );
}