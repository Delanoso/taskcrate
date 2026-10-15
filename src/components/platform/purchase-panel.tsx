"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { formatRentLabel, RENT_ZAR } from "@/data/products";
import { monthQuote } from "@/lib/pricing";

export function PurchasePanel({ productSlug }: { productSlug: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
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
          productSlug,
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
        const w = window.open("", "_self");
        if (w) {
          w.document.write(data.payfastHtml);
          w.document.close();
        }
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

  const quote = monthQuote();

  return (
    <Card id="purchase">
      <CardHeader>
        <CardTitle>Rent this app</CardTitle>
        <CardDescription>
          R{quote.amount.toFixed(2)} today for the {quote.daysLeft} day{quote.daysLeft === 1 ? "" : "s"} left
          this month, then R{RENT_ZAR.toLocaleString("en-ZA")} on the 1st of every month.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {formatRentLabel()} after the first partial month. Cancel anytime. Or{" "}
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
          {loading ? "Redirecting to payment…" : `Pay R${quote.amount.toFixed(2)} today`}
        </Button>
        <p className="text-xs text-muted-foreground">
          PayFast or Stripe (ZAR). When payment clears, your multi-tenant workspace is created
          automatically and you can sign in.
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
