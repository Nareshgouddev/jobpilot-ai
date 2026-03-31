import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";
import {
  uploadResume,
  deleteResume,
  getResumeDownloadUrl
} from "../api";

export function useUploadResume(accessToken: string | null) {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: (file: File) =>
      accessToken
        ? uploadResume(accessToken, file)
        : Promise.reject("No token"),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      message.success(
        data.isDuplicate
          ? "Resume already on file"
          : "Resume uploaded successfully"
      );
    },
    onError: (error: any) => {
      message.error(error?.message || "Upload failed");
    }
  });
}

export function useDeleteResume(accessToken: string | null) {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: () =>
      accessToken ? deleteResume(accessToken) : Promise.reject("No token"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      message.success("Resume deleted");
    },
    onError: (error: any) => {
      message.error(error?.message || "Deletion failed");
    }
  });
}

export function useResumeDownloadUrl(accessToken: string | null) {
  const { message } = App.useApp();

  return useMutation({
    mutationFn: () =>
      accessToken
        ? getResumeDownloadUrl(accessToken)
        : Promise.reject("No token"),
    onSuccess: (data) => {
      window.open(data.downloadUrl, "_blank");
    },
    onError: (error: any) => {
      message.error(error?.message || "Download failed");
    }
  });
}
