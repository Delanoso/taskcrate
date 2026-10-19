"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, StatusBadge, jsonFetch } from "@/components/modules/ui-bits";
import { CURRENCIES, formatMoney, priceTotals, todayIso, type LineInput } from "@/lib/modules/billing-shared";

type Line = { description: string; quantity: string; unit: string; unitPrice: string };
type ProfileForm = {
  legalName: string;
  tradingName: string;
  registrationNumber: string;
  vatRegistered: boolean;
  vatNumber: string;
  vatPercent: string;
  address: string;
  email: string;
  phone: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  branchCode: string;
  accountType: string;
  defaultCurrency: string;
  paymentTermsDays: string;
  quoteValidDays: string;
  terms: string;
  footerNote: string;
};
type DocForm = {
  id?: string;
  kind: "QUOTE" | "INVOICE";
  templateName: string;
  currency: string;
  chargeVat: boolean;
  clientName: string;
  clientCompany: string;
  clientEmail: string;
  clientPhone: string;
  clientAddress: string;
  clientVatNumber: string;
  issueDate: string;
  dueDate: string;
  theirReference: string;
  notes: string;
  terms: string;
  lines: Line[];
};
type Template = { id: string; custom: boolean; name: string; notes: string; terms: string; lines: LineInput[] };
type DocumentRow = DocForm & {
  id: string;
  number: string;
  status: string;
  subtotalCents: number;
  vatCents: number;
  totalCents: number;
  paidOn: string | null;
  paymentMethod: string | null;
  paymentReference: string | null;
  invoiceNumber: string | null;
  lines: LineInput[];
};
type Snapshot = { profile: ProfileForm & { vatRegistered: boolean } | null; templates: Template[]; documents: DocumentRow[] };

const field = "h-9 w-full rounded-md border bg-background px-2 text-sm";
const area = "min-h-16 w-full rounded-md border bg-background p-2 text-sm";

function blankLine(): Line {
  return { description: "", quantity: "1", unit: "each", unitPrice: "" };
}

function emptyProfile(): ProfileForm {
  return {
    legalName: "",
    tradingName: "",
    registrationNumber: "",
    vatRegistered: false,
    vatNumber: "",
    vatPercent: "15",
    address: "",
    email: "",
    phone: "",
    bankName: "",
    accountName: "",
    accountNumber: "",
    branchCode: "",
    accountType: "Cheque",
    defaultCurrency: "ZAR",
    paymentTermsDays: "30",
    quoteValidDays: "14",
    terms: "Payment is due on the date shown. Please use the document number as the payment reference.",
    footerNote: "",
  };
}

function profileFrom(profile: NonNullable<Snapshot["profile"]>): ProfileForm {
  return {
    legalName: profile.legalName ?? "",
    tradingName: profile.tradingName ?? "",
    registrationNumber: profile.registrationNumber ?? "",
    vatRegistered: Boolean(profile.vatRegistered),
    vatNumber: profile.vatNumber ?? "",
    vatPercent: String(profile.vatPercent ?? 15),
    address: profile.address ?? "",
    email: profile.email ?? "",
    phone: profile.phone ?? "",
    bankName: profile.bankName ?? "",
    accountName: profile.accountName ?? "",
    accountNumber: profile.accountNumber ?? "",
    branchCode: profile.branchCode ?? "",
    accountType: profile.accountType ?? "Cheque",
    defaultCurrency: profile.defaultCurrency ?? "ZAR",
    paymentTermsDays: String(profile.paymentTermsDays ?? 30),
    quoteValidDays: String(profile.quoteValidDays ?? 14),
    terms: profile.terms ?? "",
    footerNote: profile.footerNote ?? "",
  };
}

function freshDocument(profile: ProfileForm | null): DocForm {
  return {
    kind: "QUOTE",
    templateName: "",
    currency: profile?.defaultCurrency || "ZAR",
    chargeVat: Boolean(profile?.vatRegistered),
    clientName: "",
    clientCompany: "",
    clientEmail: "",
    clientPhone: "",
    clientAddress: "",
    clientVatNumber: "",
    issueDate: todayIso(),
    dueDate: "",
    theirReference: "",
    notes: "",
    terms: profile?.terms ?? "",
    lines: [blankLine()],
  };
}

