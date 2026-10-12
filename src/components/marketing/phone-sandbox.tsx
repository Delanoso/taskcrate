"use client";

import { useState } from "react";
import { getSandbox } from "@/data/sandboxes";
import { cn } from "@/lib/utils";

export function PhoneSandbox({
  productSlug,
  compact = false,
}: {
  productSlug: string;
  compact?: boolean;
}) {
  const sandbox = getSandbox(productSlug);
  const [step, setStep] = useState(0);
  const [success, setSuccess] = useState(false);
  const [pulse, setPulse] = useState(false);

  function tap(index: number) {
    if (success) {
      setSuccess(false);
      setStep(0);
      return;
    }
    if (index !== step) return;
    setPulse(true);
    setTimeout(() => setPulse(false), 180);
    if (index >= sandbox.steps.length - 1) {
      setSuccess(true);
      return;
    }
    setStep(index + 1);
  }

  return (
    <div
      className={cn(
        "mx-auto select-none",
        compact ? "w-[168px]" : "w-[220px]",
      )}
      role="application"
      aria-label={`${sandbox.screenTitle} interactive demo`}
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-[1.6rem] border-[5px] border-zinc-800 bg-zinc-900 shadow-xl",
          compact ? "h-[300px]" : "h-[390px]",
        )}
      >
        <div className="absolute top-0 left-1/2 z-10 h-5 w-20 -translate-x-1/2 rounded-b-xl bg-zinc-800" />
        <div className="flex h-full flex-col bg-gradient-to-b from-slate-50 to-slate-100 text-slate-900">
          <div className="px-3 pt-7 pb-2">
            <p className="text-[10px] font-medium tracking-wide text-slate-500 uppercase">
              {sandbox.subtitle}
            </p>
            <p className={cn("font-semibold", compact ? "text-sm" : "text-base")}>
              {sandbox.screenTitle}
            </p>
          </div>

          <div className="flex flex-1 flex-col gap-2 px-3 pb-3">
            {success ? (
              <button
                type="button"
                onClick={() => tap(0)}
                className="flex flex-1 flex-col items-center justify-center rounded-xl bg-emerald-600 px-3 text-center text-white shadow-inner transition active:scale-[0.98]"
              >
                <span className="text-[10px] font-medium tracking-wide uppercase opacity-90">
                  Simulation
                </span>
                <span className={cn("mt-1 font-semibold", compact ? "text-sm" : "text-base")}>
                  {sandbox.successTitle}
                </span>
                <span className="mt-2 text-[11px] leading-snug text-emerald-50">
                  {sandbox.successBody}
                </span>
                <span className="mt-3 text-[10px] underline opacity-80">Tap to replay</span>
              </button>
            ) : (
              sandbox.steps.map((s, i) => {
                const active = i === step;
                const done = i < step;
                return (
                  <button
                    key={s.id}
                    type="button"
                    disabled={!active}
                    onClick={() => tap(i)}
                    className={cn(
                      "rounded-xl border px-3 py-2.5 text-left transition",
                      done && "border-emerald-200 bg-emerald-50 text-emerald-900",
                      active &&
                        "border-slate-900 bg-slate-900 text-white shadow-md active:scale-[0.98]",
                      !active && !done && "border-slate-200 bg-white/70 text-slate-400",
                      active && pulse && "ring-2 ring-sky-400",
                    )}
                  >
                    <span className="block text-[11px] font-medium">
                      {done ? "✓ " : active ? "→ " : `${i + 1}. `}
                      {s.label}
                    </span>
                    {s.detail && active && (
                      <span className="mt-0.5 block text-[10px] opacity-80">{s.detail}</span>
                    )}
                  </button>
                );
              })
            )}
            {!success && (
              <p className="mt-auto text-center text-[10px] text-slate-500">
                Tap the highlighted action
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
