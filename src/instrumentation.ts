export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const { startTrialReminderSchedule } = await import("@/lib/trial-reminder");
  startTrialReminderSchedule();
}