export function BillingAdmin() {
  const [panel, setPanel] = useState<"setup" | "new" | "book">("setup");
  const [profile, setProfile] = useState<ProfileForm>(emptyProfile());
  const [hasProfile, setHasProfile] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [doc, setDoc] = useState<DocForm>(freshDocument(null));
  const [templateName, setTemplateName] = useState("");
  const [paying, setPaying] = useState({ id: "", paidOn: todayIso(), method: "EFT", reference: "" });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    const data = await jsonFetch<Snapshot>("/api/modules/billing");
    setTemplates(data.templates);
    setDocuments(data.documents);
    setHasProfile(Boolean(data.profile));
    if (data.profile) setProfile(profileFrom(data.profile));
    return data;
  }

  useEffect(() => {
    load()
      .then((data) => {
        if (data.profile) setPanel("new");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load"));
  }, []);

  const preview = useMemo(() => {
    const lines = doc.lines.map((line) => ({
      description: line.description,
      quantity: Number(line.quantity) || 0,
      unit: line.unit,
      unitPrice: Number(line.unitPrice) || 0,
    }));
    return priceTotals(lines, profile.vatRegistered && doc.chargeVat, Number(profile.vatPercent) || 0);
  }, [doc.lines, doc.chargeVat, profile.vatRegistered, profile.vatPercent]);

  async function run(body: unknown, ok: string) {
    setError(null);
    await jsonFetch("/api/modules/billing", { method: "POST", body: JSON.stringify(body) });
    await load();
    setNotice(ok);
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    try {
      await run(
        {
          action: "profile",
          ...profile,
          vatPercent: Number(profile.vatPercent),
          paymentTermsDays: Number(profile.paymentTermsDays),
          quoteValidDays: Number(profile.quoteValidDays),
        },
        "Company details saved.",
      );
      setDoc((current) => ({ ...current, currency: profile.defaultCurrency, terms: current.terms || profile.terms, chargeVat: profile.vatRegistered }));
      setPanel("new");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    }
  }

  function applyTemplate(id: string) {
    const template = templates.find((item) => item.id === id);
    if (!template) return;
    setDoc((current) => ({
      ...current,
      templateName: template.name,
      notes: template.notes,
      terms: template.terms || current.terms,
      lines: template.lines.map((line) => ({
        description: line.description,
        quantity: String(line.quantity),
        unit: line.unit,
        unitPrice: line.unitPrice ? String(line.unitPrice) : "",
      })),
    }));
  }

  async function saveDocument(e: React.FormEvent) {
    e.preventDefault();
    try {
      await run(
        {
          action: "document",
          ...doc,
          lines: doc.lines.map((line) => ({
            description: line.description,
            quantity: Number(line.quantity),
            unit: line.unit,
            unitPrice: Number(line.unitPrice),
          })),
        },
        doc.id ? "Document updated." : doc.kind === "QUOTE" ? "Quotation created." : "Invoice created.",
      );
      if (!doc.id) {
        setDoc(freshDocument(profile));
        setPanel("book");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the document");
    }
  }

  async function saveTemplate() {
    try {
      await run(
        {
          action: "template",
          name: templateName,
          notes: doc.notes,
          terms: doc.terms,
          lines: doc.lines.map((line) => ({
            description: line.description,
            quantity: Number(line.quantity),
            unit: line.unit,
            unitPrice: Number(line.unitPrice),
          })),
        },
        "Template saved.",
      );
      setTemplateName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the template");
    }
  }

  function edit(row: DocumentRow) {
    setDoc({
      id: row.id,
      kind: row.kind,
      templateName: row.templateName,
      currency: row.currency,
      chargeVat: row.chargeVat,
      clientName: row.clientName,
      clientCompany: row.clientCompany,
      clientEmail: row.clientEmail,
      clientPhone: row.clientPhone,
      clientAddress: row.clientAddress,
      clientVatNumber: row.clientVatNumber,
      issueDate: row.issueDate,
      dueDate: row.dueDate,
      theirReference: row.theirReference,
      notes: row.notes,
      terms: row.terms,
      lines: row.lines.map((line) => ({
        description: line.description,
        quantity: String(line.quantity),
        unit: line.unit,
        unitPrice: String(line.unitPrice),
      })),
    });
    setPanel("new");
    setNotice(null);
  }

  async function act(body: unknown, ok: string) {
    try {
      await run(body, ok);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(["setup", "new", "book"] as const).map((item) => (
          <Button key={item} type="button" size="sm" variant={panel === item ? "default" : "outline"} onClick={() => setPanel(item)}>
            {item === "setup" ? "Company setup" : item === "new" ? "New document" : "Quote and invoice book"}
          </Button>
        ))}
        <Button size="sm" variant="outline" asChild>
          <a href="/api/modules/billing/export">Download Excel</a>
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {notice && <p className="text-sm text-green-700">{notice}</p>}

      {panel === "setup" && (
        <Card>
          <CardHeader>
            <CardTitle>Company, bank and VAT</CardTitle>
            <CardDescription>
              These details print on every quotation and invoice. Turn VAT on only if the company is registered. The rate starts at 15%.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveProfile} className="grid gap-3 sm:grid-cols-2">
              <Label className="space-y-1">Legal name<Input value={profile.legalName} onChange={(e) => setProfile((p) => ({ ...p, legalName: e.target.value  }))} required /></Label>
              <Label className="space-y-1">Trading name<Input value={profile.tradingName} onChange={(e) => setProfile((p) => ({ ...p, tradingName: e.target.value  }))} /></Label>
              <Label className="space-y-1">Registration number<Input value={profile.registrationNumber} onChange={(e) => setProfile((p) => ({ ...p, registrationNumber: e.target.value  }))} /></Label>
              <Label className="space-y-1">Email<Input value={profile.email} onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value  }))} /></Label>
              <Label className="space-y-1">Phone<Input value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value  }))} /></Label>
              <Label className="space-y-1 sm:col-span-2">Address<textarea className={area} value={profile.address} onChange={(e) => setProfile((p) => ({ ...p, address: e.target.value  }))} /></Label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={profile.vatRegistered} onChange={(e) => setProfile((p) => ({ ...p, vatRegistered: e.target.checked  }))} />
                VAT registered
              </label>
              <Label className="space-y-1">VAT number<Input value={profile.vatNumber} onChange={(e) => setProfile((p) => ({ ...p, vatNumber: e.target.value  }))} /></Label>
              <Label className="space-y-1">VAT percent<Input type="number" min="0" max="30" step="0.01" value={profile.vatPercent} onChange={(e) => setProfile((p) => ({ ...p, vatPercent: e.target.value  }))} /></Label>
              <Label className="space-y-1">Default currency
                <select className={field} value={profile.defaultCurrency} onChange={(e) => setProfile((p) => ({ ...p, defaultCurrency: e.target.value  }))}>
                  {CURRENCIES.map((currency) => <option key={currency.code} value={currency.code}>{currency.name} ({currency.code})</option>)}
                </select>
              </Label>
              <Label className="space-y-1">Bank<Input value={profile.bankName} onChange={(e) => setProfile((p) => ({ ...p, bankName: e.target.value  }))} /></Label>
              <Label className="space-y-1">Account name<Input value={profile.accountName} onChange={(e) => setProfile((p) => ({ ...p, accountName: e.target.value  }))} /></Label>
              <Label className="space-y-1">Account number<Input value={profile.accountNumber} onChange={(e) => setProfile((p) => ({ ...p, accountNumber: e.target.value  }))} /></Label>
              <Label className="space-y-1">Branch code<Input value={profile.branchCode} onChange={(e) => setProfile((p) => ({ ...p, branchCode: e.target.value  }))} /></Label>
              <Label className="space-y-1">Account type<Input value={profile.accountType} onChange={(e) => setProfile((p) => ({ ...p, accountType: e.target.value  }))} /></Label>
              <Label className="space-y-1">Payment terms (days)<Input type="number" min="0" value={profile.paymentTermsDays} onChange={(e) => setProfile((p) => ({ ...p, paymentTermsDays: e.target.value  }))} /></Label>
              <Label className="space-y-1">Quote valid for (days)<Input type="number" min="1" value={profile.quoteValidDays} onChange={(e) => setProfile((p) => ({ ...p, quoteValidDays: e.target.value  }))} /></Label>
              <Label className="space-y-1 sm:col-span-2">Standard terms<textarea className={area} value={profile.terms} onChange={(e) => setProfile((p) => ({ ...p, terms: e.target.value  }))} /></Label>
              <Label className="space-y-1 sm:col-span-2">Footer note<textarea className={area} value={profile.footerNote} onChange={(e) => setProfile((p) => ({ ...p, footerNote: e.target.value  }))} /></Label>
              <Button type="submit">Save company details</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {panel === "new" && (
        <Card>
          <CardHeader>
            <CardTitle>{doc.id ? "Edit document" : "New quotation or invoice"}</CardTitle>
            <CardDescription>
              {hasProfile ? "Pick a template, choose the currency, and the totals include VAT when it is switched on." : "Save the company details first."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveDocument} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Label className="space-y-1">Template
                  <select className={field} value={templates.find((item) => item.name === doc.templateName)?.id ?? ""} onChange={(e) => applyTemplate(e.target.value)}>
                    <option value="">Blank</option>
                    {templates.map((template) => <option key={template.id} value={template.id}>{template.name}{template.custom ? " (yours)" : ""}</option>)}
                  </select>
                </Label>
                <Label className="space-y-1">Document
                  <select className={field} value={doc.kind} disabled={Boolean(doc.id)} onChange={(e) => setDoc((d) => ({ ...d, kind: e.target.value as DocForm["kind"]  }))}>
                    <option value="QUOTE">Quotation</option>
                    <option value="INVOICE">Invoice</option>
                  </select>
                </Label>
                <Label className="space-y-1">Currency
                  <select className={field} value={doc.currency} onChange={(e) => setDoc((d) => ({ ...d, currency: e.target.value  }))}>
                    {CURRENCIES.map((currency) => <option key={currency.code} value={currency.code}>{currency.code}</option>)}
                  </select>
                </Label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={doc.chargeVat} disabled={!profile.vatRegistered} onChange={(e) => setDoc((d) => ({ ...d, chargeVat: e.target.checked  }))} />
                  Charge VAT{profile.vatRegistered ? ` at ${profile.vatPercent}%` : " (switch it on in company setup)"}
                </label>
                <Label className="space-y-1">Client name<Input value={doc.clientName} onChange={(e) => setDoc((d) => ({ ...d, clientName: e.target.value  }))} required /></Label>
                <Label className="space-y-1">Client company<Input value={doc.clientCompany} onChange={(e) => setDoc((d) => ({ ...d, clientCompany: e.target.value  }))} /></Label>
                <Label className="space-y-1">Client email<Input value={doc.clientEmail} onChange={(e) => setDoc((d) => ({ ...d, clientEmail: e.target.value  }))} /></Label>
                <Label className="space-y-1">Client phone<Input value={doc.clientPhone} onChange={(e) => setDoc((d) => ({ ...d, clientPhone: e.target.value  }))} /></Label>
                <Label className="space-y-1 sm:col-span-2">Client address<textarea className={area} value={doc.clientAddress} onChange={(e) => setDoc((d) => ({ ...d, clientAddress: e.target.value  }))} /></Label>
                <Label className="space-y-1">Client VAT number<Input value={doc.clientVatNumber} onChange={(e) => setDoc((d) => ({ ...d, clientVatNumber: e.target.value  }))} /></Label>
                <Label className="space-y-1">Their reference<Input value={doc.theirReference} onChange={(e) => setDoc((d) => ({ ...d, theirReference: e.target.value  }))} /></Label>
                <Label className="space-y-1">Issue date<Input type="date" value={doc.issueDate} onChange={(e) => setDoc((d) => ({ ...d, issueDate: e.target.value  }))} required /></Label>
                <Label className="space-y-1">{doc.kind === "QUOTE" ? "Valid until" : "Due date"}<Input type="date" value={doc.dueDate} onChange={(e) => setDoc((d) => ({ ...d, dueDate: e.target.value  }))} /></Label>
              </div>
              <div className="space-y-2">
                {doc.lines.map((line, index) => (
                  <div key={index} className="grid gap-2 sm:grid-cols-[1fr_90px_90px_120px_auto]">
                    <Input placeholder="Description" value={line.description} onChange={(e) => setDoc((current) => ({ ...current, lines: current.lines.map((item, i) => i === index ? { ...item, description: e.target.value } : item) }))} required />
                    <Input type="number" min="0.01" step="0.01" placeholder="Qty" value={line.quantity} onChange={(e) => setDoc((current) => ({ ...current, lines: current.lines.map((item, i) => i === index ? { ...item, quantity: e.target.value } : item) }))} required />
                    <Input placeholder="Unit" value={line.unit} onChange={(e) => setDoc((current) => ({ ...current, lines: current.lines.map((item, i) => i === index ? { ...item, unit: e.target.value } : item) }))} />
                    <Input type="number" min="0" step="0.01" placeholder="Price" value={line.unitPrice} onChange={(e) => setDoc((current) => ({ ...current, lines: current.lines.map((item, i) => i === index ? { ...item, unitPrice: e.target.value } : item) }))} required />
                    {doc.lines.length > 1 && (
                      <Button type="button" variant="outline" size="sm" onClick={() => setDoc((current) => ({ ...current, lines: current.lines.filter((_, i) => i !== index) }))}>Remove</Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => setDoc((current) => ({ ...current, lines: [...current.lines, blankLine()] }))}>Add a line</Button>
              </div>
              <p className="text-sm">
                Subtotal {formatMoney(preview.subtotalCents, doc.currency)}
                {profile.vatRegistered && doc.chargeVat ? ` · VAT ${formatMoney(preview.vatCents, doc.currency)}` : ""}
                {" · "}Total {formatMoney(preview.totalCents, doc.currency)}
              </p>
              <Label className="space-y-1">Notes<textarea className={area} value={doc.notes} onChange={(e) => setDoc((d) => ({ ...d, notes: e.target.value  }))} /></Label>
              <Label className="space-y-1">Terms<textarea className={area} value={doc.terms} onChange={(e) => setDoc((d) => ({ ...d, terms: e.target.value  }))} /></Label>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={!hasProfile}>{doc.id ? "Save changes" : doc.kind === "QUOTE" ? "Create quotation" : "Create invoice"}</Button>
                {doc.id && <Button type="button" variant="outline" onClick={() => { setDoc(freshDocument(profile)); setNotice(null); }}>Start a new one</Button>}
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <Label className="space-y-1">Save these lines as a template<Input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="Template name" /></Label>
                <Button type="button" variant="outline" onClick={saveTemplate}>Save template</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {panel === "book" && (
        <Card>
          <CardHeader>
            <CardTitle>Quote and invoice book</CardTitle>
            <CardDescription>Download each one as a PDF. A quotation can become an invoice. An invoice is unpaid until you mark it paid.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {templates.some((template) => template.custom) && (
              <div className="flex flex-wrap gap-2 text-sm">
                {templates.filter((template) => template.custom).map((template) => (
                  <span key={template.id} className="inline-flex items-center gap-2 rounded-md border px-2 py-1">
                    {template.name}
                    <button type="button" className="text-xs underline" onClick={() => act({ action: "delete_template", id: template.id }, "Template removed.")}>Remove</button>
                  </span>
                ))}
              </div>
            )}
            {documents.length === 0 && <p className="text-sm text-muted-foreground">No quotations or invoices yet.</p>}
            {documents.map((row) => (
              <div key={row.id} className="space-y-2 rounded-md border p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{row.number} · {row.clientName}</span>
                  <StatusBadge status={row.status} />
                </div>
                <p className="text-muted-foreground">
                  {row.kind === "QUOTE" ? "Quotation" : "Invoice"} · {row.currency} · {formatMoney(row.totalCents, row.currency)} · issued {row.issueDate}
                  {row.dueDate ? ` · due ${row.dueDate}` : ""}
                  {row.paidOn ? ` · paid ${row.paidOn}${row.paymentReference ? ` (${row.paymentReference})` : ""}` : ""}
                  {row.invoiceNumber ? ` · invoice ${row.invoiceNumber}` : ""}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" asChild><a href={`/api/modules/billing/${row.id}/pdf`} target="_blank" rel="noreferrer">Download PDF</a></Button>
                  <Button size="sm" variant="outline" onClick={async () => {
                    setError(null);
                    try {
                      const sent = await jsonFetch<{ url: string; waUrl: string; emailed: boolean; hasPhone: boolean }>("/api/modules/billing", { method: "POST", body: JSON.stringify({ action: "send", id: row.id }) });
                      await load();
                      if (sent.hasPhone) window.open(sent.waUrl, "_blank", "noopener");
                      setNotice(sent.emailed ? `Emailed to ${row.clientEmail}.` : sent.hasPhone ? "WhatsApp is open with the link." : `Copy this link for the client: ${sent.url}`);
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Could not send");
                    }
                  }}>Email / WhatsApp</Button>
                  {row.status !== "PAID" && <Button size="sm" variant="outline" onClick={() => edit(row)}>Edit</Button>}
                  {row.kind === "QUOTE" && row.status !== "SENT" && row.status !== "ACCEPTED" && row.status !== "DECLINED" && (
                    <Button size="sm" variant="outline" onClick={() => act({ action: "status", id: row.id, status: "SENT" }, "Marked as sent.")}>Mark sent</Button>
                  )}
                  {row.kind === "QUOTE" && row.status !== "ACCEPTED" && row.status !== "DECLINED" && (
                    <Button size="sm" variant="outline" onClick={() => act({ action: "status", id: row.id, status: "ACCEPTED" }, "Marked as accepted.")}>Mark accepted</Button>
                  )}
                  {row.kind === "QUOTE" && row.status !== "DECLINED" && !row.invoiceNumber && (
                    <Button size="sm" variant="outline" onClick={() => act({ action: "status", id: row.id, status: "DECLINED" }, "Marked as declined.")}>Mark declined</Button>
                  )}
                  {row.kind === "QUOTE" && row.status !== "DECLINED" && !row.invoiceNumber && (
                    <Button size="sm" onClick={() => act({ action: "convert", id: row.id }, "Invoice created.")}>Turn into an invoice</Button>
                  )}
                  {row.kind === "INVOICE" && row.status !== "PAID" && (
                    <Button size="sm" onClick={() => setPaying({ id: row.id, paidOn: todayIso(), method: "EFT", reference: "" })}>Mark paid</Button>
                  )}
                  {row.kind === "INVOICE" && row.status === "PAID" && (
                    <Button size="sm" variant="outline" onClick={() => act({ action: "status", id: row.id, status: "UNPAID" }, "Marked as unpaid.")}>Mark unpaid</Button>
                  )}
                </div>
                {paying.id === row.id && (
                  <form
                    className="grid gap-2 sm:grid-cols-4"
                    onSubmit={(e) => {
                      e.preventDefault();
                      act({ action: "status", id: row.id, status: "PAID", paidOn: paying.paidOn, paymentMethod: paying.method, paymentReference: paying.reference }, "Marked as paid.");
                      setPaying({ id: "", paidOn: todayIso(), method: "EFT", reference: "" });
                    }}
                  >
                    <Input type="date" value={paying.paidOn} onChange={(e) => setPaying((pay) => ({ ...pay, paidOn: e.target.value  }))} required />
                    <select className={field} value={paying.method} onChange={(e) => setPaying((pay) => ({ ...pay, method: e.target.value  }))}>
                      <option>EFT</option>
                      <option>Cash</option>
                      <option>Card</option>
                      <option>Other</option>
                    </select>
                    <Input placeholder="Payment reference" value={paying.reference} onChange={(e) => setPaying((pay) => ({ ...pay, reference: e.target.value  }))} />
                    <Button type="submit" size="sm">Save as paid</Button>
                  </form>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
