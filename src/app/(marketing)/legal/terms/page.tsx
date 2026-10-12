import { TERMS_AND_CONDITIONS } from "@/content/legal";

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Terms & Conditions</h1>
      <article className="prose prose-neutral mt-8 max-w-none whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground dark:prose-invert">
        {TERMS_AND_CONDITIONS}
      </article>
    </div>
  );
}
