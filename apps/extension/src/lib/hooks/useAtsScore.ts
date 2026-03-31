import { useMutation, useQuery } from "@tanstack/react-query";
import { message } from "antd";
import { computeAtsScore, getAtsHistory, type AtsScoreRequest } from "../api";

export function useComputeAtsScore(accessToken: string | null) {
  return useMutation({
    mutationFn: (request: AtsScoreRequest) =>
      accessToken
        ? computeAtsScore(accessToken, request)
        : Promise.reject("No token"),
    onSuccess: () => {
      message.success("ATS score computed");
    },
    onError: (error: any) => {
      message.error(error?.message || "ATS scoring failed");
    }
  });
}

export function useAtsHistory(accessToken: string | null, limit = 20) {
  return useQuery({
    queryKey: ["ats-history", limit],
    queryFn: () =>
      accessToken ? getAtsHistory(accessToken, limit) : null,
    enabled: !!accessToken,
    staleTime: 10 * 60 * 1000
  });
}
