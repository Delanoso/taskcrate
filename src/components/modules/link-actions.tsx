"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Download, ExternalLink, Printer, QrCode, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { qrSvg } from "@/lib/qr";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** A public link with Open, Copy and QR code buttons; extra buttons (e.g. WhatsApp) go in children. */
export function LinkActions({
  url,
  title = "Scan to open",
  showUrl = true,
  onAction,
  children,
}: {
  url: string;
  /** Heading on the QR popup and the printed sheet */
  title?: string;
  showUrl?: boolean;
  /** Called after Open / Copy, e.g. to log a reminder */
  onAction?: (action: "open" | "copy") => void;
  children?: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    onAction?.("copy");
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="min-w-0 space-y-2">
      {showUrl && <p className="break-all rounded-md bg-muted/60 p-2 font-mono text-xs">{url}</p>}
      <div className="flex flex-wrap gap-2">
        {children}
        <Button size="sm" variant="outline" asChild>
          <a href={url} target="_blank" rel="noreferrer" onClick={() => onAction?.("open")}><ExternalLink className="size-4" />Open link</a>
        </Button>
        <Button size="sm" variant="outline" onClick={copy}>
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "Copied" : "Copy"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setQr(true)}><QrCode className="size-4" />QR code</Button>
      </div>
      {qr && <QrDialog url={url} title={title} onClose={() => setQr(false)} />}
    </div>
  );
}

function QrDialog({ url, title, onClose }: { url: string; title: string; onClose: () => void }) {
  const svg = useMemo(() => qrSvg(url), [url]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function downloadPng() {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = c.height = 1024;
      const ctx = c.getContext("2d")!;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, 1024, 1024);
      c.toBlob((b) => {
        if (!b) return;
        const a = document.createElement("a");
        a.href = URL.createObjectURL(b);
        a.download = `${title.replace(/[^\w-]+/g, "-").toLowerCase() || "qr-code"}.png`;
        a.click();
        URL.revokeObjectURL(a.href);
      }, "image/png");
    };
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  function print() {
    const w = window.open("", "_blank", "width=800,height=1000");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>${esc(title)}</title><style>
      @page { size: A4; margin: 18mm; }
      body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; text-align: center; color: #111; margin: 0; }
      h1 { font-size: 36px; margin: 12mm 0 8mm; }
      .qr { width: 120mm; height: 120mm; margin: 0 auto; } .qr svg { width: 100%; height: 100%; }
      .hint { font-size: 16px; color: #444; margin-top: 8mm; }
      .url { font-family: ui-monospace, monospace; font-size: 11px; color: #666; margin-top: 4mm; word-break: break-all; }
    </style></head><body><h1>${esc(title)}</h1><div class="qr">${svg}</div>
      <div class="hint">Open your phone camera and point it at the code.</div><div class="url">${esc(url)}</div>
      <script>window.onload = () => { window.focus(); window.print(); };</script></body></html>`);
    w.document.close();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose} role="dialog" aria-modal="true" aria-label="QR code">
      <div className="relative w-full max-w-sm rounded-xl bg-card p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <button type="button" aria-label="Close" className="absolute right-3 top-3 text-muted-foreground hover:text-foreground" onClick={onClose}><X className="size-4" /></button>
        <h3 className="pr-6 font-semibold">{title}</h3>
        <div className="mx-auto mt-4 size-64 overflow-hidden rounded-md border bg-white p-1 [&_svg]:size-full" dangerouslySetInnerHTML={{ __html: svg }} />
        <p className="mt-3 break-all text-center font-mono text-xs text-muted-foreground">{url}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button size="sm" onClick={downloadPng}><Download className="size-4" />Download</Button>
          <Button size="sm" variant="outline" onClick={print}><Printer className="size-4" />Print</Button>
        </div>
      </div>
    </div>
  );
}
