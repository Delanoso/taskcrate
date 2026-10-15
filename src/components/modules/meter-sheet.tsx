import { formatAmount, formatWhen, type ReadingView } from "@/lib/modules/meter-shared";

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

export function ReadingSheet({ reading, unit }: { reading: ReadingView; unit: string }) {
  const photos = [
    reading.photoUrl ? { url: reading.photoUrl, label: "Meter" } : null,
    reading.extraPhotoUrl ? { url: reading.extraPhotoUrl, label: "Extra" } : null,
    reading.checkPhotoUrl ? { url: reading.checkPhotoUrl, label: "Check" } : null,
  ].filter((item): item is { url: string; label: string } => Boolean(item));

  return (
    <article className="space-y-4 rounded-xl border bg-card p-4">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">{formatAmount(reading.reading, unit)}</h3>
          <p className="text-sm text-muted-foreground">{formatWhen(reading.createdAt)}</p>
        </div>
        <p className={`text-sm font-medium ${reading.alerted && !reading.checkedAt ? "text-destructive" : "text-muted-foreground"}`}>
          {reading.alerted ? (reading.checkedAt ? "Checked" : "Flagged") : "Within limit"}
        </p>
      </header>

      {reading.legacy && <p className="text-sm text-muted-foreground">Saved before names and signatures were kept.</p>}
      <div className="grid gap-1 text-sm sm:grid-cols-2">
        <p>Previous {formatAmount(reading.previousReading, unit)}</p>
        <p>Usage {formatAmount(reading.usage, unit)}</p>
        <p>Occupancy {reading.occupancy}</p>
      </div>
      {reading.varianceNote && <p className="text-sm">{reading.varianceNote}</p>}
      {reading.note && <p className="whitespace-pre-wrap text-sm">{reading.note}</p>}
      {reading.alerted && !reading.checkedAt && <p className="text-sm font-medium text-destructive">This reading needs a signed check.</p>}

      <div>
        <p className="mb-1 text-sm font-medium">Photos</p>
        {photos.length === 0 ? (
          <p className="text-sm text-muted-foreground">No photo on this reading</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {photos.map((photo) => (
              <a key={photo.url} href={photo.url} target="_blank" rel="noreferrer" className="block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.url} alt={photo.label} className="h-24 w-32 rounded-md border object-cover" />
                <span className="mt-1 block text-xs text-muted-foreground">{photo.label}</span>
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-xs text-muted-foreground">Read by</p>
          {reading.legacy ? <p className="text-sm text-muted-foreground">Not signed</p> : <Sign src={reading.readerSignature} name={reading.readerName} when={formatWhen(reading.createdAt)} />}
        </div>
        {reading.checkedAt && (
          <div>
            <p className="text-xs text-muted-foreground">Checked by</p>
            <Sign src={reading.checkedSignature} name={reading.checkedByName} when={formatWhen(reading.checkedAt)} />
            {reading.checkNote && <p className="mt-1 whitespace-pre-wrap text-sm">{reading.checkNote}</p>}
          </div>
        )}
      </div>
    </article>
  );
}
