"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Download, ExternalLink, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { qrSvg } from "@/lib/qr";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** QR code for a public link with copy, open, SVG download and an A4 print poster. */
export function QrCard({
  url,
  title,
  subtitle,
  company,
  fileName = "qr-code",
}: {
  url: string;
  /** Large heading on the printed poster, e.g. "Report a near miss" */
  title: string;
  /** Instruction line under the heading on the poster */
  subtitle?: string;
  company?: string;
  fileName?: string;
}) {
  const svg = useMemo(() => (url ? qrSvg(url) : ""), [url]);
  const [copied, setCopied] = useState(false);
  if (!url) return null;

  function printPoster() {
    const w = window.open("", "_blank", "width=800,height=1000");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>${esc(title)}</title><style>
      @page { size: A4; margin: 18mm; }
      body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; text-align: center; color: #111; margin: 0; }
      .co { font-size: 20px; color: #555; margin-top: 10mm; }
      h1 { font-size: 44px; margin: 8mm 0 4mm; line-height: 1.1; }
      p.sub { font-size: 20px; color: #333; margin: 0 auto 8mm; max-width: 150mm; }
      .qr { width: 130mm; height: 130mm; margin: 0 auto; }
      .qr svg { width: 100%; height: 100%; }
      .url { font-family: ui-monospace, monospace; font-size: 11px; color: #666; margin-top: 6mm; word-break: break-all; }
      .steps { font-size: 16px; color: #444; margin-top: 8mm; }
    </style></head><body>
      ${company ? `<div class="co">${esc(company)}</div>` : ""}
      <h1>${esc(title)}</h1>
      ${subtitle ? `<p class="sub">${esc(subtitle)}</p>` : ""}
      <div class="qr">${svg}</div>
      <div class="steps">Open your phone camera and point it at the code.</div>
      <div class="url">${esc(url)}</div>
      <script>window.onload = () => { window.focus(); window.print(); };</script>
    </body></html>`);
    w.document.close();
  }

  function download() {
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${fileName}.svg`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div
        className="size-40 shrink-0 overflow-hidden rounded-md border bg-white p-1 [&_svg]:size-full"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <div className="min-w-0 space-y-2">
        <p className="break-all rounded-md bg-muted p-2 font-mono text-xs">{url}</p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={printPoster}><Printer className="size-4" />Print poster</Button>
          <Button size="sm" variant="outline" onClick={copy}>
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? "Copied" : "Copy link"}
          </Button>
          <Button size="sm" variant="outline" onClick={download}><Download className="size-4" />QR image</Button>
          <Button asChild size="sm" variant="ghost">
            <a href={url} target="_blank" rel="noreferrer"><ExternalLink className="size-4" />Open</a>
          </Button>
        </div>
      </div>
    </div>
  );
}
