"use client";

import { useEffect, useState } from "react";

type Person = { id: string; fullName: string; employeeNumber: string | null; phone: string | null; email: string | null; idNumber: string | null; jobTitle: string | null; active: boolean };

/** Fills an app's own fields from the staff list. Leaving it blank keeps the app on its own. */
export function PersonPicker({ onPick }: { onPick: (person: Person) => void }) {
  const [people, setPeople] = useState<Person[]>([]);

  useEffect(() => {
    fetch("/api/people")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { people?: Person[] } | null) => setPeople((data?.people ?? []).filter((person) => person.active)))
      .catch(() => undefined);
  }, []);

  if (!people.length) return null;
  return (
    <label className="block space-y-1 text-sm sm:col-span-2">
      <span className="font-medium">From the staff list</span>
      <select
        className="h-9 w-full rounded-md border bg-background px-2 text-sm"
        defaultValue=""
        onChange={(event) => {
          const person = people.find((item) => item.id === event.target.value);
          if (person) onPick(person);
        }}
      >
        <option value="">Type a name instead</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>{person.fullName}{person.employeeNumber ? ` · ${person.employeeNumber}` : ""}</option>
        ))}
      </select>
    </label>
  );
}
