import Link from "next/link";
import { TERMS_AND_CONDITIONS } from "@/content/legal";

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Terms & Conditions</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        <Link href="/legal/privacy" className="underline">
          Privacy notice
        </Link>
      </p>
      <article className="prose prose-neutral mt-8 max-w-none whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground dark:prose-invert">
        {TERMS_AND_CONDITIONS}
      </article>
    </div>
  );
}
