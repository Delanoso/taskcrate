import type { CSSProperties, ReactNode } from "react";

export const SCENES = [
  "warning",
  "ppe",
  "fire",
  "electric",
  "forklift",
  "truck",
  "ladder",
  "lifting",
  "chemical",
  "slip",
  "noise",
  "heat",
  "firstaid",
  "tools",
  "eye",
  "hand",
  "machine",
  "fatigue",
  "phone",
  "stack",
  "exit",
  "checklist",
  "housekeeping",
] as const;

export type SceneKey = (typeof SCENES)[number];

const INK = "#0f172a";
const SOFT = "#e2e8f0";
const MID = "#94a3b8";

const css = `
.tt-scene .c{transform-box:fill-box;transform-origin:center}
.tt-scene .b{transform-box:fill-box;transform-origin:bottom center}
.tt-scene .l{transform-box:fill-box;transform-origin:left center}
@keyframes tt-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}
@keyframes tt-wave{0%{transform:scale(.6);opacity:.9}100%{transform:scale(1.5);opacity:0}}
@keyframes tt-flicker{0%,100%{transform:scaleY(1) skewX(0)}33%{transform:scaleY(1.14) skewX(4deg)}66%{transform:scaleY(.94) skewX(-3deg)}}
@keyframes tt-flash{0%,40%,100%{opacity:1}45%,55%{opacity:.15}}
@keyframes tt-drive{0%,100%{transform:translateX(-34px)}50%{transform:translateX(34px)}}
@keyframes tt-road{from{transform:translateX(0)}to{transform:translateX(-48px)}}
@keyframes tt-spin{to{transform:rotate(360deg)}}
@keyframes tt-spinr{to{transform:rotate(-360deg)}}
@keyframes tt-rise{0%{transform:translateY(0);opacity:0}20%{opacity:1}100%{transform:translateY(-42px);opacity:0}}
@keyframes tt-fall{0%{transform:translateY(-24px);opacity:0}30%{opacity:1}100%{transform:translateY(34px);opacity:0}}
@keyframes tt-blink{0%,88%,100%{transform:scaleY(1)}94%{transform:scaleY(.08)}}
@keyframes tt-shake{0%,100%{transform:rotate(0)}20%{transform:rotate(-9deg)}40%{transform:rotate(9deg)}60%{transform:rotate(-6deg)}80%{transform:rotate(6deg)}}
@keyframes tt-draw{from{stroke-dashoffset:320}to{stroke-dashoffset:0}}
@keyframes tt-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
@keyframes tt-climb{0%,100%{transform:translateY(0)}50%{transform:translateY(-34px)}}
@keyframes tt-lift{0%,25%{transform:translateY(0)}60%,85%{transform:translateY(-26px)}100%{transform:translateY(0)}}
@keyframes tt-pop{0%,15%{transform:scale(0);opacity:0}30%{transform:scale(1.25);opacity:1}40%,100%{transform:scale(1);opacity:1}}
@keyframes tt-drop{0%{transform:translateY(-70px);opacity:0}35%{transform:translateY(0);opacity:1}100%{transform:translateY(0);opacity:1}}
@keyframes tt-sweep{0%,100%{transform:rotate(-16deg)}50%{transform:rotate(16deg)}}
@keyframes tt-run{0%{transform:translateX(-50px)}100%{transform:translateX(40px)}}
@keyframes tt-scoot{0%,100%{transform:translateX(0)}50%{transform:translateX(-26px);opacity:0}}
@keyframes tt-hatdrop{0%{transform:translateY(-40px);opacity:0}40%,100%{transform:translateY(0);opacity:1}}
@media (prefers-reduced-motion:reduce){.tt-scene *{animation:none!important}}
`;

function a(
  name: string,
  dur: number,
  opts: { delay?: number; timing?: string; once?: boolean } = {},
): CSSProperties {
  return {
    animation: `tt-${name} ${dur}s ${opts.timing ?? "ease-in-out"} ${opts.delay ?? 0}s ${
      opts.once ? "1 both" : "infinite"
    }`,
  };
}

