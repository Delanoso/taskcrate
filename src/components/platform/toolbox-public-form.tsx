"use client";

import { useState } from "react";
import { SignaturePad } from "@/components/platform/signature-pad";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TalkMaterial } from "@/components/toolbox/talk-material";
import type { LibraryTalk } from "@/data/toolbox-library/types";

type Talk = {
  title: string;
  weekLabel: string;
  content: string;
  mediaUrl: string | null;
  companyName: string;
  library: LibraryTalk | null;
  attachment: { name: string; type: string } | null;
};

export function ToolboxPublicForm({ token, talk }: { token: string; talk: Talk }) {
  const [signature, setSignature] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!signature) {
      setError("Please draw your signature before submitting.");
      return;
    }
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const res = await fetch(`/api/toolbox/public/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: fd.get("firstName"),
        lastName: fd.get("lastName"),
        signatureData: signature,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Could not submit");
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center shadow-sm">
        <h2 className="text-xl font-semibold">Thank you — you are signed in</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Your attendance for {talk.title} has been recorded for {talk.companyName}.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-sm font-medium text-primary">{talk.companyName}</p>
        <h1 className="text-2xl font-semibold tracking-tight">{talk.title}</h1>
        <p className="text-sm text-muted-foreground">{talk.weekLabel}</p>
      </header>

      <TalkMaterial
        library={talk.library}
        content={talk.content}
        mediaUrl={talk.mediaUrl}
        attachment={
          talk.attachment
            ? { ...talk.attachment, href: `/api/toolbox/public/${token}/attachment` }
            : null
        }
      />

      <form onSubmit={submit} className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="font-medium">Confirm attendance</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="firstName">Name</Label>
            <Input id="firstName" name="firstName" required autoComplete="given-name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Surname</Label>
            <Input id="lastName" name="lastName" required autoComplete="family-name" />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Digital signature</Label>
          <SignaturePad onChange={setSignature} />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Submitting…" : "Sign attendance register"}
        </Button>
        <p className="text-xs text-muted-foreground">
          By signing you confirm you have read this week&apos;s toolbox talk material. This
          application is proprietary software of Delano Solutions.
        </p>
      </form>
    </div>
  );
}
