import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";
import {
  getProfile,
  updateProfile,
  type CandidateProfileResponse
} from "../api";
import type { CandidateProfile } from "@jobpilot/shared";

export function useProfile(accessToken: string | null) {
  return useQuery({
    queryKey: ["profile"],
    queryFn: () => (accessToken ? getProfile(accessToken) : null),
    enabled: !!accessToken,
    staleTime: 5 * 60 * 1000
  });
}

export function useUpdateProfile(accessToken: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CandidateProfile) =>
      accessToken
        ? updateProfile(accessToken, data)
        : Promise.reject("No token"),
    onSuccess: (updated) => {
      queryClient.setQueryData(["profile"], updated);
      message.success("Profile saved successfully");
    },
    onError: (error: any) => {
      message.error(error?.message || "Failed to save profile");
    }
  });
}
