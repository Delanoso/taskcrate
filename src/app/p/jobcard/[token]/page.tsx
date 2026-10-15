"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { JobCardEditor } from "@/components/modules/jobcard-editor";
import { JobCardSheet } from "@/components/modules/jobcard-sheet";
import type { JobCardView } from "@/lib/modules/jobcard-shared";

export default function Page() {
  const { token } = useParams<{ token: string }>();
  const [job, setJob] = useState<JobCardView | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    fetch(`/api/modules/jobcard/public/${token}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setMissing(true);
          return;
        }
        setJob(data.job);
      })
      .catch(() => setMissing(true));
  }, [token]);

  if (missing) return <p className="text-sm">This job card could not be found.</p>;
  if (!job) return <p className="text-sm text-muted-foreground">Loading job card…</p>;

  return (
    <div className="space-y-4">
      <JobCardSheet job={job} />
      {job.status === "done" ? (
        <p className="rounded-xl border bg-card p-4 text-sm">This job card is closed. Both sides have signed.</p>
      ) : (
        <JobCardEditor job={job} saveUrl={`/api/modules/jobcard/public/${token}`} onSaved={setJob} />
      )}
    </div>
  );
}
