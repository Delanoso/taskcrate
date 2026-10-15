"use client";

import { useEffect, useState } from "react";
import { StockMoveForm, type StockMovePayload } from "@/components/modules/stock-move-form";
import { StockRegister } from "@/components/modules/stock-register";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, LinkBox, StatusBadge, jsonFetch } from "@/components/modules/ui-bits";
import { SignaturePad } from "@/components/platform/signature-pad";
import { STOCK_UNITS, partyLabels, type StockItemView, type StockKind, type StockUnit } from "@/lib/modules/stock-shared";

const selectClass = "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm";

const MOVE_KINDS = ["issue", "receive", "return", "adjust"] as const;

export function StockAdmin() {
  const [items, setItems] = useState<StockItemView[]>([]);
  const [shortages, setShortages] = useState<StockItemView[]>([]);
  const [loggerName, setLoggerName] = useState("");
  const [selected, setSelected] = useState<StockItemView | null>(null);
  const [adding, setAdding] = useState(false);
  const [origin, setOrigin] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function loadList() {
    const data = await jsonFetch<{ items: StockItemView[]; shortages: StockItemView[]; loggerName: string }>("/api/modules/stock");
    setItems(data.items);
    setShortages(data.shortages);
    setLoggerName(data.loggerName);
  }

  useEffect(() => {
    setOrigin(window.location.origin);
    loadList().catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load stock."));
  }, []);

  async function openItem(id: string) {
    setError(null);
    setAdding(false);
    const data = await jsonFetch<{ item: StockItemView; loggerName: string }>(`/api/modules/stock?id=${id}`);
    setSelected(data.item);
    setLoggerName(data.loggerName);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Every amount is signed by the person it is for and by the person who logs it. The quantity on hand changes only through the register.
        </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => { setAdding(true); setSelected(null); setError(null); }}>Add stock</Button>
            <Button type="button" variant="outline" asChild>
              <a href="/api/modules/stock/export">Download Excel</a>
            </Button>
            <RequisitionButton count={shortages.length} />
          </div>
      </div>

      {error && !selected && !adding && <p className="text-sm text-destructive">{error}</p>}

      {shortages.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
          <p className="font-medium">At or below reorder</p>
          <p>{shortages.map((item) => `${item.name} (${item.quantity} ${item.unit})`).join(" · ")}</p>
        </div>
      )}

      {adding && (
        <AddItemForm
          loggerName={loggerName}
          onCancel={() => setAdding(false)}
          onCreated={(item) => {
            setAdding(false);
            setSelected(item);
            loadList().catch(() => undefined);
          }}
        />
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.length === 0 && <p className="text-sm text-muted-foreground">No stock items yet.</p>}
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => openItem(item.id).catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not open that item."))}
            className={`rounded-xl border bg-card p-4 text-left hover:bg-muted ${selected?.id === item.id ? "border-primary" : ""}`}
          >
            <span className="flex items-start justify-between gap-2">
              <span className="font-medium">{item.name}</span>
              {item.low && <StatusBadge status="low" />}
            </span>
            <span className="mt-1 block text-sm text-muted-foreground">
              {item.quantity} {item.unit} on hand · reorder {item.reorderAt}
            </span>
            <span className="mt-1 block text-xs text-muted-foreground">
              {[item.sku, item.location].filter(Boolean).join(" · ") || "No code or location"}
            </span>
          </button>
        ))}
      </div>

      {selected && (
        <ItemDesk
          item={selected}
          loggerName={loggerName}
          origin={origin}
          onBack={() => setSelected(null)}
          onChange={(item) => {
            setSelected(item);
            loadList().catch(() => undefined);
          }}
        />
      )}
    </div>
  );
}

function RequisitionButton({ count }: { count: number }) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const data = await jsonFetch<{ pdfBase64: string; documentNumber: string }>("/api/modules/stock", {
            method: "POST",
            body: JSON.stringify({ action: "requisition" }),
          });
          const link = document.createElement("a");
          link.href = `data:application/pdf;base64,${data.pdfBase64}`;
          link.download = `${data.documentNumber}.pdf`;
          link.click();
        } finally {
          setBusy(false);
        }
      }}
    >
      Requisition PDF ({count})
    </Button>
  );
}

