import { formatWhen, stockKindLabel, type StockMoveView } from "@/lib/modules/stock-shared";

function Sign({ src, name }: { src: string | null; name: string | null }) {
  if (!name && !src) return <p className="text-sm text-muted-foreground">Not recorded</p>;
  return (
    <div>
      <p className="text-sm font-medium">{name || "Signed"}</p>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name ? `Signature of ${name}` : "Signature"} className="mt-1 h-14 max-w-full rounded-md border bg-white object-contain" />
      ) : (
        <p className="text-xs text-muted-foreground">No signature on this entry</p>
      )}
    </div>
  );
}

export function StockRegister({ movements, unit }: { movements: StockMoveView[]; unit: string }) {
  if (!movements.length) {
    return <p className="text-sm text-muted-foreground">No movements yet. The register starts with the first signed entry.</p>;
  }
  return (
    <ol className="space-y-3">
      {movements.map((move) => (
        <li key={move.id} className="rounded-lg border p-3 text-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-medium">{stockKindLabel(move.kind)} · {move.kind === "adjust" ? `${move.balanceAfter ?? "—"} ${unit} counted` : `${move.quantity} ${unit}`}</p>
            <p className="text-xs text-muted-foreground">{formatWhen(move.createdAt)}</p>
          </div>
          {move.balanceAfter != null && <p className="text-muted-foreground">On hand after: {move.balanceAfter} {unit}</p>}
          {move.note === "Opening balance" ? (
            <div className="mt-2">
              <p className="text-xs text-muted-foreground">Counted and logged by</p>
              <Sign src={move.loggedBySignature} name={move.loggedByName} />
            </div>
          ) : (
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">{move.kind === "issue" ? "Signed out to" : move.kind === "return" ? "Returned by" : move.kind === "adjust" ? "Counted by" : move.kind === "receive" ? "Delivered by" : "Person"}</p>
                <Sign src={move.partySignature} name={move.partyName} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{move.kind === "adjust" ? "Checked by" : "Logged by"}</p>
                <Sign src={move.loggedBySignature} name={move.loggedByName} />
              </div>
            </div>
          )}
          {move.jobRef && <p className="mt-2">Job: {move.jobRef}</p>}
          {move.reason && <p className="mt-1 whitespace-pre-wrap">Reason: {move.reason}</p>}
          {move.note && <p className="mt-1 whitespace-pre-wrap">{move.note}</p>}
        </li>
      ))}
    </ol>
  );
}
