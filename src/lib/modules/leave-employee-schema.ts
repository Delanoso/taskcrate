import { z } from "zod";
import { fromDateKey, isDateKey, todayKey } from "@/lib/modules/leave-policy";

const dateKey = (msg: string) => z.string().trim().refine(isDateKey, msg);
const days = (max: number) => z.coerce.number().min(-max).max(max);
const optional = <T extends z.ZodTypeAny>(s: T) =>
  z.preprocess((v) => (v === "" || v === undefined ? null : v), s.nullable());

export const employeeInput = z.object({
  fullName: z.string().trim().min(2, "Enter the employee's name").max(120),
  employeeNumber: optional(z.string().trim().max(40)),
  phone: optional(z.string().trim().max(30)),
  level: z.string().trim().min(1).max(60).default("Staff"),
  startDate: dateKey("Enter a valid employment start date (YYYY-MM-DD)"),
  annualDays: z.coerce.number().min(0).max(60).default(15),
  balanceDate: dateKey("Enter a valid balance date (YYYY-MM-DD)").default(todayKey()),
  openingAnnual: days(365).default(0),
  openingSick: optional(days(365)),
  openingFamily: optional(days(30)),
});

export type EmployeeInput = z.infer<typeof employeeInput>;

export function employeeData(e: EmployeeInput) {
  return {
    fullName: e.fullName,
    employeeNumber: e.employeeNumber as string | null,
    phone: e.phone as string | null,
    level: e.level,
    startDate: fromDateKey(e.startDate),
    annualDays: e.annualDays,
    balanceDate: fromDateKey(e.balanceDate),
    openingAnnual: e.openingAnnual,
    openingSick: e.openingSick as number | null,
    openingFamily: e.openingFamily as number | null,
  };
}
