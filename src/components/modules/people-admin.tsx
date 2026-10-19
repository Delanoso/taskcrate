"use client";

import { useEffect, useState } from "react";
import { Button, Input, jsonFetch } from "@/components/modules/ui-bits";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

type Person = { id: string; fullName: string; employeeNumber: string | null; phone: string | null; email: string | null; idNumber: string | null; jobTitle: string | null; active: boolean };

const empty = { id: "", fullName: "", employeeNumber: "", phone: "", email: "", idNumber: "", jobTitle: "", active: true };

export function PeopleAdmin() {
  const [people, setPeople] = useState<Person[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const data = await jsonFetch<{ people: Person[]; canManage: boolean }>("/api/people");
    setPeople(data.people);
    setCanManage(data.canManage);
  }

  useEffect(() => { load().catch((err) => setError(err instanceof Error ? err.message : "Could not load")); }, []);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await jsonFetch("/api/people", { method: "POST", body: JSON.stringify({ ...form, id: form.id || undefined }) });
      setForm(empty);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Staff</h1>
        <p className="text-muted-foreground">One list for the company. Leave, payroll, training and the other apps can pick a person from here, or they can keep typing a name. The staff list is free.</p>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {canManage && (
        <Card>
          <CardHeader><CardTitle>{form.id ? "Edit a person" : "Add a person"}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
              <Label className="space-y-1 sm:col-span-2">Full name<Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required /></Label>
              <Label className="space-y-1">Employee number<Input value={form.employeeNumber} onChange={(e) => setForm({ ...form, employeeNumber: e.target.value })} /></Label>
              <Label className="space-y-1">Job title<Input value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} /></Label>
              <Label className="space-y-1">Phone<Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Label>
              <Label className="space-y-1">Email<Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Label>
              <Label className="space-y-1 sm:col-span-2">ID number<Input value={form.idNumber} onChange={(e) => setForm({ ...form, idNumber: e.target.value })} /></Label>
              <div className="flex gap-2 sm:col-span-2">
                <Button type="submit">{form.id ? "Save" : "Add"}</Button>
                {form.id && <Button type="button" variant="outline" onClick={() => setForm(empty)}>Cancel</Button>}
              </div>
            </form>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader><CardTitle>On the list</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {people.length === 0 && <p className="text-sm text-muted-foreground">Nobody yet. Add someone here, or add them in Payroll, Leave or Training and they appear here too.</p>}
          {people.map((person) => (
            <div key={person.id} className="flex items-center justify-between gap-2 rounded-md border p-3 text-sm">
              <span>{person.fullName}{person.employeeNumber ? ` · ${person.employeeNumber}` : ""}{person.jobTitle ? ` · ${person.jobTitle}` : ""}{person.active ? "" : " · inactive"}</span>
              {canManage && <button type="button" className="underline" onClick={() => setForm({ id: person.id, fullName: person.fullName, employeeNumber: person.employeeNumber ?? "", phone: person.phone ?? "", email: person.email ?? "", idNumber: person.idNumber ?? "", jobTitle: person.jobTitle ?? "", active: person.active })}>Edit</button>}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
