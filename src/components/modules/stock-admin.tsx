"use client";

import { useEffect, useState } from "react";
import { Button, Input, Card, CardContent, CardHeader, CardTitle, LinkBox, jsonFetch } from "@/components/modules/ui-bits";

export function StockAdmin() {
  const [items, setItems] = useState<any[]>([]);
  const [shortages, setShortages] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("20");
  const appUrl = typeof window !== "undefined" ? window.location.origin : "";

  async function load() {
    const d = await jsonFetch("/api/modules/stock");
    setItems(d.items); setShortages(d.shortages);
  }
  useEffect(() => { load().catch(console.error); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    await jsonFetch("/api/modules/stock", {
      method: "POST",
      body: JSON.stringify({ action: "create", name, quantity: Number(quantity), reorderAt: 5 }),
    });
    setName(""); load();
  }

  async function scanOut(itemId: string) {
    await jsonFetch("/api/modules/stock", {
      method: "POST",
      body: JSON.stringify({ action: "scan_out", itemId, qty: 1 }),
    });
    load();
  }

  async function requisition() {
    const d = await jsonFetch("/api/modules/stock", {
      method: "POST",
      body: JSON.stringify({ action: "requisition" }),
    });
    const a = document.createElement("a");
    a.href = `data:application/pdf;base64,${d.pdfBase64}`;
    a.download = `${d.documentNumber}.pdf`;
    a.click();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Add consumable</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={create} className="flex flex-wrap gap-2">
            <Input className="max-w-xs" placeholder="Grinding discs" value={name} onChange={(e) => setName(e.target.value)} required />
            <Input className="w-24" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            <Button type="submit">Add</Button>
            <Button type="button" variant="outline" onClick={requisition}>Generate requisition PDF ({shortages.length})</Button>
          </form>
        </CardContent>
      </Card>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((i) => (
          <Card key={i.id}>
            <CardHeader><CardTitle className="text-base">{i.name}</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>Qty {i.quantity} · reorder {i.reorderAt}</p>
              <LinkBox url={`${appUrl}/p/stock/${i.publicToken}`} />
              <Button size="sm" onClick={() => scanOut(i.id)}>Scan out 1</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
