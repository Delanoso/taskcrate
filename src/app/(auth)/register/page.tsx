"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TERMS_AND_CONDITIONS } from "@/content/legal";

export default function RegisterPage() {
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!accepted) {
      setError("You must accept the Terms & Conditions before registering.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const fd = new FormData(e.currentTarget);
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          fullName: fd.get("fullName"),
          email: fd.get("email"),
          password: fd.get("password"),
          companyName: fd.get("companyName"),
          acceptedTerms: true,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Registration failed");
        setLoading(false);
        return;
      }
      window.location.assign("/dashboard");
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="grid gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Create your organization</CardTitle>
            <CardDescription>
              You will be the owner (admin). Invite departments and control module access from the
              dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Your name</Label>
                <Input id="fullName" name="fullName" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Work email</Label>
                <Input id="email" name="email" type="email" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" name="password" type="password" minLength={8} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyName">Company name</Label>
                <Input id="companyName" name="companyName" required />
              </div>
              <div className="flex items-start gap-3 rounded-md border p-3">
                <Checkbox
                  id="terms"
                  checked={accepted}
                  onCheckedChange={(v) => setAccepted(v === true)}
                />
                <Label htmlFor="terms" className="text-sm leading-snug font-normal">
                  I have read and agree to the{" "}
                  <Link href="/legal/terms" className="underline">
                    Terms & Conditions
                  </Link>{" "}
                  on behalf of my organization.
                </Label>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading || !accepted}>
                {loading ? "Creating workspace…" : "Create workspace"}
              </Button>
            </form>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Already registered?{" "}
              <Link href="/login" className="underline">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
        <div className="rounded-xl border bg-muted/30 p-4">
          <h2 className="text-sm font-semibold">Terms preview</h2>
          <pre className="mt-3 max-h-[520px] overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
            {TERMS_AND_CONDITIONS}
          </pre>
        </div>
      </div>
    </div>
  );
}
