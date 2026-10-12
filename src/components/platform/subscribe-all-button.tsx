"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function SubscribeAllButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function subscribeAll() {
    setLoading(true);
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ allProducts: true }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      alert(data.error ?? "Failed");
      return;
    }
    router.push(data.redirectUrl ?? "/dashboard");
    router.refresh();
  }

  return (
    <Button variant="outline" size="sm" onClick={subscribeAll} disabled={loading}>
      {loading ? "Activating…" : "Demo: activate all modules"}
    </Button>
  );
}
