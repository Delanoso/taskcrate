"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { formatRentLabel, RENT_ZAR, RENT_USD } from "@/data/products";

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

  return (
    <Card id="purchase">
      <CardHeader>
        <CardTitle>Rent This App for R{RENT_ZAR.toLocaleString("en-ZA")}/mo</CardTitle>
        <CardDescription>
          {formatRentLabel()} · cancel anytime · workspace provisions after payment
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Browse free. One-click rent collects checkout details only when you are ready — no account
          needed to explore. ≈ ${RENT_USD} USD at catalog FX.
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
            on behalf of my organization.
          </Label>
        </div>
        <Button className="w-full" onClick={checkout} disabled={loading || !accepted}>
          {loading ? "Redirecting to payment…" : `Rent This App for R${RENT_ZAR.toLocaleString("en-ZA")}/mo`}
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
