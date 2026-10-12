"use client";

import { useEffect, useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import { fileToCompressedDataUrl } from "@/lib/image-compress";

export function PhotoInput({
  label,
  onChange,
  capture = "environment",
}: {
  label: string;
  onChange: (dataUrl: string | null) => void;
  capture?: "environment" | "user";
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Compression is async; call the latest onChange so callers spreading form state
  // don't overwrite fields edited while the photo was processing.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <input
        type="file"
        accept="image/*"
        capture={capture}
        disabled={busy}
        className="block w-full text-sm"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) {
            setPreview(null);
            setError(null);
            onChange(null);
            return;
          }
          setBusy(true);
          setError(null);
          try {
            const dataUrl = await fileToCompressedDataUrl(file);
            setPreview(dataUrl);
            onChangeRef.current(dataUrl);
          } catch {
            setPreview(null);
            setError("Could not read that photo. Try again.");
            onChangeRef.current(null);
          } finally {
            setBusy(false);
          }
        }}
      />
      {busy && <p className="text-xs text-muted-foreground">Compressing photo…</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
      {preview && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt={`${label} preview`}
          className="mt-1 max-h-40 w-full rounded-md border object-cover"
        />
      )}
    </div>
  );
}
