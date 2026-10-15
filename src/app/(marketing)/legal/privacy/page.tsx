import Link from "next/link";
import { PRIVACY_NOTICE } from "@/content/legal";

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Privacy notice</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        <Link href="/legal/terms" className="underline">
          Terms & Conditions
        </Link>
      </p>
      <article className="prose prose-neutral mt-8 max-w-none whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground dark:prose-invert">
        {PRIVACY_NOTICE}
      </article>
    </div>
  );
}
