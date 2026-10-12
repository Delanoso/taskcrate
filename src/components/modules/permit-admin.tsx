"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Button,
  Input,
  Label,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  StatusBadge,
  LinkBox,
  jsonFetch,
} from "@/components/modules/ui-bits";

type Item = {
  id: string;
  title: string;
  status: string;
  publicToken: string;
  contractorName?: string | null;
  contractorPhone?: string | null;
  workDetails?: string | null;
  completionNotes?: string | null;
  areaPhotoUrl?: string | null;
  equipmentPhotoUrl?: string | null;
  completionPhotoUrl?: string | null;
  documentNumber?: string | null;
  updatedAt?: string;
};

function downloadPdfBase64(base64: string, filename: string) {
  const a = document.createElement("a");
  a.href = `data:application/pdf;base64,${base64}`;
  a.download = filename;
  a.click();
}

export function PermitAdmin() {
  const [items, setItems] = useState<Item[]>([]);
  const [title, setTitle] = useState("");
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const appUrl = typeof window !== "undefined" ? window.location.origin : "";

  const load = useCallback(async () => {
    const data = await jsonFetch("/api/modules/permit");
    setItems(data.items);
  }, []);

  useEffect(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : "Failed to load permits"));
    const id = window.setInterval(() => {
      load().catch(() => undefined);
    }, 4000);
    return () => window.clearInterval(id);
  }, [load]);

  const pending = items.filter((i) => i.status === "submitted");
  const readyToClose = items.filter((i) => i.status === "completed" || i.status === "approved");

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const data = await jsonFetch("/api/modules/permit", {
        method: "POST",
        body: JSON.stringify({ title }),
      });
      const url = `${appUrl}/p/permit/${data.item.publicToken}`;
      setCreatedUrl(url);
      setTitle("");
      setMessage("Contractor link ready — share it via WhatsApp.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create permit");
    }
  }

  async function setStatus(id: string, status: "approved" | "closed") {
    setBusyId(id);
    setError(null);
    setMessage(null);
    try {
      const data = await jsonFetch("/api/modules/permit", {
        method: "PATCH",
        body: JSON.stringify({ id, status }),
      });
      if (status === "approved") {
        setMessage("Approved. Ask the contractor to open the same link and upload completion photos.");
      } else {
        const docNum = data.pdf?.documentNumber as string | undefined;
        if (data.pdfBytesBase64 && docNum) {
          downloadPdfBase64(data.pdfBytesBase64, `${docNum}.pdf`);
        }
        setMessage(
          docNum
            ? `Closed. PDF downloaded as ${docNum}. You can download it again anytime from this list.`
            : "Permit closed.",
        );
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      {pending.length > 0 && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
          <strong>{pending.length}</strong> permit{pending.length === 1 ? "" : "s"} waiting for
          your approval below.
        </div>
      )}
      {readyToClose.some((i) => i.status === "completed") && (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm">
          Completion evidence received — close the permit to file the PDF.
        </div>
      )}
      {message && (
        <div className="rounded-lg border bg-muted px-4 py-3 text-sm">{message}</div>
      )}
      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Send permit link</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={create} className="space-y-3">
              <div className="space-y-2">
                <Label>Permit title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>
              <Button type="submit">Create & get contractor link</Button>
              {createdUrl && <LinkBox url={createdUrl} />}
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Permits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.length === 0 && (
              <p className="text-sm text-muted-foreground">No permits yet. Create one to start.</p>
            )}
            {items.map((i) => {
              const publicUrl = `${appUrl}/p/permit/${i.publicToken}`;
              return (
                <div key={i.id} className="space-y-2 rounded-md border p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{i.title}</span>
                    <StatusBadge status={i.status} />
                  </div>
                  {i.documentNumber && (
                    <p className="text-xs text-muted-foreground">Filed as {i.documentNumber}</p>
                  )}
                  {i.contractorName && (
                    <p className="text-muted-foreground">
                      {i.contractorName}
                      {i.contractorPhone ? ` · ${i.contractorPhone}` : ""}
                    </p>
                  )}
                  {i.workDetails && <p className="text-muted-foreground">{i.workDetails}</p>}
                  {(i.areaPhotoUrl || i.equipmentPhotoUrl || i.completionPhotoUrl) && (
                    <div className="flex flex-wrap gap-2">
                      {i.areaPhotoUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={i.areaPhotoUrl}
                          alt="Work area"
                          className="h-16 w-16 rounded object-cover"
                        />
                      )}
                      {i.equipmentPhotoUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={i.equipmentPhotoUrl}
                          alt="Safety equipment"
                          className="h-16 w-16 rounded object-cover"
                        />
                      )}
                      {i.completionPhotoUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={i.completionPhotoUrl}
                          alt="Completion"
                          className="h-16 w-16 rounded object-cover"
                        />
                      )}
                    </div>
                  )}
                  {i.completionNotes && (
                    <p className="text-muted-foreground">Completion: {i.completionNotes}</p>
                  )}
                  <LinkBox url={publicUrl} />
                  <div className="mt-2 flex flex-wrap gap-2">
                    {i.status === "submitted" && (
                      <Button
                        size="sm"
                        disabled={busyId === i.id}
                        onClick={() => setStatus(i.id, "approved")}
                      >
                        {busyId === i.id ? "Approving…" : "Approve"}
                      </Button>
                    )}
                    {(i.status === "approved" || i.status === "completed") && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === i.id || i.status === "approved"}
                        onClick={() => setStatus(i.id, "closed")}
                        title={
                          i.status === "approved"
                            ? "Waiting for contractor completion photos"
                            : undefined
                        }
                      >
                        {i.status === "approved"
                          ? "Waiting for completion"
                          : busyId === i.id
                            ? "Closing…"
                            : "Close + PDF"}
                      </Button>
                    )}
                    {i.status === "closed" && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={`/api/modules/permit/${i.id}/pdf`} target="_blank" rel="noreferrer">
                          {i.documentNumber ? `Download ${i.documentNumber}` : "Download PDF"}
                        </a>
                      </Button>
                    )}
                    <Button size="sm" variant="secondary" asChild>
                      <a
                        href={`https://wa.me/${(i.contractorPhone || "").replace(/\D/g, "")}?text=${encodeURIComponent(
                          i.status === "approved"
                            ? `Your permit “${i.title}” is approved. Upload completion photos: ${publicUrl}`
                            : `Please complete this Permit to Work: ${publicUrl}`,
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        WhatsApp
                      </a>
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
