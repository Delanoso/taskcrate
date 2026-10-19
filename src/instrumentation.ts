import type { Instrumentation } from "next";

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const { startScheduler } = await import("@/lib/jobs");
  startScheduler();
}

const recent = new Map<string, number>();

/** Emails the owner when a page or API crashes; the same error is reported at most once per 30 minutes. */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NODE_ENV !== "production") return;
  const e = err as Error & { digest?: string };
  const key = `${context.routePath}:${e.message}`;
  const now = Date.now();
  if ((recent.get(key) ?? 0) > now - 30 * 60_000) return;
  recent.set(key, now);
  try {
    const { sendAlertEmail } = await import("@/lib/mail");
    await sendAlertEmail({
      subject: `[TaskCrate] Error on ${context.routePath}`,
      text: [`${request.method} ${request.path}`, `Route: ${context.routePath} (${context.routeType})`, `Digest: ${e.digest ?? "-"}`, "", e.message, "", (e.stack ?? "").split("\n").slice(0, 8).join("\n")].join("\n"),
    });
  } catch {}
};
