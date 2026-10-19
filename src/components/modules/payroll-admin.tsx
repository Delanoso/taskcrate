"use client";

import { useEffect, useState } from "react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, StatusBadge, jsonFetch } from "@/components/modules/ui-bits";
import { PAYROLL_COLUMNS, parsePayrollRows, textToRows, type PayrollImportRow } from "@/lib/modules/payroll-import";
import { TAX_YEAR_LABEL, dobFromSaId, formatRand } from "@/lib/modules/payroll-tax";
import { readXlsx } from "@/lib/xlsx-read";

type Employee = {
  id: string;
  fullName: string;
  employeeNumber: string | null;
  idNumber: string | null;
  taxNumber: string | null;
  dateOfBirth: string | null;
  startDate: string | null;
  jobTitle: string | null;
  email: string | null;
  phone: string | null;
  bankName: string | null;
  accountNumber: string | null;
  branchCode: string | null;
  accountType: string | null;
  monthlySalaryCents: number;
  allowanceCents: number;
  pensionCents: number;
  employerPensionCents: number;
  medicalMember: boolean;
  medicalDependants: number;
  medicalDeductionCents: number;
  paysUif: boolean;
  active: boolean;
};
type Line = {
  id: string;
  employeeId: string | null;
  fullName: string;
  grossCents: number;
  payeCents: number;
  uifEmployeeCents: number;
  uifEmployerCents: number;
  sdlCents: number;
  pensionCents: number;
  medicalDeductionCents: number;
  netCents: number;
  employerCostCents: number;
  note: string | null;
};
type Run = { id: string; period: string; payDate: string; status: string; lines: Line[] };
type PersonForm = {
  id: string;
  fullName: string;
  employeeNumber: string;
  idNumber: string;
  taxNumber: string;
  dateOfBirth: string;
  startDate: string;
  jobTitle: string;
  email: string;
  phone: string;
  bankName: string;
  accountNumber: string;
  branchCode: string;
  accountType: string;
  monthlySalary: string;
  allowances: string;
  pension: string;
  employerPension: string;
  medicalMember: boolean;
  medicalDependants: string;
  medicalDeduction: string;
  paysUif: boolean;
};

const field = "h-9 w-full rounded-md border bg-background px-2 text-sm";
const rands = (cents: number) => (cents / 100).toFixed(2);

function emptyPerson(): PersonForm {
  return {
    id: "",
    fullName: "",
    employeeNumber: "",
    idNumber: "",
    taxNumber: "",
    dateOfBirth: "",
    startDate: "",
    jobTitle: "",
    email: "",
    phone: "",
    bankName: "",
    accountNumber: "",
    branchCode: "",
    accountType: "Cheque",
    monthlySalary: "",
    allowances: "0",
    pension: "0",
    employerPension: "0",
    medicalMember: false,
    medicalDependants: "0",
    medicalDeduction: "0",
    paysUif: true,
  };
}

function personFrom(employee: Employee): PersonForm {
  return {
    id: employee.id,
    fullName: employee.fullName,
    employeeNumber: employee.employeeNumber ?? "",
    idNumber: employee.idNumber ?? "",
    taxNumber: employee.taxNumber ?? "",
    dateOfBirth: employee.dateOfBirth ?? "",
    startDate: employee.startDate ?? "",
    jobTitle: employee.jobTitle ?? "",
    email: employee.email ?? "",
    phone: employee.phone ?? "",
    bankName: employee.bankName ?? "",
    accountNumber: employee.accountNumber ?? "",
    branchCode: employee.branchCode ?? "",
    accountType: employee.accountType ?? "Cheque",
    monthlySalary: rands(employee.monthlySalaryCents),
    allowances: rands(employee.allowanceCents),
    pension: rands(employee.pensionCents),
    employerPension: rands(employee.employerPensionCents),
    medicalMember: employee.medicalMember,
    medicalDependants: String(employee.medicalDependants),
    medicalDeduction: rands(employee.medicalDeductionCents),
    paysUif: employee.paysUif,
  };
}

