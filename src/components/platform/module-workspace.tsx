"use client";

import { useState } from "react";
import type { ProductDefinition } from "@/data/products";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Shared module shell — each product gets its own routes/data models in later phases. */
export function ModuleWorkspace({
  product,
  organizationName,
}: {
  product: ProductDefinition;
  organizationName: string;
}) {
  const [title, setTitle] = useState(`${product.name} record`);
  const [saved, setSaved] = useState(false);

  function saveDemo() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workspace</CardTitle>
        <CardDescription>
          Tenant-scoped data for <strong>{organizationName}</strong>. This slice proves navigation,
          access control, PDFs, and messaging — product-specific workflows ship per module.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Document title</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <Button onClick={saveDemo}>{saved ? "Saved (demo)" : "Save draft"}</Button>
        <ul className="space-y-1 text-sm text-muted-foreground">
          {product.hasSignatures && <li>· Signature requests will notify assignees here.</li>}
          {product.hasDateReminders && <li>· Due dates appear in the unified notification feed.</li>}
          {product.hasPdfExport && <li>· Exports use your branding settings automatically.</li>}
        </ul>
      </CardContent>
    </Card>
  );
}
