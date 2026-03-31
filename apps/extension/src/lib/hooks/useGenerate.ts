import { useMutation } from "@tanstack/react-query";
import { message } from "antd";
import { generateDraft, type GenerationResponse, type AiGenerationRequest } from "../api";

export function useGenerateDraft(accessToken: string | null) {
  return useMutation<GenerationResponse, Error, AiGenerationRequest>({
    mutationFn: (payload) =>
      accessToken
        ? generateDraft(accessToken, payload)
        : Promise.reject(new Error("No token")),
    onSuccess: () => {
      message.success("Draft generated successfully");
    },
    onError: (error) => {
      message.error(error?.message || "Generation failed");
    }
  });
}
