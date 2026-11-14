import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api.js";

export const useTaskReviews = (workspaceId, projectId, taskId, enabled = true) => {
  return useQuery({
    queryKey: ["workspaces", workspaceId, "projects", projectId, "task-reviews", taskId],
    queryFn: () => {
      return api.get(`/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/reviews`);
    },
    enabled: Boolean(workspaceId) && enabled,
    select: (data) => {
      return data.reviews;
    },
  });
};
