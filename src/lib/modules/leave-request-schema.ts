import { z } from "zod";
import { LEAVE_TYPE_KEYS, isDateKey } from "@/lib/modules/leave-policy";

export const selfServiceRequest = z.object({
  leaveType: z.enum(LEAVE_TYPE_KEYS),
  startDate: z.string().refine(isDateKey, "Pick a start date"),
  endDate: z.string().refine(isDateKey, "Pick an end date"),
  halfDay: z.boolean().optional(),
  reason: z.string().trim().max(500).optional(),
});
