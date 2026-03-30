import { useEffect, useState } from "react";

import { setDraftProfile } from "../../lib/storage";
import type { EducationEntry } from "@jobpilot/shared";

export function OptionsApp() {
  // Personal Info
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("");
  const [postalCode, setPostalCode] = useState("");

  // Professional
  const [skills, setSkills] = useState("");
  const [experienceSummary, setExperienceSummary] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [certifications, setCertifications] = useState("");

  // Education
  const [educationEntries, setEducationEntries] = useState<EducationEntry[]>([]);

  // Status
  const [status, setStatus] = useState("Edit your profile and save.");

  useEffect(() => {
    void (async () => {
      const { getDraftProfile } = await import("../../lib/storage");
      const existing = await getDraftProfile();
      if (!existing) return;

      setEmail(existing.email ?? "");
      setFullName(existing.fullName ?? "");
      setSkills(existing.skills?.join(", ") ?? "");
      setExperienceSummary(existing.experienceSummary ?? "");
    })();
  }, []);

  function addEducationEntry() {
    setEducationEntries((prev) => [
      ...prev,
      { institution: "", degree: "", fieldOfStudy: "", startYear: "", endYear: "", gpa: "" }
    ]);
  }

  function updateEducationEntry(index: number, field: keyof EducationEntry, value: string) {
    setEducationEntries((prev) =>
      prev.map((entry, i) => (i === index ? { ...entry, [field]: value } : entry))
    );
  }

  function removeEducationEntry(index: number) {
    setEducationEntries((prev) => prev.filter((_, i) => i !== index));
  }

  async function saveProfile(): Promise<void> {
    const parsedSkills = skills
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    const parsedCertifications = certifications
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
      .slice(0, 100);

    const cleanedEducation = educationEntries
      .filter((e) => e.institution.trim() && e.degree.trim())
      .map((e) => ({
        institution: e.institution.trim(),
        degree: e.degree.trim(),
        fieldOfStudy: e.fieldOfStudy?.trim() || undefined,
        startYear: e.startYear?.trim() || undefined,
        endYear: e.endYear?.trim() || undefined,
        gpa: e.gpa?.trim() || undefined
      }));

    await setDraftProfile({
      email,
      fullName,
      skills: parsedSkills,
      experienceSummary,
      phone,
      address,
      city,
      state,
      country,
      postalCode,
      linkedinUrl,
      portfolioUrl,
      certifications: parsedCertifications,
      education: cleanedEducation
    } as Parameters<typeof setDraftProfile>[0]);

    setStatus("Profile saved to extension storage.");
  }

  return (
    <main className="min-h-screen bg-paper p-6 text-ink">
      <section className="mx-auto max-w-3xl rounded-3xl border border-ink/10 bg-white/90 p-6 shadow-glow">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-aqua">JobPilot Settings</p>
        <h1 className="mt-2 font-display text-3xl font-bold">Profile Preferences</h1>
        <p className="mt-2 text-sm text-ink/70">
          This data is used to personalize generated drafts.
        </p>

        <div className="mt-6 space-y-6">

          {/* Personal Information */}
          <div>
            <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-ink/60">Personal Information</h2>
            <div className="mt-3 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <label className="block text-sm font-semibold">
                  Full Name *
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-ink/20 px-3 py-2"
                    placeholder="Taylor Dev"
                    required
                  />
                </label>
                <label className="block text-sm font-semibold">
                  Email *
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-ink/20 px-3 py-2"
                    placeholder="you@example.com"
                    required
                  />
                </label>
              </div>

              <label className="block text-sm font-semibold">
                Phone
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-ink/20 px-3 py-2"
                  placeholder="+1 (555) 000-0000"
                  inputMode="tel"
                />
              </label>

              <label className="block text-sm font-semibold">
                Street Address
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-ink/20 px-3 py-2"
                  placeholder="123 Main St"
                  autocomplete="street-address"
                />
              </label>

              <div className="grid grid-cols-2 gap-4">
                <label className="block text-sm font-semibold">
                  City
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-ink/20 px-3 py-2"
                    placeholder="San Francisco"
                    autocomplete="address-level2"
                  />
                </label>
                <label className="block text-sm font-semibold">
                  State / Province
                  <input
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-ink/20 px-3 py-2"
                    placeholder="CA"
                    autocomplete="address-level1"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="block text-sm font-semibold">
                  Country
                  <input
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-ink/20 px-3 py-2"
                    placeholder="United States"
                    autocomplete="country-name"
                  />
                </label>
                <label className="block text-sm font-semibold">
                  Postal Code
                  <input
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-ink/20 px-3 py-2"
                    placeholder="94102"
                    autocomplete="postal-code"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Professional Information */}
          <div>
            <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-ink/60">Professional</h2>
            <div className="mt-3 space-y-4">
              <label className="block text-sm font-semibold">
                Top Skills * (comma-separated)
                <input
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-ink/20 px-3 py-2"
                  placeholder="React, TypeScript, System Design"
                />
              </label>

              <label className="block text-sm font-semibold">
                Experience Summary *
                <textarea
                  value={experienceSummary}
                  onChange={(e) => setExperienceSummary(e.target.value)}
                  className="mt-1 min-h-40 w-full rounded-xl border border-ink/20 px-3 py-2"
                  placeholder="Briefly describe your impact and experience..."
                />
              </label>

              <label className="block text-sm font-semibold">
                LinkedIn URL
                <input
                  type="url"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-ink/20 px-3 py-2"
                  placeholder="https://linkedin.com/in/yourprofile"
                  inputMode="url"
                />
              </label>

              <label className="block text-sm font-semibold">
                Portfolio / Website URL
                <input
                  type="url"
                  value={portfolioUrl}
                  onChange={(e) => setPortfolioUrl(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-ink/20 px-3 py-2"
                  placeholder="https://yourportfolio.com"
                  inputMode="url"
                />
              </label>

              <label className="block text-sm font-semibold">
                Certifications (comma-separated)
                <input
                  value={certifications}
                  onChange={(e) => setCertifications(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-ink/20 px-3 py-2"
                  placeholder="AWS Solutions Architect, PMP"
                />
              </label>
            </div>
          </div>

          {/* Education */}
          <div>
            <div className="flex items-center justify-between">
              <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-ink/60">Education</h2>
              <button
                type="button"
                onClick={addEducationEntry}
                className="rounded-xl border border-ink/20 px-3 py-1 text-xs font-semibold text-ink hover:bg-ink/5"
              >
                + Add Education
              </button>
            </div>

            <div className="mt-3 space-y-3">
              {educationEntries.length === 0 && (
                <p className="text-sm text-ink/50">No education entries added yet.</p>
              )}

              {educationEntries.map((entry, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-ink/10 bg-paper/50 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <label className="block text-xs font-medium">
                          Institution *
                          <input
                            value={entry.institution}
                            onChange={(e) => updateEducationEntry(index, "institution", e.target.value)}
                            className="mt-1 w-full rounded-lg border border-ink/20 px-2 py-1 text-sm"
                            placeholder="Stanford University"
                          />
                        </label>
                        <label className="block text-xs font-medium">
                          Degree *
                          <input
                            value={entry.degree}
                            onChange={(e) => updateEducationEntry(index, "degree", e.target.value)}
                            className="mt-1 w-full rounded-lg border border-ink/20 px-2 py-1 text-sm"
                            placeholder="Bachelor of Science"
                          />
                        </label>
                      </div>
                      <label className="block text-xs font-medium">
                        Field of Study
                        <input
                          value={entry.fieldOfStudy ?? ""}
                          onChange={(e) => updateEducationEntry(index, "fieldOfStudy", e.target.value)}
                          className="mt-1 w-full rounded-lg border border-ink/20 px-2 py-1 text-sm"
                          placeholder="Computer Science"
                        />
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <label className="block text-xs font-medium">
                          Start Year
                          <input
                            value={entry.startYear ?? ""}
                            onChange={(e) => updateEducationEntry(index, "startYear", e.target.value)}
                            className="mt-1 w-full rounded-lg border border-ink/20 px-2 py-1 text-sm"
                            placeholder="2018"
                          />
                        </label>
                        <label className="block text-xs font-medium">
                          End Year
                          <input
                            value={entry.endYear ?? ""}
                            onChange={(e) => updateEducationEntry(index, "endYear", e.target.value)}
                            className="mt-1 w-full rounded-lg border border-ink/20 px-2 py-1 text-sm"
                            placeholder="2022 or present"
                          />
                        </label>
                        <label className="block text-xs font-medium">
                          GPA
                          <input
                            value={entry.gpa ?? ""}
                            onChange={(e) => updateEducationEntry(index, "gpa", e.target.value)}
                            className="mt-1 w-full rounded-lg border border-ink/20 px-2 py-1 text-sm"
                            placeholder="3.8"
                          />
                        </label>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeEducationEntry(index)}
                      className="mt-5 shrink-0 rounded-lg px-2 py-1 text-xs text-coral hover:bg-coral/10"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                void saveProfile();
              }}
              className="rounded-xl bg-ink px-5 py-3 text-sm font-semibold text-white hover:bg-ink/90"
            >
              Save Profile
            </button>
          </div>

          <p className="text-sm text-ink/70">{status}</p>
        </div>
      </section>
    </main>
  );
}