function Ground() {
  return <line x1="10" y1="132" x2="230" y2="132" stroke={MID} strokeWidth="2" strokeLinecap="round" />;
}

function Person({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g transform={`translate(${x} ${y})`} stroke={INK} strokeWidth="4" strokeLinecap="round" fill="none">
      <circle cx="0" cy="-58" r="9" fill={SOFT} />
      <path d="M-11 -66 a11 9 0 0 1 22 0 z" fill={color} stroke="none" />
      <line x1="0" y1="-48" x2="0" y2="-20" />
      <line x1="0" y1="-40" x2="-12" y2="-28" />
      <line x1="0" y1="-40" x2="12" y2="-28" />
      <line x1="0" y1="-20" x2="-9" y2="0" />
      <line x1="0" y1="-20" x2="9" y2="0" />
    </g>
  );
}

function scene(key: SceneKey, accent: string): ReactNode {
  switch (key) {
    case "warning":
      return (
        <>
          <circle cx="120" cy="78" r="40" fill={accent} opacity=".25" className="c" style={a("wave", 2.2, { timing: "ease-out" })} />
          <circle cx="120" cy="78" r="40" fill={accent} opacity=".25" className="c" style={a("wave", 2.2, { delay: 1.1, timing: "ease-out" })} />
          <g className="c" style={a("pulse", 1.6)}>
            <path d="M120 34 L162 112 H78 Z" fill="#facc15" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
            <rect x="116" y="58" width="8" height="30" rx="4" fill={INK} />
            <circle cx="120" cy="99" r="5" fill={INK} />
          </g>
        </>
      );
    case "ppe":
      return (
        <>
          <Ground />
          <circle cx="120" cy="88" r="26" fill={SOFT} stroke={INK} strokeWidth="4" />
          <rect x="102" y="80" width="36" height="12" rx="6" fill="#7dd3fc" stroke={INK} strokeWidth="3" />
          <path d="M96 132 Q120 112 144 132" fill={accent} stroke={INK} strokeWidth="4" />
          <g style={a("hatdrop", 2.4, { timing: "cubic-bezier(.3,1.5,.6,1)" })}>
            <path d="M90 70 a30 24 0 0 1 60 0 z" fill="#facc15" stroke={INK} strokeWidth="4" />
            <rect x="84" y="66" width="72" height="8" rx="4" fill="#facc15" stroke={INK} strokeWidth="4" />
          </g>
          <path d="M174 54 l6 6 12 -14" stroke="#16a34a" strokeWidth="6" fill="none" strokeLinecap="round" className="c" style={a("pop", 2.4)} />
        </>
      );
    case "fire":
      return (
        <>
          <Ground />
          <g className="b" style={a("flicker", 0.9)}>
            <path d="M90 132 C70 100 98 86 92 56 C116 74 126 92 120 110 C130 98 134 88 132 76 C150 96 150 120 140 132 Z" fill="#f97316" />
          </g>
          <g className="b" style={a("flicker", 0.7, { delay: 0.2 })}>
            <path d="M104 132 C96 116 108 106 106 92 C120 104 126 116 122 132 Z" fill="#facc15" />
          </g>
          <rect x="176" y="70" width="22" height="62" rx="8" fill="#dc2626" stroke={INK} strokeWidth="4" />
          <path d="M187 70 v-10 h-14" stroke={INK} strokeWidth="4" fill="none" strokeLinecap="round" />
          {[0, 0.3, 0.6].map((d) => (
            <circle key={d} cx="166" cy="62" r="4" fill={SOFT} className="c" style={{ ...a("scoot", 1, { delay: d, timing: "linear" }) }} />
          ))}
        </>
      );
    case "electric":
      return (
        <>
          <rect x="40" y="58" width="56" height="40" rx="10" fill={SOFT} stroke={INK} strokeWidth="4" />
          <line x1="56" y1="70" x2="56" y2="84" stroke={INK} strokeWidth="5" strokeLinecap="round" />
          <line x1="80" y1="70" x2="80" y2="84" stroke={INK} strokeWidth="5" strokeLinecap="round" />
          <path d="M96 78 C120 78 120 110 150 110" stroke={INK} strokeWidth="4" fill="none" />
          <g style={a("flash", 1.4)}>
            <path d="M168 30 L140 82 H162 L148 122 L192 64 H168 L182 30 Z" fill="#facc15" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
          </g>
          <circle cx="166" cy="76" r="44" fill="#facc15" opacity=".2" className="c" style={a("wave", 1.4, { timing: "ease-out" })} />
        </>
      );
    case "forklift":
      return (
        <>
          <Ground />
          <g style={a("drive", 4)}>
            <rect x="92" y="88" width="50" height="30" rx="5" fill={accent} stroke={INK} strokeWidth="4" />
            <path d="M100 88 V60 H130 L136 88" fill="none" stroke={INK} strokeWidth="4" />
            <line x1="146" y1="52" x2="146" y2="122" stroke={INK} strokeWidth="5" />
            <line x1="146" y1="118" x2="172" y2="118" stroke={INK} strokeWidth="4" />
            <rect x="150" y="92" width="24" height="22" fill="#d97706" stroke={INK} strokeWidth="3" />
            <circle cx="104" cy="124" r="8" fill={INK} />
            <circle cx="134" cy="124" r="8" fill={INK} />
          </g>
          <path d="M30 30 h24 M30 30 l8 -6 M30 30 l8 6" stroke={MID} strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      );
    case "truck":
      return (
        <>
          <g style={a("road", 0.8, { timing: "linear" })}>
            {[0, 48, 96, 144, 192, 240].map((x) => (
              <rect key={x} x={x + 4} y="138" width="26" height="4" rx="2" fill={MID} />
            ))}
          </g>
          <line x1="0" y1="132" x2="240" y2="132" stroke={INK} strokeWidth="2" />
          <g style={a("bob", 0.6)}>
            <rect x="40" y="62" width="104" height="54" rx="4" fill={accent} stroke={INK} strokeWidth="4" />
            <path d="M144 76 H174 L192 96 V116 H144 Z" fill={SOFT} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
            <rect x="152" y="82" width="20" height="14" rx="2" fill="#7dd3fc" />
          </g>
          {[66, 120, 172].map((cx) => (
            <g key={cx} className="c" style={a("spin", 0.6, { timing: "linear" })}>
              <circle cx={cx} cy="120" r="11" fill={INK} />
              <line x1={cx - 8} y1="120" x2={cx + 8} y2="120" stroke={MID} strokeWidth="3" />
            </g>
          ))}
        </>
      );
    case "ladder":
      return (
        <>
          <Ground />
          <g stroke={INK} strokeWidth="4" strokeLinecap="round">
            <line x1="100" y1="132" x2="114" y2="20" />
            <line x1="140" y1="132" x2="154" y2="20" />
            {[118, 96, 74, 52, 30].map((y, i) => (
              <line key={y} x1={102 + i * 2.6} y1={y} x2={142 + i * 2.6} y2={y} />
            ))}
          </g>
          <g style={a("climb", 3.2)}>
            <Person x={126} y={126} color={accent} />
          </g>
          <text x="186" y="60" fontSize="28" fontWeight="800" fill={accent}>3</text>
          <text x="180" y="78" fontSize="10" fontWeight="700" fill={INK}>POINTS</text>
        </>
      );
    case "lifting":
      return (
        <>
          <Ground />
          <Person x={100} y={130} color={accent} />
          <g style={a("lift", 2.8)}>
            <rect x="112" y="98" width="34" height="30" rx="3" fill="#d97706" stroke={INK} strokeWidth="4" />
            <line x1="112" y1="108" x2="146" y2="108" stroke={INK} strokeWidth="2" />
          </g>
          <path d="M180 116 V64 M170 74 l10 -12 10 12" stroke="#16a34a" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <text x="164" y="132" fontSize="10" fontWeight="700" fill={INK}>LEGS</text>
        </>
      );
    case "chemical":
      return (
        <>
          <path d="M104 30 h32 v30 l26 56 a10 10 0 0 1 -9 14 h-66 a10 10 0 0 1 -9 -14 l26 -56 z" fill={SOFT} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
          <path d="M86 100 h68 l8 16 a10 10 0 0 1 -9 14 h-66 a10 10 0 0 1 -9 -14 z" fill={accent} />
          {[0, 0.7, 1.4].map((d, i) => (
            <circle key={d} cx={110 + i * 12} cy="108" r={4 + i} fill="#fff" opacity=".85" style={a("rise", 2.1, { delay: d, timing: "ease-out" })} />
          ))}
          <g style={a("bob", 2)}>
            <path d="M188 40 l16 28 h-32 z" fill="#facc15" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
            <text x="185" y="64" fontSize="16" fontWeight="900" fill={INK}>!</text>
          </g>
        </>
      );
    case "slip":
      return (
        <>
          <Ground />
          <ellipse cx="120" cy="132" rx="70" ry="6" fill="#7dd3fc" opacity=".6" className="c" style={a("pulse", 1.8)} />
          <path d="M96 128 L114 44 H126 L144 128" fill="#facc15" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
          <path d="M104 92 h32" stroke={INK} strokeWidth="3" />
          <text x="108" y="84" fontSize="11" fontWeight="900" fill={INK}>WET</text>
          {[60, 170, 190].map((x, i) => (
            <path key={x} d={`M${x} 40 q6 10 0 14 q-6 -4 0 -14`} fill="#38bdf8" style={a("fall", 1.6, { delay: i * 0.5, timing: "ease-in" })} />
          ))}
        </>
      );
    case "noise":
      return (
        <>
          <path d="M90 50 C90 28 132 22 136 52 C138 70 118 74 118 92 C118 108 100 112 94 100" fill={SOFT} stroke={INK} strokeWidth="5" strokeLinecap="round" />
          <path d="M106 56 C106 46 122 46 120 60" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
          {[0, 0.6, 1.2].map((d) => (
            <path key={d} d="M150 46 Q166 72 150 98" fill="none" stroke={accent} strokeWidth="5" strokeLinecap="round" className="l" style={a("wave", 1.8, { delay: d, timing: "ease-out" })} />
          ))}
          <rect x="54" y="60" width="14" height="34" rx="7" fill={accent} stroke={INK} strokeWidth="3" />
        </>
      );
    case "heat":
      return (
        <>
          <g className="c" style={a("spin", 12, { timing: "linear" })}>
            {Array.from({ length: 8 }, (_, i) => (
              <line key={i} x1="90" y1="18" x2="90" y2="30" stroke="#f59e0b" strokeWidth="5" strokeLinecap="round" transform={`rotate(${i * 45} 90 62)`} />
            ))}
          </g>
          <circle cx="90" cy="62" r="24" fill="#facc15" stroke="#f59e0b" strokeWidth="4" />
          <g style={a("bob", 1.6)}>
            <rect x="150" y="56" width="30" height="70" rx="10" fill="#7dd3fc" stroke={INK} strokeWidth="4" />
            <rect x="158" y="46" width="14" height="12" rx="3" fill={accent} stroke={INK} strokeWidth="3" />
            <path d="M150 90 h30" stroke="#fff" strokeWidth="3" />
          </g>
          <Ground />
        </>
      );
    case "firstaid":
      return (
        <>
          <g className="c" style={a("pulse", 1.2)}>
            <rect x="80" y="26" width="80" height="80" rx="16" fill="#fff" stroke={INK} strokeWidth="4" />
            <path d="M110 42 h20 v20 h20 v20 h-20 v20 h-20 v-20 h-20 v-20 h20 z" fill="#16a34a" />
          </g>
          <path d="M20 126 H90 L102 106 L116 140 L130 116 H220" fill="none" stroke="#dc2626" strokeWidth="4" strokeLinejoin="round" strokeDasharray="320" style={a("draw", 2.2, { timing: "linear" })} />
        </>
      );
    case "tools":
      return (
        <>
          <g className="c" style={a("spin", 6, { timing: "linear" })}>
            <circle cx="100" cy="80" r="30" fill={SOFT} stroke={INK} strokeWidth="4" strokeDasharray="12 7" />
            <circle cx="100" cy="80" r="10" fill={INK} />
          </g>
          <g className="c" style={a("shake", 2.4)}>
            <path d="M150 40 a16 16 0 1 0 14 24 l30 46 a7 7 0 0 0 12 -8 l-30 -46 a16 16 0 0 0 -10 -26 l-6 12 -10 -2 z" fill={accent} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
          </g>
          <Ground />
        </>
      );
    case "eye":
      return (
        <>
          <g className="c" style={a("blink", 3.2)}>
            <path d="M60 78 Q120 30 180 78 Q120 126 60 78 Z" fill="#fff" stroke={INK} strokeWidth="5" />
            <circle cx="120" cy="78" r="18" fill={accent} />
            <circle cx="120" cy="78" r="8" fill={INK} />
          </g>
          <rect x="52" y="56" width="136" height="44" rx="20" fill="#7dd3fc" opacity=".25" stroke={INK} strokeWidth="3" />
          {[0, 0.4, 0.8].map((d, i) => (
            <circle key={d} cx={200 + i * 6} cy={40 + i * 10} r="3" fill="#f97316" style={a("scoot", 1.2, { delay: d, timing: "linear" })} />
          ))}
        </>
      );
    case "hand":
      return (
        <>
          <path d="M92 128 V70 a8 8 0 0 1 16 0 V60 a8 8 0 0 1 16 0 V64 a8 8 0 0 1 16 0 V76 a8 8 0 0 1 16 0 V104 C156 120 144 130 128 130 Z" fill={accent} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
          <rect x="88" y="118" width="70" height="14" rx="4" fill={INK} />
          <g className="c" style={a("pop", 2.6)}>
            <path d="M184 40 l20 8 v16 c0 14 -10 22 -20 26 c-10 -4 -20 -12 -20 -26 v-16 z" fill="#16a34a" stroke={INK} strokeWidth="3" />
            <path d="M176 62 l6 6 10 -12" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" />
          </g>
        </>
      );
    case "machine":
      return (
        <>
          <g className="c" style={a("spin", 4, { timing: "linear" })}>
            <circle cx="96" cy="78" r="32" fill={SOFT} stroke={INK} strokeWidth="5" strokeDasharray="14 8" />
            <circle cx="96" cy="78" r="9" fill={INK} />
          </g>
          <g className="c" style={a("spinr", 4, { timing: "linear" })}>
            <circle cx="150" cy="78" r="22" fill={SOFT} stroke={INK} strokeWidth="5" strokeDasharray="10 7" />
            <circle cx="150" cy="78" r="6" fill={INK} />
          </g>
          <rect x="54" y="34" width="132" height="88" rx="8" fill="none" stroke={accent} strokeWidth="5" strokeDasharray="6 6" />
          <text x="78" y="138" fontSize="11" fontWeight="800" fill={INK}>GUARD IN PLACE</text>
        </>
      );
    case "fatigue":
      return (
        <>
          <circle cx="104" cy="84" r="34" fill={SOFT} stroke={INK} strokeWidth="5" />
          <path d="M88 82 q6 5 12 0 M110 82 q6 5 12 0" stroke={INK} strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M98 100 q6 -3 12 0" stroke={INK} strokeWidth="4" fill="none" strokeLinecap="round" />
          {["Z", "z", "z"].map((z, i) => (
            <text key={i} x={142 + i * 12} y={62 - i * 12} fontSize={22 - i * 4} fontWeight="900" fill={accent} style={a("rise", 2.4, { delay: i * 0.6, timing: "ease-out" })}>
              {z}
            </text>
          ))}
        </>
      );
    case "phone":
      return (
        <>
          <g className="c" style={a("shake", 0.6)}>
            <rect x="96" y="30" width="48" height="90" rx="10" fill={INK} />
            <rect x="102" y="40" width="36" height="64" rx="4" fill="#7dd3fc" />
          </g>
          <circle cx="120" cy="76" r="54" fill="none" stroke="#dc2626" strokeWidth="8" />
          <line x1="82" y1="38" x2="158" y2="114" stroke="#dc2626" strokeWidth="8" strokeLinecap="round" />
        </>
      );
    case "stack":
      return (
        <>
          <Ground />
          {[0, 1, 2].map((i) => (
            <rect key={i} x="96" y={104 - i * 28} width="48" height="28" rx="2" fill={i === 2 ? accent : "#d97706"} stroke={INK} strokeWidth="4" style={a("drop", 3.6, { delay: i * 0.5, timing: "cubic-bezier(.4,1.6,.6,1)" })} />
          ))}
          <path d="M70 132 V40 M64 48 l6 -10 6 10 M70 132" stroke={MID} strokeWidth="3" fill="none" strokeLinecap="round" />
          <text x="40" y="34" fontSize="10" fontWeight="700" fill={INK}>MAX HEIGHT</text>
        </>
      );
    case "exit":
      return (
        <>
          <Ground />
          <rect x="176" y="40" width="44" height="92" rx="3" fill="#16a34a" stroke={INK} strokeWidth="4" />
          <circle cx="210" cy="88" r="3" fill="#fff" />
          <rect x="168" y="20" width="60" height="16" rx="3" fill="#16a34a" />
          <text x="183" y="32" fontSize="11" fontWeight="900" fill="#fff">EXIT</text>
          <g style={a("run", 2.2, { timing: "linear" })}>
            <Person x={100} y={130} color={accent} />
          </g>
          <path d="M40 60 h40 M70 50 l10 10 -10 10" stroke="#16a34a" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </>
      );
    case "checklist":
      return (
        <>
          <rect x="72" y="26" width="96" height="112" rx="8" fill="#fff" stroke={INK} strokeWidth="4" />
          <rect x="100" y="18" width="40" height="16" rx="4" fill={accent} stroke={INK} strokeWidth="3" />
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <rect x="86" y={50 + i * 28} width="16" height="16" rx="3" fill="none" stroke={INK} strokeWidth="3" />
              <line x1="110" y1={58 + i * 28} x2="154" y2={58 + i * 28} stroke={MID} strokeWidth="4" strokeLinecap="round" />
              <path d={`M89 ${58 + i * 28} l4 4 8 -9`} stroke="#16a34a" strokeWidth="4" fill="none" strokeLinecap="round" className="c" style={a("pop", 3, { delay: i * 0.6 })} />
            </g>
          ))}
        </>
      );
    case "housekeeping":
      return (
        <>
          <Ground />
          <g style={{ transformOrigin: "150px 30px", ...a("sweep", 1.2) }}>
            <line x1="150" y1="30" x2="132" y2="112" stroke="#92400e" strokeWidth="6" strokeLinecap="round" />
            <path d="M116 108 h34 l6 24 h-46 z" fill={accent} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
          </g>
          {[0, 0.4, 0.8].map((d, i) => (
            <rect key={d} x={70 - i * 14} y={124 - i * 2} width="7" height="7" fill={MID} style={a("scoot", 1.2, { delay: d })} />
          ))}
        </>
      );
  }
}

export function TalkScene({
  scene: key,
  accent,
  className,
}: {
  scene: SceneKey;
  accent: string;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 240 150"
      className={`tt-scene ${className ?? ""}`}
      role="img"
      aria-hidden="true"
    >
      <style>{css}</style>
      {scene(key, accent)}
    </svg>
  );
}
