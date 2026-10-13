"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { fileToCompressedDataUrl } from "@/lib/image-compress";

/** Up to `max` compressed photos held as data URLs until the form is submitted. */
export function PhotoList({
  value,
  onChange,
  max = 4,
  label = "Add photo",
}: {
  value: string[];
  onChange: (photos: string[]) => void;
  max?: number;
  label?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  // Compression is async; append to the latest list, not the one captured at click time.
  const latest = useRef(value);
  useEffect(() => {
    latest.current = value;
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    try {
      const room = max - latest.current.length;
      const added: string[] = [];
      for (const f of Array.from(files).slice(0, room)) added.push(await fileToCompressedDataUrl(f));
      onChange([...latest.current, ...added]);
    } catch {
      setError("Could not read that photo. Try again.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {value.map((src, i) => (
          <div key={i} className="relative size-20 overflow-hidden rounded-md border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={`Photo ${i + 1}`} className="size-full object-cover" />
            <button
              type="button"
              aria-label="Remove photo"
              onClick={() => onChange(value.filter((_, j) => j !== i))}
              className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}
        {value.length < max && (
          <button
            type="button"
            disabled={busy}
            onClick={() => input.current?.click()}
            className="flex size-20 flex-col items-center justify-center gap-1 rounded-md border border-dashed text-xs text-muted-foreground hover:bg-muted disabled:opacity-50"
          >
            <Camera className="size-5" />
            {busy ? "Adding…" : label}
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => add(e.target.files)} />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
