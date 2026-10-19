"use client";

import { useRef, useState } from "react";
import { FileText, ImagePlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Initial = { displayName: string; primaryColor: string; accentColor: string; logoUrl: string };

/** Scales the logo down to at most 800×400 and keeps PNG transparency. */
function resizeLogo(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, 800 / img.width, 400 / img.height);
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(img.width * s));
      c.height = Math.max(1, Math.round(img.height * s));
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(file.type === "image/jpeg" ? c.toDataURL("image/jpeg", 0.9) : c.toDataURL("image/png"));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Could not read that image")); };
    img.src = url;
  });
}

export function BrandingForm({ initial }: { initial: Initial }) {
  const [form, setForm] = useState({ displayName: initial.displayName, primaryColor: initial.primaryColor, accentColor: initial.accentColor });
  const [logoUrl, setLogoUrl] = useState(initial.logoUrl);
  const [logo, setLogo] = useState<string | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [pasteUrl, setPasteUrl] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const preview = logo ?? (removeLogo ? null : logoUrl || null);

  async function pick(f: File | undefined) {
    if (!f) return;
    setError(null);
    if (!/image\/(png|jpeg)/.test(f.type)) return setError("Choose a PNG or JPG logo.");
    try {
      setLogo(await resizeLogo(f));
      setRemoveLogo(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that image");
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);
    const res = await fetch("/api/branding", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, logo, removeLogo, logoUrl: !logo && pasteUrl ? pasteUrl : undefined }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) return setError(data.error ?? "Save failed");
    setLogoUrl(data.logoUrl ?? "");
    setLogo(null);
    setRemoveLogo(false);
    setPasteUrl("");
    setMessage("Saved. Every new PDF uses these settings.");
  }

  return (
    <form onSubmit={save} className="space-y-5 rounded-xl border bg-card p-6">
      <div className="space-y-2">
        <Label htmlFor="displayName">Company name on PDFs</Label>
        <Input id="displayName" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
      </div>

      <div className="space-y-2">
        <Label>Logo</Label>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-20 w-48 items-center justify-center overflow-hidden rounded-md border bg-white p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {preview ? <img src={preview} alt="Logo" className="max-h-full max-w-full object-contain" /> : <span className="text-xs text-muted-foreground">No logo</span>}
          </div>
          <div className="flex flex-col gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => file.current?.click()}><ImagePlus className="size-4" />{preview ? "Change logo" : "Upload logo"}</Button>
            {preview && <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={() => { setLogo(null); setRemoveLogo(true); }}><Trash2 className="size-4" />Remove</Button>}
          </div>
          <input ref={file} type="file" hidden accept="image/png,image/jpeg" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
        </div>
        <p className="text-xs text-muted-foreground">PNG (best, keeps a see-through background) or JPG. Wide logos look best.</p>
        <Input placeholder="…or paste a link to your logo (https://…)" value={pasteUrl} onChange={(e) => setPasteUrl(e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="primary">Primary colour</Label>
          <Input id="primary" type="color" value={form.primaryColor} onChange={(e) => setForm({ ...form, primaryColor: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="accent">Accent colour</Label>
          <Input id="accent" type="color" value={form.accentColor} onChange={(e) => setForm({ ...form, accentColor: e.target.value })} />
        </div>
      </div>

      {message && <p className="text-sm text-green-700 dark:text-green-400">{message}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={loading}>{loading ? "Saving…" : "Save branding"}</Button>
        <Button type="button" variant="outline" asChild><a href="/api/demo/pdf" target="_blank" rel="noreferrer"><FileText className="size-4" />See a sample PDF</a></Button>
      </div>
    </form>
  );
}
