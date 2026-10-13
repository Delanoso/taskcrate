"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button, Input } from "@/components/modules/ui-bits";
import { SAFETY_FILE_GROUPS, SAFETY_FILE_PRESETS } from "@/lib/modules/safety-file-items";

export function RequirementPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (keys: string[]) => void;
}) {
  const [custom, setCustom] = useState("");
  const selected = new Set(value);
  const customKeys = value.filter((k) => k.startsWith("custom:"));

  function toggle(key: string) {
    onChange(selected.has(key) ? value.filter((k) => k !== key) : [...value, key]);
  }

  function setGroup(keys: string[], on: boolean) {
    const rest = value.filter((k) => !keys.includes(k));
    onChange(on ? [...rest, ...keys] : rest);
  }

  function addCustom() {
    const label = custom.trim().replace(/\s+/g, " ").slice(0, 80);
    if (label.length < 2) return;
    const key = `custom:${label}`;
    if (!selected.has(key)) onChange([...value, key]);
    setCustom("");
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted-foreground">Quick start:</span>
        {SAFETY_FILE_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onChange([...p.keys, ...customKeys])}
            className="rounded-full border px-2.5 py-1 text-xs font-medium hover:bg-muted"
          >
            {p.label} ({p.keys.length})
          </button>
        ))}
        {value.length > 0 && (
          <button type="button" onClick={() => onChange([])} className="px-1.5 text-xs text-muted-foreground underline">
            Clear
          </button>
        )}
      </div>

      <div className="max-h-[26rem] space-y-3 overflow-y-auto rounded-md border p-3">
        {SAFETY_FILE_GROUPS.map((g) => {
          const keys = g.items.map((i) => i.key);
          const n = keys.filter((k) => selected.has(k)).length;
          return (
            <fieldset key={g.id} className="space-y-1.5">
              <legend className="flex w-full items-center justify-between gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                <span>{g.label} ({n}/{keys.length})</span>
                <button
                  type="button"
                  className="font-normal normal-case underline"
                  onClick={() => setGroup(keys, n < keys.length)}
                >
                  {n < keys.length ? "Select all" : "None"}
                </button>
              </legend>
              {g.items.map((i) => (
                <label key={i.key} className="flex cursor-pointer items-start gap-2 rounded px-1 py-0.5 text-sm hover:bg-muted">
                  <input
                    type="checkbox"
                    className="mt-0.5 size-4 shrink-0 accent-primary"
                    checked={selected.has(i.key)}
                    onChange={() => toggle(i.key)}
                  />
                  <span>
                    {i.label}
                    {i.expires && <span className="ml-1.5 text-xs text-muted-foreground">· expiry tracked</span>}
                    {i.hint && <span className="block text-xs text-muted-foreground">{i.hint}</span>}
                  </span>
                </label>
              ))}
            </fieldset>
          );
        })}

        <fieldset className="space-y-1.5">
          <legend className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Your own items</legend>
          {customKeys.map((k) => (
            <div key={k} className="flex items-center justify-between gap-2 rounded px-1 py-0.5 text-sm">
              <span>{k.slice(7)}</span>
              <button type="button" onClick={() => toggle(k)} aria-label="Remove" className="text-muted-foreground hover:text-destructive">
                <X className="size-4" />
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustom();
                }
              }}
              placeholder="e.g. Asbestos removal licence"
              className="h-8"
            />
            <Button type="button" size="sm" variant="outline" onClick={addCustom}>
              <Plus className="size-4" /> Add
            </Button>
          </div>
        </fieldset>
      </div>
      <p className="text-xs text-muted-foreground">{value.length} document{value.length === 1 ? "" : "s"} required</p>
    </div>
  );
}
