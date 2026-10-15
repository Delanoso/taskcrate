import { formatKm, formatWhen, PANEL_SIDES, type TripView } from "@/lib/modules/pretrip-shared";

function Sign({ src, name, when }: { src: string | null; name: string | null; when: string | null }) {
  if (!name && !src) return <p className="text-sm text-muted-foreground">Not signed</p>;
  return (
    <div>
      <p className="text-sm font-medium">{name || "Signed"}</p>
      {when && <p className="text-xs text-muted-foreground">{when}</p>}
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name ? `Signature of ${name}` : "Signature"} className="mt-1 h-16 max-w-full rounded-md border bg-white object-contain" />
      ) : (
        <p className="text-xs text-muted-foreground">Signature is on the record</p>
      )}
    </div>
  );
}

function sideLabel(side: string) {
  return PANEL_SIDES.find((panel) => panel.key === side)?.label ?? (side === "damage" ? "Damage" : "Photo");
}

export function TripSheet({ trip }: { trip: TripView }) {
  const failed = trip.checks.filter((check) => !check.pass);
  return (
    <article className="space-y-4 rounded-xl border bg-card p-4">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">{trip.driverName}</h3>
          <p className="text-sm text-muted-foreground">Started {formatWhen(trip.startedAt)}</p>
          {trip.endedAt && <p className="text-sm text-muted-foreground">Ended {formatWhen(trip.endedAt)}</p>}
          {trip.handoverAt && <p className="text-sm text-muted-foreground">Handed over {formatWhen(trip.handoverAt)}</p>}
        </div>
        <p className={`text-sm font-medium ${trip.open ? "text-primary" : "text-muted-foreground"}`}>{trip.open ? "On the road" : "Ended"}</p>
      </header>

      <div className="grid gap-1 text-sm sm:grid-cols-2">
        <p>Start {formatKm(trip.startKm)}</p>
        <p>End {trip.endKm == null ? "—" : formatKm(trip.endKm)}</p>
        {trip.licenceNo && <p>Licence {trip.licenceNo}</p>}
        {trip.site && <p>Where {trip.site}</p>}
      </div>
      {trip.varianceFlag && <p className="text-sm font-medium text-destructive">Kilometre gap against the previous trip. A job card was opened.</p>}
      {failed.length > 0 && <p className="text-sm font-medium text-destructive">A failed check opened a job card.</p>}

      <div>
        <p className="mb-1 text-sm font-medium">Checks</p>
        <ul className="space-y-1 text-sm">
          {trip.checks.map((check) => (
            <li key={check.key} className={check.pass ? "text-muted-foreground" : "font-medium text-destructive"}>
              {check.pass ? "Pass" : "Fail"} · {check.label}
            </li>
          ))}
        </ul>
        {failed.length > 0 && trip.faultNote && <p className="mt-2 whitespace-pre-wrap text-sm">{trip.faultNote}</p>}
      </div>

      <div>
        <p className="mb-1 text-sm font-medium">Photos</p>
        {trip.photos.length === 0 ? (
          <p className="text-sm text-muted-foreground">No photos on this entry</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {trip.photos.map((photo) => (
              <a key={photo.url} href={photo.url} target="_blank" rel="noreferrer" className="block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.url} alt={sideLabel(photo.side)} className="h-24 w-32 rounded-md border object-cover" />
                <span className="mt-1 block text-xs text-muted-foreground">{sideLabel(photo.side)}</span>
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-xs text-muted-foreground">Driver at start</p>
          <Sign src={trip.driverSignature} name={trip.driverName} when={formatWhen(trip.startedAt)} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Driver at the end</p>
          <Sign src={trip.endSignature} name={trip.endDriverName} when={formatWhen(trip.endedAt)} />
        </div>
      </div>
      {trip.endNote && <p className="whitespace-pre-wrap text-sm">{trip.endNote}</p>}

      {(trip.handoverFrom || trip.handoverTo) && (
        <div className="space-y-2 rounded-lg border p-3">
          <p className="text-sm font-medium">Handover{trip.handoverKm != null ? ` at ${formatKm(trip.handoverKm)}` : ""}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Handed over by</p>
              <Sign src={trip.handoverFromSignature} name={trip.handoverFrom} when={formatWhen(trip.handoverAt)} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Taken by</p>
              <Sign src={trip.handoverToSignature} name={trip.handoverTo} when={formatWhen(trip.handoverAt)} />
            </div>
          </div>
          {trip.handoverNote && <p className="whitespace-pre-wrap text-sm">{trip.handoverNote}</p>}
        </div>
      )}
    </article>
  );
}