function AddItemForm({
  loggerName,
  onCancel,
  onCreated,
}: {
  loggerName: string;
  onCancel: () => void;
  onCreated: (item: StockItemView) => void;
}) {
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [unit, setUnit] = useState<StockUnit>("each");
  const [location, setLocation] = useState("");
  const [supplier, setSupplier] = useState("");
  const [quantity, setQuantity] = useState("0");
  const [reorderAt, setReorderAt] = useState("5");
  const [loggedBy, setLoggedBy] = useState(loggerName);
  const [signature, setSignature] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const opening = Number(quantity) > 0;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    if (opening && (loggedBy.trim().length < 2 || !signature)) {
      setError("The person who counted the opening stock must sign.");
      setBusy(false);
      return;
    }
    try {
      const data = await jsonFetch<{ item: StockItemView }>("/api/modules/stock", {
        method: "POST",
        body: JSON.stringify({
          action: "create",
          name: name.trim(),
          sku: sku.trim() || undefined,
          unit,
          location: location.trim() || undefined,
          supplier: supplier.trim() || undefined,
          quantity: Number(quantity),
          reorderAt: Number(reorderAt),
          ...(opening && signature ? { loggedByName: loggedBy.trim(), loggedBySignature: signature } : {}),
        }),
      });
      onCreated(data.item);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add that stock.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle>Add stock</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-3 lg:grid-cols-2">
          <label className="block space-y-1.5 text-sm"><span className="font-medium">Name</span><Input value={name} minLength={2} onChange={(event) => setName(event.target.value)} required placeholder="Grinding discs" /></label>
          <label className="block space-y-1.5 text-sm"><span className="font-medium">Stock code</span><Input value={sku} onChange={(event) => setSku(event.target.value)} /></label>
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium">Unit</span>
            <select className={selectClass} value={unit} onChange={(event) => setUnit(event.target.value as StockUnit)}>
              {STOCK_UNITS.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label className="block space-y-1.5 text-sm"><span className="font-medium">Bin or location</span><Input value={location} onChange={(event) => setLocation(event.target.value)} /></label>
          <label className="block space-y-1.5 text-sm"><span className="font-medium">Supplier</span><Input value={supplier} onChange={(event) => setSupplier(event.target.value)} /></label>
          <label className="block space-y-1.5 text-sm"><span className="font-medium">Reorder when on hand is</span><Input type="number" min={0} step={1} value={reorderAt} onChange={(event) => setReorderAt(event.target.value)} required /></label>
          <label className="block space-y-1.5 text-sm"><span className="font-medium">Opening quantity</span><Input type="number" min={0} step={1} value={quantity} onChange={(event) => setQuantity(event.target.value)} required /></label>
          {opening && (
            <div className="space-y-3 lg:col-span-2">
              <label className="block space-y-1.5 text-sm"><span className="font-medium">Counted and logged by</span><Input value={loggedBy} onChange={(event) => setLoggedBy(event.target.value)} required /></label>
              <div className="space-y-1.5">
                <p className="text-sm font-medium">Signature of the person who counted the opening stock</p>
                <SignaturePad onChange={setSignature} height={120} />
              </div>
            </div>
          )}
          {error && <p className="text-sm text-destructive lg:col-span-2">{error}</p>}
          <div className="flex flex-wrap gap-2 lg:col-span-2">
            <Button type="submit" disabled={busy}>Add</Button>
            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function ItemDesk({
  item,
  loggerName,
  origin,
  onBack,
  onChange,
}: {
  item: StockItemView;
  loggerName: string;
  origin: string;
  onBack: () => void;
  onChange: (item: StockItemView) => void;
}) {
  const [kind, setKind] = useState<Exclude<StockKind, "legacy">>("issue");
  const [formKey, setFormKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  async function saveMove(payload: StockMovePayload) {
    setBusy(true);
    setError(null);
    try {
      const data = await jsonFetch<{ item: StockItemView }>("/api/modules/stock", {
        method: "POST",
        body: JSON.stringify({ action: "move", itemId: item.id, ...payload }),
      });
      setFormKey((value) => value + 1);
      onChange(data.item);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save that entry.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button type="button" variant="outline" onClick={onBack}>Back to stock</Button>
        <Button type="button" variant="outline" onClick={() => setEditing((value) => !value)}>Item details</Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            {item.name}
            {item.low && <StatusBadge status="low" />}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="text-2xl font-semibold">{item.quantity} <span className="text-base font-normal text-muted-foreground">{item.unit} on hand</span></p>
          <p className="text-muted-foreground">
            {[item.sku && `Code ${item.sku}`, item.location && `Location ${item.location}`, item.supplier && `Supplier ${item.supplier}`, `Reorder at ${item.reorderAt}`].filter(Boolean).join(" · ")}
          </p>
          <p className="text-muted-foreground">Past entries stay on the register. Correct a mistake with a return or a stock count.</p>
          {origin && (
            <div>
              <p className="mb-1 font-medium">Bin link for sign-out on a phone</p>
              <LinkBox url={`${origin}/p/stock/${item.publicToken}`} />
            </div>
          )}
        </CardContent>
      </Card>

      {editing && <DetailsForm item={item} onSaved={onChange} />}

      <Card>
        <CardHeader><CardTitle>{partyLabels(kind).title}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {MOVE_KINDS.map((option) => (
              <Button key={option} type="button" size="sm" variant={option === kind ? "default" : "outline"} onClick={() => { setKind(option); setError(null); setFormKey((value) => value + 1); }}>
                {partyLabels(option).title}
              </Button>
            ))}
          </div>
          {kind === "issue" && item.quantity < 1 ? (
            <p className="text-sm text-muted-foreground">Nothing on hand to sign out.</p>
          ) : (
            <StockMoveForm key={`${kind}-${formKey}`} kind={kind} unit={item.unit} loggerName={loggerName} busy={busy} onSubmit={saveMove} />
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Register</CardTitle></CardHeader>
        <CardContent>
          <StockRegister movements={item.movements} unit={item.unit} />
        </CardContent>
      </Card>
    </div>
  );
}

function DetailsForm({ item, onSaved }: { item: StockItemView; onSaved: (item: StockItemView) => void }) {
  const [name, setName] = useState(item.name);
  const [sku, setSku] = useState(item.sku ?? "");
  const [unit, setUnit] = useState<StockUnit>(STOCK_UNITS.includes(item.unit as StockUnit) ? item.unit as StockUnit : "each");
  const [location, setLocation] = useState(item.location ?? "");
  const [supplier, setSupplier] = useState(item.supplier ?? "");
  const [reorderAt, setReorderAt] = useState(String(item.reorderAt));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data = await jsonFetch<{ item: StockItemView }>("/api/modules/stock", {
        method: "POST",
        body: JSON.stringify({
          action: "details",
          itemId: item.id,
          name: name.trim(),
          sku: sku.trim() || null,
          unit,
          location: location.trim() || null,
          supplier: supplier.trim() || null,
          reorderAt: Number(reorderAt),
        }),
      });
      onSaved(data.item);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the item.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle>Item details</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1.5 text-sm"><span className="font-medium">Name</span><Input value={name} minLength={2} onChange={(event) => setName(event.target.value)} required /></label>
          <label className="block space-y-1.5 text-sm"><span className="font-medium">Stock code</span><Input value={sku} onChange={(event) => setSku(event.target.value)} /></label>
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium">Unit</span>
            <select className={selectClass} value={unit} onChange={(event) => setUnit(event.target.value as StockUnit)}>
              {STOCK_UNITS.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label className="block space-y-1.5 text-sm"><span className="font-medium">Bin or location</span><Input value={location} onChange={(event) => setLocation(event.target.value)} /></label>
          <label className="block space-y-1.5 text-sm"><span className="font-medium">Supplier</span><Input value={supplier} onChange={(event) => setSupplier(event.target.value)} /></label>
          <label className="block space-y-1.5 text-sm"><span className="font-medium">Reorder when on hand is</span><Input type="number" min={0} step={1} value={reorderAt} onChange={(event) => setReorderAt(event.target.value)} required /></label>
          <p className="text-sm text-muted-foreground sm:col-span-2">The quantity on hand is not edited here. It changes when stock is signed out, received, returned, or counted.</p>
          {error && <p className="text-sm text-destructive sm:col-span-2">{error}</p>}
          <div><Button type="submit" disabled={busy}>Save details</Button></div>
        </form>
      </CardContent>
    </Card>
  );
}
