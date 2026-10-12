"use client";

import { useEffect, useState } from "react";
import { PRODUCTS } from "@/data/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Member = {
  id: string;
  role: string;
  user: { email: string; fullName: string };
  department: { name: string } | null;
};

export function TeamManager({ subscribedSlugs }: { subscribedSlugs: string[] }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [inviteResult, setInviteResult] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/team");
    const data = await res.json();
    if (data.members) setMembers(data.members);
  }

  useEffect(() => {
    load();
  }, []);

  async function invite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: fd.get("email"),
        fullName: fd.get("fullName"),
        role: fd.get("role"),
      }),
    });
    const data = await res.json();
    if (data.temporaryPassword) {
      setInviteResult(`Demo invite created. Temporary password: ${data.temporaryPassword}`);
    }
    e.currentTarget.reset();
    load();
  }

  const moduleOptions = PRODUCTS.filter((p) => subscribedSlugs.includes(p.slug));

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <form onSubmit={invite} className="space-y-4 rounded-xl border bg-card p-6">
        <h2 className="font-medium">Invite member</h2>
        <div className="space-y-2">
          <Label htmlFor="fullName">Full name</Label>
          <Input id="fullName" name="fullName" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="role">Role</Label>
          <select
            id="role"
            name="role"
            className="flex h-9 w-full rounded-md border bg-background px-3 text-sm"
            defaultValue="MEMBER"
          >
            <option value="ADMIN">Admin</option>
            <option value="MANAGER">Manager</option>
            <option value="MEMBER">Member</option>
          </select>
        </div>
        <p className="text-xs text-muted-foreground">
          Module restrictions per user can be extended in the next iteration (product slug JSON is
          already stored on memberships).
        </p>
        <Button type="submit">Send invite (demo)</Button>
        {inviteResult && <p className="text-sm text-muted-foreground">{inviteResult}</p>}
      </form>

      <div className="rounded-xl border bg-card p-6">
        <h2 className="font-medium">Current team</h2>
        <ul className="mt-4 space-y-3">
          {members.map((m) => (
            <li key={m.id} className="flex justify-between gap-4 text-sm">
              <div>
                <p className="font-medium">{m.user.fullName}</p>
                <p className="text-muted-foreground">{m.user.email}</p>
              </div>
              <span className="text-xs uppercase text-muted-foreground">{m.role}</span>
            </li>
          ))}
        </ul>
        {moduleOptions.length > 0 && (
          <p className="mt-6 text-xs text-muted-foreground">
            Active subscriptions: {moduleOptions.map((m) => m.name).join(", ")}
          </p>
        )}
      </div>
    </div>
  );
}
