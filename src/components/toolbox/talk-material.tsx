import { FileText } from "lucide-react";
import { TalkPage } from "@/components/toolbox/talk-page";
import type { LibraryTalk } from "@/data/toolbox-library/types";

function youtubeId(url: string) {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/);
  return m?.[1] ?? null;
}

export function TalkMaterial({
  library,
  content,
  mediaUrl,
  attachment,
}: {
  library: LibraryTalk | null;
  content: string;
  mediaUrl: string | null;
  attachment: { name: string; type: string; href: string } | null;
}) {
  if (library) return <TalkPage talk={library} />;

  const ytId = mediaUrl ? youtubeId(mediaUrl) : null;
  return (
    <section className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
      <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
        This week&apos;s safety material
      </h2>
      {content && <div className="text-sm leading-relaxed whitespace-pre-wrap">{content}</div>}
      {attachment?.type.startsWith("image/") && (
        <a href={attachment.href} target="_blank" rel="noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={attachment.href} alt={attachment.name} className="w-full rounded-lg border" />
        </a>
      )}
      {attachment?.type === "application/pdf" && (
        <a
          href={attachment.href}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 rounded-lg border p-3 text-sm font-medium hover:bg-muted"
        >
          <FileText className="size-5 shrink-0 text-red-600" />
          <span className="min-w-0 flex-1 truncate">{attachment.name}</span>
          <span className="text-xs text-primary">Open PDF</span>
        </a>
      )}
      {ytId ? (
        <div className="aspect-video overflow-hidden rounded-lg border">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${ytId}`}
            title="Toolbox talk video"
            className="size-full"
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        mediaUrl && (
          <p className="text-sm">
            <a href={mediaUrl} target="_blank" rel="noreferrer" className="underline">
              Open supporting media
            </a>
          </p>
        )
      )}
    </section>
  );
}
