import { useQuery } from "@tanstack/react-query";
import { templatesApi } from "./templatesApi.js";

export const templatesKey = (workspaceId) => {
  return ["workspaces", workspaceId, "templates"];
};

export const useTemplates = (workspaceId, enabled = true) => {
  return useQuery({
    queryKey: [...templatesKey(workspaceId), "list"],
    queryFn: () => {
      return templatesApi.list(workspaceId);
    },
    enabled: Boolean(workspaceId) && enabled,
    select: (data) => {
      return data.templates;
    },
  });
};

export const useTemplate = (workspaceId, templateId, enabled = true) => {
  return useQuery({
    queryKey: [...templatesKey(workspaceId), "detail", templateId],
    queryFn: () => {
      return templatesApi.get(workspaceId, templateId);
    },
    enabled: Boolean(workspaceId) && enabled,
    select: (data) => {
      return data.template;
    },
  });
};
