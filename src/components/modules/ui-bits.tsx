"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/modules/status-badge";
import { LinkActions } from "@/components/modules/link-actions";

export { Button, Input, Label, Card, CardContent, CardDescription, CardHeader, CardTitle, StatusBadge };

export function LinkBox({ url, title }: { url: string; title?: string }) {
  return <LinkActions url={url} title={title} />;
}

export async function jsonFetch<T = any>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const text = await res.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(
      res.ok
        ? "Server returned a non-JSON response. Refresh and try again."
        : `Request failed (${res.status}). Refresh and try again.`,
    );
  }
  if (!res.ok) throw new Error(data?.error ?? `Request failed (${res.status})`);
  return data as T;
}
