import { notFound } from "next/navigation";
import { ToolboxPublicForm } from "@/components/platform/toolbox-public-form";
import { db } from "@/lib/db";
import { findLibraryTalk } from "@/data/toolbox-library";

export default async function PublicToolboxTalkPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const talk = await db.toolboxTalk.findUnique({
    where: { publicToken: token },
    include: { organization: { include: { branding: true } } },
  });

  if (!talk || talk.status !== "open") notFound();

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,oklch(0.94_0.03_250),oklch(0.98_0_0)_50%)]">
      <div className="mx-auto max-w-lg px-4 py-10 sm:py-14">
        <ToolboxPublicForm
          token={token}
          talk={{
            title: talk.title,
            weekLabel: talk.weekLabel,
            content: talk.content,
            mediaUrl: talk.mediaUrl,
            companyName: talk.organization.branding?.displayName ?? talk.organization.name,
            library: findLibraryTalk(talk.librarySlug) ?? null,
            attachment: talk.attachmentUrl
              ? { name: talk.attachmentName ?? "Attachment", type: talk.attachmentType ?? "" }
              : null,
          }}
        />
      </div>
    </div>
  );
}
