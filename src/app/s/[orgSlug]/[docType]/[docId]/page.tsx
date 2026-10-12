import { notFound } from "next/navigation";
import { db } from "@/lib/db";

export default async function SecureLinkPage({
  params,
}: {
  params: Promise<{ orgSlug: string; docType: string; docId: string }>;
}) {
  const { orgSlug, docType, docId } = await params;
  const org = await db.organization.findUnique({ where: { slug: orgSlug } });
  if (!org) notFound();

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-16">
      <p className="text-sm text-muted-foreground">Secure link · {org.name}</p>
      <h1 className="mt-2 text-2xl font-semibold capitalize">
        {docType.replace(/-/g, " ")}
      </h1>
      <p className="mt-4 text-muted-foreground">
        Reference <span className="font-mono text-foreground">{docId}</span>. In production this
        page validates signed tokens, logs access, and renders the document or signature flow without
        exposing other tenants&apos; data.
      </p>
    </div>
  );
}
