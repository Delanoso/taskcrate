"use client";

import { useEffect, useState } from "react";
import { PRODUCTS } from "@/data/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Person = {
  id: string;
  role: string;
  productAccess: string | null;
  userId: string;
  user: { id: string; email: string; fullName: string };
};

function isAdminRole(role: string) {
  return role === "OWNER" || role === "ADMIN";
}

function chosenApps(raw: string | null) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function TeamManager({
  subscribedSlugs,
  currentUserId,
}: {
  subscribedSlugs: string[];
  currentUserId: string;
}) {
  const [people, setPeople] = useState<Person[]>([]);
  const [inviteResult, setInviteResult] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState(false);
  const [devLink, setDevLink] = useState<string | null>(null);
  const [role, setRole] = useState("MEMBER");
  const [accessNote, setAccessNote] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/team");
    const data = await res.json();
    if (data.members) setPeople(data.members);
  }

  useEffect(() => {
    load();
  }, []);

  async function invite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const fullName = String(fd.get("fullName") ?? "");
    const res = await fetch("/api/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: fd.get("email"),
        fullName,
        role: fd.get("role"),
        productSlugs: fd.get("role") === "ADMIN" ? [] : fd.getAll("productSlugs"),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setInviteError(true);
      setDevLink(null);
      setInviteResult(data.error || "Could not send the invite.");
      return;
    }
    setInviteError(false);
    setDevLink(typeof data.devLink === "string" ? data.devLink : null);
    if (data.kind === "added") {
      setInviteResult(`${fullName} is on the team. We emailed them to sign in.`);
    } else if (data.kind === "updated") {
      setInviteResult(`${fullName} is already here. Their access was updated.`);
    } else {
      setInviteResult(`Invite sent to ${fullName}. They choose their own password from the email.`);
    }
    form.reset();
    setRole("MEMBER");
    load();
  }

  async function saveAccess(person: Person, nextRole: "ADMIN" | "MEMBER", productSlugs: string[]) {
    setAccessNote(null);
    const res = await fetch("/api/team", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ membershipId: person.id, role: nextRole, productSlugs }),
    });
    const data = await res.json();
    if (!res.ok) {
      setAccessNote(data.error || "Could not save access.");
      return;
    }
    setAccessNote(`Saved access for ${person.user.fullName}.`);
    load();
  }

  const apps = PRODUCTS.filter((product) => subscribedSlugs.includes(product.slug));

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <form onSubmit={invite} className="space-y-4 rounded-xl border bg-card p-6">
        <h2 className="font-medium">Invite</h2>
        <div className="space-y-2">
          <Label htmlFor="fullName">Name</Label>
          <Input id="fullName" name="fullName" required minLength={2} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="role">Access</Label>
          <select
            id="role"
            name="role"
            className="flex h-9 w-full rounded-md border bg-background px-3 text-sm"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="ADMIN">Admin</option>
            <option value="MEMBER">Opens chosen apps</option>
          </select>
        </div>
        {role === "MEMBER" ? (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Apps they can open</legend>
            {apps.length === 0 ? (
              <p className="text-sm text-muted-foreground">No apps are open for the company yet.</p>
            ) : (
              apps.map((app) => (
                <label key={app.slug} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="productSlugs" value={app.slug} />
                  {app.name}
                </label>
              ))
            )}
          </fieldset>
        ) : (
          <p className="text-sm text-muted-foreground">
            An admin can invite people, choose which apps they open, and add monthly apps.
          </p>
        )}
        <Button type="submit">Send invite</Button>
        {inviteResult ? (
          <p className={inviteError ? "text-sm text-red-600" : "text-sm text-muted-foreground"}>
            {inviteResult}
          </p>
        ) : null}
        {devLink ? (
          <p className="text-sm">
            <a href={devLink} className="underline">
              Open the invite link
            </a>
          </p>
        ) : null}
      </form>

      <div className="rounded-xl border bg-card p-6">
        <h2 className="font-medium">People</h2>
        {accessNote ? <p className="mt-2 text-sm text-muted-foreground">{accessNote}</p> : null}
        <ul className="mt-4 space-y-6">
          {people.map((person) => (
            <PersonAccess
              key={person.id}
              person={person}
              apps={apps}
              self={person.user.id === currentUserId}
              onSave={saveAccess}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}

function PersonAccess({
  person,
  apps,
  self,
  onSave,
}: {
  person: Person;
  apps: { slug: string; name: string }[];
  self: boolean;
  onSave: (person: Person, role: "ADMIN" | "MEMBER", productSlugs: string[]) => void;
}) {
  const admin = isAdminRole(person.role);
  const [slugs, setSlugs] = useState<string[]>(chosenApps(person.productAccess));

  useEffect(() => {
    setSlugs(chosenApps(person.productAccess));
  }, [person.productAccess]);

  return (
    <li className="space-y-3 text-sm">
      <div className="flex justify-between gap-4">
        <div>
          <p className="font-medium">{person.user.fullName}</p>
          <p className="text-muted-foreground">{person.user.email}</p>
        </div>
        {admin ? <span className="text-xs text-muted-foreground">Admin</span> : null}
      </div>
      {admin ? (
        self || person.role === "OWNER" ? null : (
          <Button type="button" variant="outline" size="sm" onClick={() => onSave(person, "MEMBER", slugs)}>
            Choose apps for {person.user.fullName}
          </Button>
        )
      ) : (
        <div className="space-y-2">
          {apps.map((app) => (
            <label key={app.slug} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={slugs.includes(app.slug)}
                onChange={(e) =>
                  setSlugs((current) =>
                    e.target.checked ? [...current, app.slug] : current.filter((slug) => slug !== app.slug),
                  )
                }
              />
              {app.name}
            </label>
          ))}
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={() => onSave(person, "MEMBER", slugs)}>
              Save apps
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => onSave(person, "ADMIN", [])}>
              Make {person.user.fullName} an admin
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}
