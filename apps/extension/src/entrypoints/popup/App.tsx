import { useEffect, useMemo, useState } from "react";

import { generateDraft, issueSessionToken, type GenerationResponse } from "../../lib/api";
import { requestCapturedJobFromActiveTab } from "../../lib/runtime";
import { getDraftProfile, getOrCreateIdentity } from "../../lib/storage";
import type { CapturedJob } from "../../types/messages";

export function PopupApp() {
  const [capturedJob, setCapturedJob] = useState<CapturedJob | null>(null);
  const [profile, setProfile] = useState<{
    email: string;
    fullName: string;
    skills: string[];
    experienceSummary: string;
  } | null>(null);
  const [profileName, setProfileName] = useState("Guest");
  const [status, setStatus] = useState("Ready");
  const [isGenerating, setIsGenerating] = useState(false);
  const [tone, setTone] = useState<"formal" | "concise" | "friendly">("formal");
  const [result, setResult] = useState<GenerationResponse | null>(null);

  useEffect(() => {
    void (async () => {
      const storedProfile = await getDraftProfile();
      if (storedProfile?.fullName) {
        setProfileName(storedProfile.fullName);
        setProfile(storedProfile);
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
    setResult(null);
    setStatus("Job captured. Ready for generation.");
  }

  async function handleGenerate(): Promise<void> {
    if (!capturedJob) {
      setStatus("Capture a job before generating a draft.");
      return;
    }

    if (!profile || !profile.email || profile.skills.length === 0 || profile.experienceSummary.length < 20) {
      setStatus("Complete your profile in Options before generating.");
      return;
    }

    setIsGenerating(true);
    setStatus("Authenticating...");

    try {
      const identity = await getOrCreateIdentity();
      const token = await issueSessionToken({
        userId: identity.userId,
        email: profile.email
      });

      setStatus("Generating tailored draft...");

      const generated = await generateDraft(token.accessToken, {
        tone,
        job: {
          title: capturedJob.title,
          company: capturedJob.company,
          location: capturedJob.location,
          description: capturedJob.description,
          employmentType: "other",
          sourceUrl: capturedJob.sourceUrl
        },
        applicantProfile: {
          fullName: profile.fullName,
          skills: profile.skills,
          experienceSummary: profile.experienceSummary
        }
      });

      setResult(generated);
      setStatus("Draft generated successfully.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Generation failed";
      setStatus(message);
    } finally {
      setIsGenerating(false);
    }
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
          onClick={() => {
            void handleGenerate();
          }}
          disabled={isGenerating}
          className="rounded-2xl bg-coral px-3 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5"
        >
          {isGenerating ? "Generating..." : "Generate Draft"}
        </button>
      </section>

      <section className="mt-4 rounded-2xl border border-ink/10 bg-white/90 p-3">
        <label className="font-mono text-xs uppercase tracking-[0.2em] text-ink/60" htmlFor="tone-select">
          Tone
        </label>
        <select
          id="tone-select"
          value={tone}
          onChange={(event) => setTone(event.target.value as "formal" | "concise" | "friendly")}
          className="mt-2 w-full rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm"
        >
          <option value="formal">Formal</option>
          <option value="concise">Concise</option>
          <option value="friendly">Friendly</option>
        </select>
      </section>

      {result ? (
        <section className="mt-4 space-y-3 rounded-2xl border border-aqua/30 bg-aqua/5 p-3">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-aqua">Generated Draft</p>
          <h2 className="text-sm font-semibold">{result.output.subjectLine}</h2>
          <ul className="list-disc space-y-1 pl-4 text-xs text-ink/80">
            {result.output.keyHighlights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <article className="max-h-40 overflow-auto whitespace-pre-wrap rounded-xl border border-ink/10 bg-white px-3 py-2 text-xs leading-5">
            {result.output.coverLetter}
          </article>
        </section>
      ) : null}

      <footer className="mt-4 rounded-2xl border border-ink/10 bg-white/80 px-3 py-2 text-xs text-ink/70">{status}</footer>
    </main>
  );
}
