import { formatGps, formatWhen, mapsUrl, type ObEntryView } from "@/lib/modules/ob-shared";

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

export function ObSheet({ entry }: { entry: ObEntryView }) {
  const gps = formatGps(entry.lat, entry.lng);
  const map = mapsUrl(entry.lat, entry.lng);
  const photos = [
    entry.photoUrl ? { url: entry.photoUrl, label: "Photo" } : null,
    entry.extraPhotoUrl ? { url: entry.extraPhotoUrl, label: "Another photo" } : null,
  ].filter((item): item is { url: string; label: string } => Boolean(item));

  return (
    <article className="space-y-4 rounded-xl border bg-card p-4">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">{entry.entryNumber ? `${entry.entryNumber} · ${entry.category}` : entry.category}</h3>
          <p className="text-sm text-muted-foreground">Filed {formatWhen(entry.createdAt)}</p>
        </div>
        <p className="text-sm font-medium text-muted-foreground">Filed</p>
      </header>

      {entry.legacy && <p className="text-sm text-muted-foreground">Saved before names and signatures were kept.</p>}
      {entry.notes && <p className="whitespace-pre-wrap text-sm">{entry.notes}</p>}

      <div className="grid gap-1 text-sm sm:grid-cols-2">
        {entry.people && <p>People {entry.people}</p>}
        {entry.actionTaken && <p className="sm:col-span-2">Action {entry.actionTaken}</p>}
        <p>
          GPS{" "}
          {gps && map ? (
            <a className="underline" href={map} target="_blank" rel="noreferrer">{gps}</a>
          ) : (
            "Not captured"
          )}
        </p>
      </div>

      <div>
        <p className="mb-1 text-sm font-medium">Photos</p>
        {photos.length === 0 ? (
          <p className="text-sm text-muted-foreground">No photo on this entry</p>
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
          <p className="text-xs text-muted-foreground">Filed by</p>
          {entry.legacy ? (
            <p className="text-sm text-muted-foreground">Not signed</p>
          ) : (
            <Sign src={entry.guardSignature} name={entry.guardName} when={formatWhen(entry.createdAt)} />
          )}
        </div>
        {entry.handoverToName && (
          <div>
            <p className="text-xs text-muted-foreground">Taken over by</p>
            <Sign src={entry.handoverToSignature} name={entry.handoverToName} when={formatWhen(entry.createdAt)} />
          </div>
        )}
      </div>
    </article>
  );
}
