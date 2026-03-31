import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";
import {
  getApplications,
  createApplication,
  updateApplication,
  deleteApplication,
  type ApplicationStatus
} from "../api";

export function useApplications(accessToken: string | null, limit = 20) {
  return useQuery({
    queryKey: ["applications", limit],
    queryFn: () =>
      accessToken ? getApplications(accessToken, limit) : null,
    enabled: !!accessToken,
    staleTime: 5 * 60 * 1000
  });
}

export function useCreateApplication(accessToken: string | null) {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: (data: { jobId: string; status?: ApplicationStatus }) =>
      accessToken
        ? createApplication(
          accessToken,
          data.jobId,
          data.status
        )
        : Promise.reject("No token"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      message.success("Application recorded");
    },
    onError: (error: any) => {
      message.error(error?.message || "Failed to create application");
    }
  });
}

export function useUpdateApplication(accessToken: string | null) {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: (data: {
      id: string;
      status?: ApplicationStatus;
      notes?: string;
    }) => {
      if (!accessToken) {
        return Promise.reject("No token");
      }

      const update: { status?: ApplicationStatus; notes?: string } = {};
      if (data.status !== undefined) {
        update.status = data.status;
      }
      if (data.notes !== undefined) {
        update.notes = data.notes;
      }

      return updateApplication(accessToken, data.id, update);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      message.success("Application updated");
    },
    onError: (error: any) => {
      message.error(error?.message || "Failed to update application");
    }
  });
}

export function useDeleteApplication(accessToken: string | null) {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: (id: string) =>
      accessToken
        ? deleteApplication(accessToken, id)
        : Promise.reject("No token"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      message.success("Application deleted");
    },
    onError: (error: any) => {
      message.error(error?.message || "Failed to delete application");
    }
  });
}