export function PayrollAdmin() {
  const [panel, setPanel] = useState<"setup" | "person" | "import" | "run">("setup");
  const [profile, setProfile] = useState({ payeNumber: "", uifNumber: "", sdlNumber: "", paySdl: false, payDay: "25" });
  const [hasProfile, setHasProfile] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [person, setPerson] = useState<PersonForm>(emptyPerson());
  const [period, setPeriod] = useState(() => new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Johannesburg" }).slice(0, 7));
  const [extras, setExtras] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<{ rows: PayrollImportRow[]; errors: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    const data = await jsonFetch<{ profile: { payeNumber: string; uifNumber: string; sdlNumber: string | null; paySdl: boolean; payDay: number } | null; employees: Employee[]; runs: Run[] }>("/api/modules/payroll");
    setEmployees(data.employees);
    setRuns(data.runs);
    setHasProfile(Boolean(data.profile));
    if (data.profile) {
      setProfile({
        payeNumber: data.profile.payeNumber ?? "",
        uifNumber: data.profile.uifNumber ?? "",
        sdlNumber: data.profile.sdlNumber ?? "",
        paySdl: data.profile.paySdl,
        payDay: String(data.profile.payDay),
      });
    }
    return data;
  }

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "Could not load"));
  }, []);

  async function run(body: unknown, ok: string) {
    setError(null);
    const result = await jsonFetch("/api/modules/payroll", { method: "POST", body: JSON.stringify(body) });
    await load();
    setNotice(ok);
    return result;
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    try {
      await run({ action: "profile", ...profile, payDay: Number(profile.payDay) }, "Payroll setup saved.");
      setPanel("person");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    }
  }

  async function savePerson(e: React.FormEvent) {
    e.preventDefault();
    try {
      await run(
        {
          action: "employee",
          ...person,
          id: person.id || undefined,
          monthlySalary: Number(person.monthlySalary),
          allowances: Number(person.allowances || 0),
          pension: Number(person.pension || 0),
          employerPension: Number(person.employerPension || 0),
          medicalDependants: Number(person.medicalDependants || 0),
          medicalDeduction: Number(person.medicalDeduction || 0),
          dateOfBirth: person.dateOfBirth || dobFromSaId(person.idNumber) || "",
        },
        person.id ? "Employee updated." : "Employee added.",
      );
      setPerson(emptyPerson());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the employee");
    }
  }

  async function onFile(file: File) {
    setError(null);
    setNotice(null);
    try {
      const rows = /\.(csv|txt)$/i.test(file.name) ? textToRows(await file.text()) : await readXlsx(file);
      setPreview(parsePayrollRows(rows));
    } catch (err) {
      setPreview(null);
      setError(err instanceof Error ? err.message : "Could not read that file");
    }
  }

  const current = runs.find((item) => item.period === period);
  const active = employees.filter((employee) => employee.active);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {([
          ["setup", "Company setup"],
          ["person", "Employees"],
          ["import", "Import Excel"],
          ["run", "Run the month"],
        ] as const).map(([id, label]) => (
          <Button key={id} type="button" size="sm" variant={panel === id ? "default" : "outline"} onClick={() => setPanel(id)}>{label}</Button>
        ))}
        <Button size="sm" variant="outline" asChild><a href="/api/modules/payroll/export?scope=employees">Download employees</a></Button>
        <Button size="sm" variant="outline" asChild><a href="/api/modules/payroll/export?scope=runs">Download pay runs</a></Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {notice && <p className="text-sm text-green-700">{notice}</p>}

      {panel === "setup" && (
        <Card>
          <CardHeader>
            <CardTitle>PAYE, UIF and the levy</CardTitle>
            <CardDescription>
              Save this once. Each month the run uses the SARS tables for {TAX_YEAR_LABEL}. UIF is 1% from the employee and 1% from the company, on pay up to R 17 712. PAYE is this month&apos;s pay turned into a year, less the age rebate and the medical tax credit. Pension reduces tax up to 27.5% of pay, capped at R 350 000 a year. Switch the levy on if yearly pay is over R 500 000. It is 1%, paid by the company.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveProfile} className="grid gap-3 sm:grid-cols-2">
              <Label className="space-y-1">PAYE number<Input value={profile.payeNumber} onChange={(e) => setProfile((p) => ({ ...p, payeNumber: e.target.value  }))} required /></Label>
              <Label className="space-y-1">UIF number<Input value={profile.uifNumber} onChange={(e) => setProfile((p) => ({ ...p, uifNumber: e.target.value  }))} required /></Label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={profile.paySdl} onChange={(e) => setProfile((p) => ({ ...p, paySdl: e.target.checked  }))} />
                Pay the skills development levy (1%)
              </label>
              <Label className="space-y-1">SDL number<Input value={profile.sdlNumber} onChange={(e) => setProfile((p) => ({ ...p, sdlNumber: e.target.value  }))} /></Label>
              <Label className="space-y-1">Pay day of the month<Input type="number" min="1" max="31" value={profile.payDay} onChange={(e) => setProfile((p) => ({ ...p, payDay: e.target.value  }))} required /></Label>
              <Button type="submit" className="sm:col-span-2 sm:w-fit">Save payroll setup</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {panel === "person" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{person.id ? "Edit employee" : "Add one employee"}</CardTitle>
              <CardDescription>The tax number, ID and bank account are needed before a month can be finalised. A South African ID fills the date of birth.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={savePerson} className="grid gap-3 sm:grid-cols-2">
                <Label className="space-y-1 sm:col-span-2">Full name<Input value={person.fullName} onChange={(e) => setPerson((p) => ({ ...p, fullName: e.target.value  }))} required /></Label>
                <Label className="space-y-1">Employee number<Input value={person.employeeNumber} onChange={(e) => setPerson((p) => ({ ...p, employeeNumber: e.target.value  }))} /></Label>
                <Label className="space-y-1">Job title<Input value={person.jobTitle} onChange={(e) => setPerson((p) => ({ ...p, jobTitle: e.target.value  }))} /></Label>
                <Label className="space-y-1">ID number<Input value={person.idNumber} onChange={(e) => setPerson((p) => ({ ...p, idNumber: e.target.value, dateOfBirth: p.dateOfBirth || dobFromSaId(e.target.value) || "" }))} /></Label>
                <Label className="space-y-1">Tax number<Input value={person.taxNumber} onChange={(e) => setPerson((p) => ({ ...p, taxNumber: e.target.value  }))} /></Label>
                <Label className="space-y-1">Date of birth<Input type="date" value={person.dateOfBirth} onChange={(e) => setPerson((p) => ({ ...p, dateOfBirth: e.target.value  }))} /></Label>
                <Label className="space-y-1">Start date<Input type="date" value={person.startDate} onChange={(e) => setPerson((p) => ({ ...p, startDate: e.target.value  }))} /></Label>
                <Label className="space-y-1">Email<Input value={person.email} onChange={(e) => setPerson((p) => ({ ...p, email: e.target.value  }))} /></Label>
                <Label className="space-y-1">Phone<Input value={person.phone} onChange={(e) => setPerson((p) => ({ ...p, phone: e.target.value  }))} /></Label>
                <Label className="space-y-1">Bank<Input value={person.bankName} onChange={(e) => setPerson((p) => ({ ...p, bankName: e.target.value  }))} /></Label>
                <Label className="space-y-1">Account number<Input value={person.accountNumber} onChange={(e) => setPerson((p) => ({ ...p, accountNumber: e.target.value  }))} /></Label>
                <Label className="space-y-1">Branch code<Input value={person.branchCode} onChange={(e) => setPerson((p) => ({ ...p, branchCode: e.target.value  }))} /></Label>
                <Label className="space-y-1">Account type<Input value={person.accountType} onChange={(e) => setPerson((p) => ({ ...p, accountType: e.target.value  }))} /></Label>
                <Label className="space-y-1">Monthly salary (R)<Input type="number" min="0" step="0.01" value={person.monthlySalary} onChange={(e) => setPerson((p) => ({ ...p, monthlySalary: e.target.value  }))} required /></Label>
                <Label className="space-y-1">Taxable allowances (R)<Input type="number" min="0" step="0.01" value={person.allowances} onChange={(e) => setPerson((p) => ({ ...p, allowances: e.target.value  }))} /></Label>
                <Label className="space-y-1">Pension, employee (R)<Input type="number" min="0" step="0.01" value={person.pension} onChange={(e) => setPerson((p) => ({ ...p, pension: e.target.value  }))} /></Label>
                <Label className="space-y-1">Pension, company (R)<Input type="number" min="0" step="0.01" value={person.employerPension} onChange={(e) => setPerson((p) => ({ ...p, employerPension: e.target.value  }))} /></Label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={person.medicalMember} onChange={(e) => setPerson((p) => ({ ...p, medicalMember: e.target.checked  }))} />On a medical aid</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={person.paysUif} onChange={(e) => setPerson((p) => ({ ...p, paysUif: e.target.checked  }))} />Pays UIF</label>
                <Label className="space-y-1">Medical dependants<Input type="number" min="0" max="20" value={person.medicalDependants} onChange={(e) => setPerson((p) => ({ ...p, medicalDependants: e.target.value  }))} /></Label>
                <Label className="space-y-1">Medical aid taken off pay (R)<Input type="number" min="0" step="0.01" value={person.medicalDeduction} onChange={(e) => setPerson((p) => ({ ...p, medicalDeduction: e.target.value  }))} /></Label>
                <div className="flex gap-2 sm:col-span-2">
                  <Button type="submit">{person.id ? "Save employee" : "Add employee"}</Button>
                  {person.id && <Button type="button" variant="outline" onClick={() => setPerson(emptyPerson())}>Cancel</Button>}
                </div>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>People on the payroll</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {employees.length === 0 && <p className="text-sm text-muted-foreground">Nobody loaded yet.</p>}
              {employees.map((employee) => (
                <div key={employee.id} className="rounded-md border p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{employee.fullName}</span>
                    <StatusBadge status={employee.active ? "active" : "inactive"} />
                  </div>
                  <p className="text-muted-foreground">{employee.jobTitle || "No job title"} · {formatRand(employee.monthlySalaryCents)} a month{employee.employeeNumber ? ` · ${employee.employeeNumber}` : ""}</p>
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setPerson(personFrom(employee)); setPanel("person"); }}>Edit</Button>
                    <Button size="sm" variant="outline" onClick={() => run({ action: "active", id: employee.id, active: !employee.active }, employee.active ? "Employee set aside." : "Employee put back on the payroll.").catch((err) => setError(err instanceof Error ? err.message : "Could not update"))}>
                      {employee.active ? "Set aside" : "Put back"}
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {panel === "import" && (
        <Card>
          <CardHeader>
            <CardTitle>Load everyone from Excel</CardTitle>
            <CardDescription>
              One person per row. Columns: {PAYROLL_COLUMNS.map((column) => column.label).join(", ")}. A matching employee number, or the same name, updates that person. Delete the sample row in the template before you import.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <a className="text-sm text-primary underline" href="/api/modules/payroll/template">Download the Excel template</a>
            <label className="flex cursor-pointer flex-col items-center gap-1 rounded-lg border-2 border-dashed p-5 text-center text-sm">
              <span className="font-medium">Choose an Excel file or CSV</span>
              <input type="file" accept=".xlsx,.csv,.txt" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) onFile(file); e.target.value = ""; }} />
            </label>
            {preview && preview.errors.length > 0 && <ul className="list-disc pl-5 text-xs text-destructive">{preview.errors.slice(0, 8).map((item) => <li key={item}>{item}</li>)}</ul>}
            {preview && preview.rows.length > 0 && preview.errors.length === 0 && (
              <>
                <p className="text-sm">{preview.rows.length} {preview.rows.length === 1 ? "person" : "people"} ready.</p>
                <Button onClick={() => run({ action: "import", rows: preview.rows }, "Import finished.").then(() => setPreview(null)).catch((err) => setError(err instanceof Error ? err.message : "Import failed"))}>
                  Import {preview.rows.length}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {panel === "run" && (
        <Card>
          <CardHeader>
            <CardTitle>Run the month</CardTitle>
            <CardDescription>
              {hasProfile ? "Active people are calculated from the setup. A once-off amount is taxed in this month only. Finalising locks the month until you reopen it." : "Save the PAYE and UIF setup first."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-end gap-2">
              <Label className="space-y-1">Month<Input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} /></Label>
              <Button
                disabled={!hasProfile || current?.status === "FINALISED"}
                onClick={() => {
                  const extraNumbers = Object.fromEntries(active.map((employee) => [employee.id, Number(extras[employee.id] || 0)]));
                  run({ action: "calculate", period, extras: extraNumbers }, "Month calculated.").catch((err) => setError(err instanceof Error ? err.message : "Could not calculate"));
                }}
              >
                Calculate this month
              </Button>
              {current && current.status !== "FINALISED" && (
                <Button variant="outline" onClick={() => run({ action: "finalise", period }, "Month finalised.").catch((err) => setError(err instanceof Error ? err.message : "Could not finalise"))}>Finalise this month</Button>
              )}
              {current?.status === "FINALISED" && (
                <Button variant="outline" onClick={() => run({ action: "reopen", period }, "Month reopened.").catch((err) => setError(err instanceof Error ? err.message : "Could not reopen"))}>Reopen this month</Button>
              )}
            </div>
            {current && (
              <div className="space-y-2">
                <p className="text-sm">Pay date {current.payDate} · <StatusBadge status={current.status === "FINALISED" ? "finalised" : "open"} /></p>
                <div className="overflow-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-muted-foreground">
                        <th className="p-1">Name</th><th className="p-1">Once-off</th><th className="p-1">Gross</th><th className="p-1">PAYE</th><th className="p-1">UIF</th><th className="p-1">Net</th><th className="p-1"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {current.lines.map((line) => (
                        <tr key={line.id} className="border-t">
                          <td className="p-1">{line.fullName}</td>
                          <td className="p-1">
                            <Input className="h-8 w-24" type="number" min="0" step="0.01" disabled={current.status === "FINALISED"} value={extras[line.employeeId ?? ""] ?? ""} placeholder="0" onChange={(e) => setExtras({ ...extras, [line.employeeId ?? ""]: e.target.value })} />
                          </td>
                          <td className="p-1">{formatRand(line.grossCents)}</td>
                          <td className="p-1">{formatRand(line.payeCents)}</td>
                          <td className="p-1">{formatRand(line.uifEmployeeCents)}</td>
                          <td className="p-1">{formatRand(line.netCents)}</td>
                          <td className="p-1"><a className="underline" href={`/api/modules/payroll/payslip/${line.id}/pdf`} target="_blank" rel="noreferrer">Payslip</a></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-sm">
                  PAYE {formatRand(current.lines.reduce((sum, line) => sum + line.payeCents, 0))}
                  {" · "}UIF employee {formatRand(current.lines.reduce((sum, line) => sum + line.uifEmployeeCents, 0))}
                  {" · "}UIF company {formatRand(current.lines.reduce((sum, line) => sum + line.uifEmployerCents, 0))}
                  {" · "}SDL {formatRand(current.lines.reduce((sum, line) => sum + line.sdlCents, 0))}
                  {" · "}Net {formatRand(current.lines.reduce((sum, line) => sum + line.netCents, 0))}
                  {" · "}Company cost {formatRand(current.lines.reduce((sum, line) => sum + line.employerCostCents, 0))}
                </p>
                {current.lines.some((line) => line.note) && (
                  <ul className="list-disc pl-5 text-xs text-muted-foreground">
                    {current.lines.filter((line) => line.note).map((line) => <li key={line.id}>{line.fullName}: {line.note}</li>)}
                  </ul>
                )}
              </div>
            )}
            {!current && active.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Once-off amounts for {period}, then calculate.</p>
                {active.map((employee) => (
                  <div key={employee.id} className="flex items-center gap-2 text-sm">
                    <span className="w-48">{employee.fullName}</span>
                    <Input className="h-8 w-28" type="number" min="0" step="0.01" placeholder="Once-off R" value={extras[employee.id] ?? ""} onChange={(e) => setExtras({ ...extras, [employee.id]: e.target.value })} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
