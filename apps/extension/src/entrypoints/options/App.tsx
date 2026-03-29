import { useEffect, useState } from "react";

import { getDraftProfile, setDraftProfile } from "../../lib/storage";

export function OptionsApp() {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [skills, setSkills] = useState("");
  const [experienceSummary, setExperienceSummary] = useState("");
  const [status, setStatus] = useState("Edit your profile and save.");

  useEffect(() => {
    void (async () => {
      const existing = await getDraftProfile();
      if (!existing) {
        return;
      }

      setEmail(existing.email);
      setFullName(existing.fullName);
      setSkills(existing.skills.join(", "));
      setExperienceSummary(existing.experienceSummary);
    })();
  }, []);

  async function saveProfile(): Promise<void> {
    const parsedSkills = skills
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    await setDraftProfile({
      email,
      fullName,
      skills: parsedSkills,
      experienceSummary
    });

    setStatus("Profile saved to extension storage.");
  }

  return (
    <main className="min-h-screen bg-paper p-6 text-ink">
      <section className="mx-auto max-w-3xl rounded-3xl border border-ink/10 bg-white/90 p-6 shadow-glow">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-aqua">JobPilot Settings</p>
        <h1 className="mt-2 font-display text-3xl font-bold">Profile Preferences</h1>
        <p className="mt-2 text-sm text-ink/70">This data is used to personalize generated drafts.</p>

        <div className="mt-6 space-y-4">
          <label className="block text-sm font-semibold">
            Email
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full rounded-xl border border-ink/20 px-3 py-2"
              placeholder="you@example.com"
            />
          </label>

          <label className="block text-sm font-semibold">
            Full Name
            <input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="mt-1 w-full rounded-xl border border-ink/20 px-3 py-2"
              placeholder="Taylor Dev"
            />
          </label>

          <label className="block text-sm font-semibold">
            Top Skills (comma-separated)
            <input
              value={skills}
              onChange={(event) => setSkills(event.target.value)}
              className="mt-1 w-full rounded-xl border border-ink/20 px-3 py-2"
              placeholder="React, TypeScript, System Design"
            />
          </label>

          <label className="block text-sm font-semibold">
            Experience Summary
            <textarea
              value={experienceSummary}
              onChange={(event) => setExperienceSummary(event.target.value)}
              className="mt-1 min-h-40 w-full rounded-xl border border-ink/20 px-3 py-2"
              placeholder="Briefly describe your impact and experience..."
            />
          </label>

          <button
            type="button"
            onClick={() => {
              void saveProfile();
            }}
            className="rounded-xl bg-ink px-5 py-3 text-sm font-semibold text-white"
          >
            Save Profile
          </button>
        </div>

        <p className="mt-4 text-sm text-ink/70">{status}</p>
      </section>
    </main>
  );
}
