import { StatusBadge } from "@/components/modules/status-badge";
import {
  formatRand,
  formatWhen,
  JOB_STEPS,
  jobStepIndex,
  sideLabels,
  type JobCardView,
  type JobPhoto,
} from "@/lib/modules/jobcard-shared";

function Photos({ photos }: { photos: JobPhoto[] }) {
  if (!photos.length) return <p className="text-sm text-muted-foreground">No photo yet</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {photos.map((photo) => (
        <a key={photo.url} href={photo.url} target="_blank" rel="noreferrer" className="block size-24 overflow-hidden rounded-md border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.url} alt="" className="size-full object-cover" />
        </a>
      ))}
    </div>
  );
}

function Signature({ src, name, when }: { src: string | null; name: string | null; when: string | null }) {
  if (!src) return <p className="text-sm text-muted-foreground">Not signed yet</p>;
  return (
    <div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={name ? `Signature of ${name}` : "Signature"} className="h-20 max-w-full rounded-md border bg-white object-contain" />
      <p className="mt-1 text-xs text-muted-foreground">{[name, formatWhen(when)].filter(Boolean).join(" · ")}</p>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <p className="text-sm">
      <span className="text-muted-foreground">{label}: </span>
      <span className="font-medium">{value?.trim() || "—"}</span>
    </p>
  );
}

export function JobCardSheet({ job }: { job: JobCardView }) {
  const labels = sideLabels(job.mode);
  const step = jobStepIndex(job.status);
  const openPhotos = job.photos.filter((photo) => photo.side === "open");
  const workPhotos = job.photos.filter((photo) => photo.side === "work");
  const partsTotal = job.parts.reduce((sum, part) => sum + part.qty * part.cost, 0);

  return (
    <article className="rounded-xl border bg-card p-4 sm:p-5">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
        <div>
          <p className="text-sm text-muted-foreground">{job.companyName}</p>
          <h2 className="text-xl font-semibold tracking-tight">Job card {job.jobNumber}</h2>
          <p className="text-sm text-muted-foreground">{labels.kind} · Opened {formatWhen(job.createdAt)}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <StatusBadge status={job.status === "done" ? "closed" : job.status === "awaiting_signoff" ? "waiting for sign-off" : job.status} />
          <p className="text-xs capitalize text-muted-foreground">{job.priority} priority</p>
        </div>
      </header>

      <ol className="mt-4 grid grid-cols-5 gap-1 text-center text-[0.65rem] sm:text-xs">
        {JOB_STEPS.map((item, index) => (
          <li key={item.key} className={index <= step ? "font-medium text-foreground" : "text-muted-foreground"}>
            <span className={`mx-auto mb-1 flex size-6 items-center justify-center rounded-full border text-[0.7rem] ${index <= step ? "border-primary bg-primary text-primary-foreground" : ""}`}>
              {index + 1}
            </span>
            {item.label}
          </li>
        ))}
      </ol>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="space-y-3 rounded-lg border p-3">
          <h3 className="font-semibold">Opening side</h3>
          <Line label="Reported by" value={job.reportedByName} />
          <Line label="Phone" value={job.reportedByPhone} />
          <Line label={labels.asset} value={job.machineRef} />
          <Line label={labels.place} value={job.location} />
          <div>
            <p className="text-sm text-muted-foreground">What is wrong</p>
            <p className="whitespace-pre-wrap text-sm">{job.description?.trim() || "—"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Comment</p>
            <p className="whitespace-pre-wrap text-sm">{job.openComment?.trim() || "—"}</p>
          </div>
          <div>
            <p className="mb-1 text-sm text-muted-foreground">Photos</p>
            <Photos photos={openPhotos} />
          </div>
          <div>
            <p className="mb-1 text-sm text-muted-foreground">Signature</p>
            <Signature src={job.openSignature} name={job.reportedByName} when={job.openSignedAt} />
          </div>
        </section>

        <section className="space-y-4">
          <div className="space-y-3 rounded-lg border p-3">
            <h3 className="font-semibold">Work side</h3>
            <Line label="Technician" value={job.mechanicName} />
            <Line label="Hours" value={job.hoursWorked == null ? null : String(job.hoursWorked)} />
            {job.mode === "internal" && (
              <Line label="Downtime hours" value={job.downtimeHours == null ? null : String(job.downtimeHours)} />
            )}
            <div>
              <p className="text-sm text-muted-foreground">Comment</p>
              <p className="whitespace-pre-wrap text-sm">{job.workComment?.trim() || "—"}</p>
            </div>
            <div>
              <p className="mb-1 text-sm text-muted-foreground">Parts</p>
              {job.parts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No parts recorded</p>
              ) : (
                <table className="w-full text-sm">
                  <tbody>
                    {job.parts.map((part, index) => (
                      <tr key={`${part.name}-${index}`} className="border-t">
                        <td className="py-1 pr-2">{part.name}</td>
                        <td className="py-1 pr-2 text-right">{part.qty}</td>
                        <td className="py-1 text-right">{formatRand(part.qty * part.cost)}</td>
                      </tr>
                    ))}
                    <tr className="border-t font-medium">
                      <td className="py-1" colSpan={2}>Parts total</td>
                      <td className="py-1 text-right">{formatRand(partsTotal)}</td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
            <div>
              <p className="mb-1 text-sm text-muted-foreground">Photos</p>
              <Photos photos={workPhotos} />
            </div>
            <div>
              <p className="mb-1 text-sm text-muted-foreground">Technician signature</p>
              <Signature src={job.technicianSignature} name={job.mechanicName} when={job.technicianSignedAt} />
            </div>
          </div>

          <div className="space-y-3 rounded-lg border p-3">
            <h3 className="font-semibold">Sign-off</h3>
            <Line label={labels.accept} value={job.acceptName} />
            <div>
              <p className="text-sm text-muted-foreground">{labels.acceptComment}</p>
              <p className="whitespace-pre-wrap text-sm">{job.acceptComment?.trim() || "—"}</p>
            </div>
            <div>
              <p className="mb-1 text-sm text-muted-foreground">{labels.acceptSign}</p>
              <Signature src={job.acceptSignature} name={job.acceptName} when={job.acceptedAt} />
            </div>
            {job.completedAt && (
              <p className="text-xs text-muted-foreground">Closed {formatWhen(job.completedAt)}</p>
            )}
          </div>
        </section>
      </div>
    </article>
  );
}
