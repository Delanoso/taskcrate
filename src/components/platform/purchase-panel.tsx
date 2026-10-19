"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { PAIR_ZAR, basketTotals, partnersOf } from "@/data/links";
import { RENT_ZAR } from "@/data/products";
import { monthQuote } from "@/lib/pricing";

export function PurchasePanel({ productSlug }: { productSlug: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [extras, setExtras] = useState<string[]>([]);
  const partners = partnersOf(productSlug);
  const [form, setForm] = useState({
    email: "",
    fullName: "",
    companyName: "",
  });

  async function checkout() {
    if (!accepted) {
      setError("Accept the Terms & Conditions to continue.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apps: [productSlug, ...extras],
          guest: true,
          email: form.email,
          fullName: form.fullName,
          companyName: form.companyName,
          acceptedTerms: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Checkout failed");
      if (data.payfastHtml) {
        document.open();
        document.write(data.payfastHtml);
        document.close();
        return;
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      if (data.redirectUrl) {
        router.push(data.redirectUrl);
        return;
      }
      router.push("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setLoading(false);
    }
  }

  const base = monthQuote();
  const quote = basketTotals([productSlug, ...extras], [], base.daysLeft, base.daysInMonth);
  const linked = extras.length > 0;

  return (
    <Card id="purchase">
      <CardHeader>
        <CardTitle>Rent this app</CardTitle>
        <CardDescription>
          R{quote.today.toFixed(2)} today for the {base.daysLeft} day{base.daysLeft === 1 ? "" : "s"} left
          this month, then R{quote.monthly.toLocaleString("en-ZA")} on the 1st of every month.
          {linked ? ` Both apps are R${PAIR_ZAR.toLocaleString("en-ZA")} because they work together.` : ` On its own this app is R${RENT_ZAR.toLocaleString("en-ZA")}.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Cancel anytime. Or{" "}
          <Link href="/register" className="underline">
            register for a 7-day trial of every app
          </Link>{" "}
          with no card.
        </p>
        <div className="space-y-2">
          <Label htmlFor="fullName">Your name</Label>
          <Input
            id="fullName"
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Work email</Label>
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="companyName">Company name</Label>
          <Input
            id="companyName"
            value={form.companyName}
            onChange={(e) => setForm({ ...form, companyName: e.target.value })}
            required
          />
        </div>
        {partners.length > 0 && (
          <div className="space-y-2 rounded-md border p-3">
            <p className="text-sm font-medium">Add a linked app and both are R{PAIR_ZAR.toLocaleString("en-ZA")} a month</p>
            {partners.map((partner) => (
              <label key={partner.slug} className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={extras.includes(partner.slug)}
                  onChange={() => setExtras((current) => current.includes(partner.slug) ? current.filter((slug) => slug !== partner.slug) : [...current, partner.slug])}
                />
                <span>
                  <span className="font-medium">{partner.name}</span>
                  <span className="block text-muted-foreground">{partner.because}</span>
                </span>
              </label>
            ))}
          </div>
        )}
        <div className="flex items-start gap-3 rounded-md border p-3">
          <Checkbox
            id="rent-terms"
            checked={accepted}
            onCheckedChange={(v) => setAccepted(v === true)}
          />
          <Label htmlFor="rent-terms" className="text-sm leading-snug font-normal">
            I agree to the{" "}
            <Link href="/legal/terms" className="underline">
              Terms & Conditions
            </Link>{" "}
            and{" "}
            <Link href="/legal/privacy" className="underline">
              Privacy notice
            </Link>{" "}
            on behalf of my organization.
          </Label>
        </div>
        <Button className="w-full" onClick={checkout} disabled={loading || !accepted}>
          {loading ? "Redirecting to payment…" : `Pay R${quote.today.toFixed(2)} today`}
        </Button>
        <p className="text-xs text-muted-foreground">
          Card payment through PayFast, then a monthly debit order you can cancel any time. When the
          payment clears, your workspace opens and we email you a link to set your password.
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
