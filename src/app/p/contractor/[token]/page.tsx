"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Eye, FileText, Trash2, Upload } from "lucide-react";
import { Button, Input } from "@/components/modules/ui-bits";
import {
  FileStatusBadge,
  ItemStateBadge,
  Progress,
  fmtBytes,
  fmtDate,
  type SafetyDoc,
  type SafetyItem,
} from "@/components/modules/safety-file/shared";

type Info = {
  companyName: string;
  hostCompany: string;
  status: string;
  done: number;
  total: number;
  items: SafetyItem[];
  documents: SafetyDoc[];
};

const MAX_BYTES = 20 * 1024 * 1024;
const ACCEPT = ".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,application/pdf,image/jpeg,image/png";

export default function Page() {
  const { token } = useParams<{ token: string }>();
  const [info, setInfo] = useState<Info | null>(null);
  const [missing, setMissing] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/modules/contractor/public/${token}`);
    if (!res.ok) return setMissing(true);
    setInfo((await res.json()).contractor);
  }, [token]);
  useEffect(() => { load(); }, [load]);

  if (missing) return <p className="text-sm text-muted-foreground">This upload link is not valid.</p>;
  if (!info) return <p>Loading…</p>;

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-xl border bg-card p-5">
        <p className="text-sm text-muted-foreground">Safety file for {info.hostCompany}</p>
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-xl font-semibold">{info.companyName}</h1>
          <FileStatusBadge status={info.status} />
        </div>
        <Progress done={info.done} total={info.total} />
        <p className="text-xs text-muted-foreground">
          Upload each document below. You can add more than one file per item — PDF, photo, Word or Excel, up to 20 MB each.
        </p>
      </div>
      {info.items.map((item) => (
        <ItemCard
          key={item.key}
          token={token}
          item={item}
          docs={info.documents.filter((d) => d.docType === item.key)}
          onChange={load}
        />
      ))}
    </div>
  );
}

function ItemCard({
  token,
  item,
  docs,
  onChange,
}: {
  token: string;
  item: SafetyItem;
  docs: SafetyDoc[];
  onChange: () => Promise<unknown>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [expiresAt, setExpiresAt] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<string | null>(null);

  async function upload() {
    setError(null);
    if (files.length === 0) return setError("Choose at least one file.");
    if (item.expires && !expiresAt) return setError("Enter the expiry date.");
    const tooBig = files.find((f) => f.size > MAX_BYTES);
    if (tooBig) return setError(`${tooBig.name} is larger than 20 MB.`);

    setBusy(true);
    let failed: string | null = null;
    for (const [i, file] of files.entries()) {
      setStatus(`Uploading ${i + 1} of ${files.length}…`);
      const fd = new FormData();
      fd.set("docType", item.key);
      fd.set("file", file);
      if (expiresAt) fd.set("expiresAt", expiresAt);
      const res = await fetch(`/api/modules/contractor/public/${token}`, { method: "POST", body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        failed = data.error ?? `Could not upload ${file.name}.`;
        break;
      }
    }
    setBusy(false);
    setStatus(null);
    if (failed) setError(failed);
    else {
      setFiles([]);
      setExpiresAt("");
      if (fileRef.current) fileRef.current.value = "";
    }
    await onChange();
  }

  async function remove(id: string) {
    setBusy(true);
    await fetch(`/api/modules/contractor/public/${token}/documents/${id}`, { method: "DELETE" });
    setBusy(false);
    setConfirm(null);
    await onChange();
  }

  return (
    <section className="space-y-3 rounded-xl border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">{item.label}</h2>
          {item.hint && <p className="text-xs text-muted-foreground">{item.hint}</p>}
        </div>
        <ItemStateBadge state={item.state} />
      </div>

      {docs.map((d) => (
        <div key={d.id} className="flex items-center gap-2 rounded-md bg-muted/50 px-2.5 py-1.5 text-sm">
          <FileText className="size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1">
            <span className="block truncate">{d.fileName ?? "Document"}</span>
            <span className="text-xs text-muted-foreground">
              {[fmtBytes(d.sizeBytes), d.expiresAt && `expires ${fmtDate(d.expiresAt)}`].filter(Boolean).join(" · ")}
            </span>
          </span>
          <a href={`/api/modules/contractor/public/${token}/documents/${d.id}`} target="_blank" rel="noreferrer" title="View" className="rounded p-1.5 hover:bg-background">
            <Eye className="size-4" />
          </a>
          {confirm === d.id ? (
            <button type="button" disabled={busy} onClick={() => remove(d.id)} className="rounded px-2 py-1 text-xs font-medium text-destructive hover:bg-background">
              Remove?
            </button>
          ) : (
            <button type="button" title="Remove" onClick={() => setConfirm(d.id)} className="rounded p-1.5 text-muted-foreground hover:bg-background hover:text-destructive">
              <Trash2 className="size-4" />
            </button>
          )}
        </div>
      ))}

      <div className="space-y-2">
        <Input
          ref={fileRef}
          type="file"
          multiple
          accept={ACCEPT}
          onChange={(e) => { setFiles(Array.from(e.target.files ?? [])); setError(null); }}
        />
        {item.expires && (
          <label className="flex items-center gap-2 text-sm">
            <span className="shrink-0 text-muted-foreground">Expiry date</span>
            <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
          </label>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="button" size="sm" className="w-full" disabled={busy || files.length === 0} onClick={upload}>
          <Upload className="size-4" />
          {status ?? (files.length > 1 ? `Upload ${files.length} files` : docs.length ? "Upload another" : "Upload")}
        </Button>
      </div>
    </section>
  );
}
