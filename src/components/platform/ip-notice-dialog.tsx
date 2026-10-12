"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { IP_NOTICE_TEXT } from "@/content/legal";

type Props = {
  productSlug: string;
  productName: string;
  openInitially: boolean;
};

export function IpNoticeDialog({ productSlug, productName, openInitially }: Props) {
  const [open, setOpen] = useState(openInitially);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setOpen(openInitially);
  }, [openInitially]);

  async function acknowledge() {
    setLoading(true);
    try {
      await fetch("/api/ip-notice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productSlug }),
      });
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent showCloseButton={false} className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Delano Solutions — proprietary software</DialogTitle>
          <DialogDescription>
            Before using {productName}, please confirm you understand the license terms.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-48 overflow-y-auto rounded-md border bg-muted/40 p-4 text-sm leading-relaxed whitespace-pre-wrap">
          {IP_NOTICE_TEXT}
        </div>
        <DialogFooter>
          <Button onClick={acknowledge} disabled={loading}>
            {loading ? "Saving…" : "I understand — continue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
