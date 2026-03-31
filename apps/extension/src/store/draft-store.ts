import { create } from "zustand";
import type { CapturedJob } from "../types/messages";
import type { GenerationResponse } from "../lib/api";

interface DraftState {
  capturedJob: CapturedJob | null;
  generatedDraft: GenerationResponse | null;
  tone: "formal" | "concise" | "friendly";
  isGenerating: boolean;

  setCapturedJob: (job: CapturedJob | null) => void;
  setGeneratedDraft: (draft: GenerationResponse | null) => void;
  setTone: (tone: "formal" | "concise" | "friendly") => void;
  setIsGenerating: (isGenerating: boolean) => void;
  reset: () => void;
}

export const useDraftStore = create<DraftState>((set) => ({
  capturedJob: null,
  generatedDraft: null,
  tone: "formal",
  isGenerating: false,

  setCapturedJob: (job) => set({ capturedJob: job }),
  setGeneratedDraft: (draft) => set({ generatedDraft: draft }),
  setTone: (tone) => set({ tone }),
  setIsGenerating: (isGenerating) => set({ isGenerating }),
  reset: () =>
    set({
      capturedJob: null,
      generatedDraft: null,
      tone: "formal",
      isGenerating: false
    })
}));
