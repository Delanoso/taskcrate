import type { TrackedType, TypeBalance } from "@/lib/modules/leave-policy";

export type Employee = {
  id: string;
  publicToken: string;
  fullName: string;
  employeeNumber: string | null;
  phone: string | null;
  level: string;
  startDate: string;
  annualDays: number;
  balanceDate: string;
  openingAnnual: number;
  openingSick: number | null;
  openingFamily: number | null;
  active: boolean;
  balances: Record<TrackedType, TypeBalance>;
  adjustments: { id: string; leaveType: string; days: number; note: string | null; createdBy: string | null; createdAt: string }[];
};

export type LeaveRequest = {
  id: string;
  employeeId: string | null;
  employeeName: string;
  employeeLevel: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number | null;
  reason: string | null;
  status: string;
  createdAt: string;
  decidedAt: string | null;
  decidedBy: string | null;
  decisionNote: string | null;
  capturedBy: string | null;
  employee: { phone: string | null; publicToken: string } | null;
};

export type LevelRule = { id: string; levelName: string; mode: string; blackoutDates: string[] };

export type LeaveData = {
  rules: LevelRule[];
  requests: LeaveRequest[];
  employees: Employee[];
  settings: { workDays: string; allowNegative: boolean };
  appUrl: string;
  requestUrl: string;
  canDelete: boolean;
};

/** Prompt shown after an action so the manager can send the WhatsApp message with one tap. */
export type WaPrompt = { text: string; url: string | null } | null;
