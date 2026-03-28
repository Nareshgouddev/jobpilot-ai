import { useEffect, useMemo, useState } from "react";

import { requestCapturedJobFromActiveTab } from "../../lib/runtime";
import { getDraftProfile } from "../../lib/storage";
import type { CapturedJob } from "../../types/messages";

export function PopupApp() {
  const [capturedJob, setCapturedJob] = useState<CapturedJob | null>(null);
  const [profileName, setProfileName] = useState("Guest");
  const [status, setStatus] = useState("Ready");

  useEffect(() => {
    void (async () => {
      const profile = await getDraftProfile();
      if (profile?.fullName) {
        setProfileName(profile.fullName);
      }
    })();
  }, []);

  async function handleCaptureJob(): Promise<void> {
    setStatus("Scanning page...");
    const job = await requestCapturedJobFromActiveTab();

    if (!job) {
      setStatus("No job metadata detected on this page.");
      return;
    }

    setCapturedJob(job);
    setStatus("Job captured. Ready for generation.");
  }

  const summary = useMemo(() => {
    if (!capturedJob) {
      return "Open a job page and click Capture Job to prefill your draft.";
    }

    return `${capturedJob.title} at ${capturedJob.company}`;
  }, [capturedJob]);

  return (
    <main className="card-grid min-h-[560px] bg-paper p-4 text-ink">
      <section className="mb-4 rounded-3xl border border-ink/10 bg-white/90 p-4 shadow-glow">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-aqua">JobPilot AI</p>
        <h1 className="mt-2 font-display text-2xl font-bold leading-tight">Application Copilot</h1>
        <p className="mt-2 text-sm text-ink/70">Welcome back, {profileName}. Build a tailored draft in under a minute.</p>
      </section>

      <section className="space-y-3 rounded-3xl border border-ink/10 bg-white/90 p-4">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-coral">Active Job</p>
        <p className="text-sm leading-6">{summary}</p>
        {capturedJob ? (
          <p className="rounded-xl bg-aqua/10 px-3 py-2 text-xs text-aqua">Source: {capturedJob.sourceUrl}</p>
        ) : null}
      </section>

      <section className="mt-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => {
            void handleCaptureJob();
          }}
          className="rounded-2xl bg-ink px-3 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5"
        >
          Capture Job
        </button>
        <button
          type="button"
          className="rounded-2xl bg-coral px-3 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5"
        >
          Generate Draft
        </button>
      </section>

      <footer className="mt-4 rounded-2xl border border-ink/10 bg-white/80 px-3 py-2 text-xs text-ink/70">{status}</footer>
    </main>
  );
}
