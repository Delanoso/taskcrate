"use client";

import { useEffect, useState } from "react";
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle, jsonFetch } from "@/components/modules/ui-bits";
import { SignaturePad } from "@/components/platform/signature-pad";
import { PhotoInput } from "@/components/modules/photo-input";

function useEquipment() {
  const [items, setItems] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  async function load() {
    const d = await jsonFetch("/api/modules/equipment");
    setItems(d.items); setLogs(d.logs);
  }
  useEffect(() => { load().catch(console.error); }, []);
  return { items, logs, load };
}

export function EquipmentAdmin() {
  const { items, logs, load } = useEquipment();
  const [name, setName] = useState("");
  const [itemId, setItemId] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [signature, setSignature] = useState<string | null>(null);

  async function createItem(e: React.FormEvent) {
    e.preventDefault();
    await jsonFetch("/api/modules/equipment", { method: "POST", body: JSON.stringify({ action: "create_item", name }) });
    setName(""); load();
  }

  async function issue(e: React.FormEvent) {
    e.preventDefault();
    if (!signature) return alert("Signature required");
    await jsonFetch("/api/modules/equipment", {
      method: "POST",
      body: JSON.stringify({ action: "issue", itemId, employeeName, signatureData: signature }),
    });
    setEmployeeName(""); setSignature(null); load();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Add equipment</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={createItem} className="flex gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Laptop / tool / keys" required />
            <Button type="submit">Add</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Issue with custody signature</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={issue} className="space-y-3">
            <select className="h-9 w-full rounded-md border px-2 text-sm" value={itemId} onChange={(e) => setItemId(e.target.value)} required>
              <option value="">Select available item</option>
              {items.filter((i) => i.status === "available").map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
            <Input value={employeeName} onChange={(e) => setEmployeeName(e.target.value)} placeholder="Employee name" required />
            <SignaturePad onChange={setSignature} />
            <Button type="submit">Issue</Button>
          </form>
        </CardContent>
      </Card>
      <Card className="lg:col-span-2">
        <CardHeader><CardTitle>Custody log</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-2">
          {logs.map((l) => (
            <div key={l.id} className="border-b py-2">{l.action} · {l.employeeName} · {new Date(l.createdAt).toLocaleString()}</div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export function EquipmentHandbackAdmin() {
  const { items, logs, load } = useEquipment();
  const [itemId, setItemId] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [conditionNotes, setConditionNotes] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);

  async function handback(e: React.FormEvent) {
    e.preventDefault();
    await jsonFetch("/api/modules/equipment", {
      method: "POST",
      body: JSON.stringify({
        action: "handback",
        itemId,
        employeeName,
        conditionNotes,
        damagePhotoDataUrl: photo ?? undefined,
        signatureData: signature ?? undefined,
      }),
    });
    setEmployeeName(""); setConditionNotes(""); setPhoto(null); setSignature(null); load();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Handback inspection</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handback} className="space-y-3">
            <select className="h-9 w-full rounded-md border px-2 text-sm" value={itemId} onChange={(e) => setItemId(e.target.value)} required>
              <option value="">Select issued item</option>
              {items.filter((i) => i.status === "issued").map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
            <Input value={employeeName} onChange={(e) => setEmployeeName(e.target.value)} placeholder="Returning employee" required />
            <textarea className="min-h-20 w-full rounded-md border p-2 text-sm" placeholder="Condition notes" value={conditionNotes} onChange={(e) => setConditionNotes(e.target.value)} />
            <PhotoInput label="Damage photo (if any)" onChange={setPhoto} />
            <SignaturePad onChange={setSignature} />
            <Button type="submit">Check back into inventory</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Recent handbacks</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-2">
          {logs.filter((l) => l.action === "handback").map((l) => (
            <div key={l.id} className="border-b py-2">{l.employeeName} · {l.conditionNotes || "OK"} · {new Date(l.createdAt).toLocaleString()}</div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
